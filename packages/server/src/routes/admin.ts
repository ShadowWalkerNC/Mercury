import { Router } from 'express';
import { exec } from 'node:child_process';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import type { AuthRequest } from '../middleware/auth.js';
import { userSockets, unsubscribeAll, unregisterSocket } from '../gateway/events.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ─── GET /api/v1/admin/users ───────────────────────────────────────────────────────
// List all users. Excludes password hash. Ordered by created_at.

adminRouter.get('/users', (_req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, avatar, status, is_admin, is_banned, created_at
    FROM users
    ORDER BY created_at ASC
  `).all();
  res.json(users);
});

// ─── PATCH /api/v1/admin/users/:id ──────────────────────────────────────────────────
// Supported actions via body { action: string }:
//   'ban'        — set is_banned = 1, force-disconnect all WS sessions
//   'unban'      — set is_banned = 0
//   'force_logout' — delete all sessions + disconnect all WS sockets
//   'revoke_2fa' — clear TOTP secret + disable 2FA (no code required)
//   'make_admin' — grant admin flag
//   'remove_admin' — revoke admin flag (cannot remove own admin)

adminRouter.patch('/users/:id', (req: AuthRequest, res) => {
  const { id } = req.params as { id: string };
  const { action } = req.body as { action: string };

  const target = db.prepare(
    'SELECT id, is_admin FROM users WHERE id = ?'
  ).get(id) as { id: string; is_admin: number } | undefined;

  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Helper: force-disconnect all live WS sockets for a user
  function forceDisconnect(userId: string): void {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    for (const ws of sockets) {
      try { ws.close(4003, 'Disconnected by admin'); } catch { /* ignore */ }
    }
    unsubscribeAll(userId);
    userSockets.delete(userId);
    db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(userId);
  }

  switch (action) {
    case 'ban':
      db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      forceDisconnect(id);
      break;

    case 'unban':
      db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(id);
      break;

    case 'force_logout':
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      forceDisconnect(id);
      break;

    case 'revoke_2fa':
      db.prepare(
        'UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?'
      ).run(id);
      db.prepare('DELETE FROM totp_backup_codes WHERE user_id = ?').run(id);
      break;

    case 'make_admin':
      db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(id);
      break;

    case 'remove_admin':
      if (id === req.userId) {
        res.status(400).json({ error: 'Cannot remove your own admin privileges' });
        return;
      }
      db.prepare('UPDATE users SET is_admin = 0 WHERE id = ?').run(id);
      break;

    default:
      res.status(400).json({ error: `Unknown action: ${action}` });
      return;
  }

  res.status(204).send();
});

// ─── GET /api/v1/admin/spaces ───────────────────────────────────────────────────────
// List all spaces with member count.

adminRouter.get('/spaces', (_req, res) => {
  const spaces = db.prepare(`
    SELECT s.id, s.name, s.icon, s.owner_id, s.created_at,
           COUNT(m.id) AS member_count
    FROM spaces s
    LEFT JOIN members m ON m.space_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at ASC
  `).all();
  res.json(spaces);
});

// ─── DELETE /api/v1/admin/spaces/:id ────────────────────────────────────────────────
// Hard-delete a space and all its channels/messages (CASCADE).

adminRouter.delete('/spaces/:id', (_req, res) => {
  const { id } = _req.params as { id: string };
  const result = db.prepare('DELETE FROM spaces WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Space not found' });
    return;
  }
  res.status(204).send();
});

// ─── GET /api/v1/admin/invites ───────────────────────────────────────────────────────
// List all active (non-expired, non-maxed) invites.

adminRouter.get('/invites', (_req, res) => {
  const invites = db.prepare(`
    SELECT i.code, i.space_id, i.creator_id, i.uses, i.max_uses,
           i.expires_at, i.created_at,
           s.name AS space_name,
           u.username AS creator_username
    FROM invites i
    INNER JOIN spaces s ON s.id = i.space_id
    INNER JOIN users  u ON u.id = i.creator_id
    WHERE (i.expires_at IS NULL OR i.expires_at > datetime('now'))
      AND (i.max_uses IS NULL OR i.uses < i.max_uses)
    ORDER BY i.created_at DESC
  `).all();
  res.json(invites);
});

// ─── DELETE /api/v1/admin/invites/:code ──────────────────────────────────────────────
// Revoke an invite by code.

adminRouter.delete('/invites/:code', (_req, res) => {
  const { code } = _req.params as { code: string };
  const result = db.prepare('DELETE FROM invites WHERE code = ?').run(code);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }
  res.status(204).send();
});

// ─── GET /api/v1/admin/stats ───────────────────────────────────────────────────────
// Server-wide statistics for the admin dashboard.

adminRouter.get('/stats', (_req, res) => {
  const userCount    = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  const messageCount = (db.prepare('SELECT COUNT(*) AS n FROM messages').get() as { n: number }).n;
  const spaceCount   = (db.prepare('SELECT COUNT(*) AS n FROM spaces').get() as { n: number }).n;
  const channelCount = (db.prepare('SELECT COUNT(*) AS n FROM channels').get() as { n: number }).n;

  // Count live WebSocket connections across all users
  let wsConnections = 0;
  for (const sockets of userSockets.values()) wsConnections += sockets.size;

  // SQLite page_count * page_size gives total DB file size in bytes
  const dbPages    = (db.pragma('page_count') as { page_count: number }[])[0]!.page_count;
  const dbPageSize = (db.pragma('page_size')  as { page_size:  number }[])[0]!.page_size;
  const dbSizeBytes = dbPages * dbPageSize;

  res.json({
    users:          userCount,
    messages:       messageCount,
    spaces:         spaceCount,
    channels:       channelCount,
    ws_connections: wsConnections,
    db_size_bytes:  dbSizeBytes,
    uptime_seconds: Math.floor(process.uptime()),
    node_version:   process.version,
  });
});

// ─── POST /api/v1/admin/shell/exec ───────────────────────────────────────────────
// Remote Terminal execution — restricted to operators with is_admin = 1
adminRouter.post('/shell/exec', (req: AuthRequest, res) => {
  const { command } = req.body as { command: string };
  if (!command || typeof command !== 'string' || !command.trim()) {
    res.status(400).json({ error: 'Command string is required' });
    return;
  }

  const trimmed = command.trim();

  exec(trimmed, { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    let output = stdout || '';
    if (stderr) output += (output ? '\n' : '') + stderr;
    if (err && !output) output = err.message;
    res.json({
      command: trimmed,
      output: output || '(No output returned)',
      exit_code: err ? (err.code || 1) : 0,
    });
  });
});
