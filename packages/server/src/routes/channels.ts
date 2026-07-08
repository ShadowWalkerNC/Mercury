import { Router } from 'express';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { CHANNEL_NAME_MAX_LENGTH } from '@mercury/shared';
import type { Channel } from '@mercury/shared';

export const channelsRouter = Router({ mergeParams: true });
channelsRouter.use(requireAuth);

// Guard: user must be a member of the space
function assertMember(spaceId: string, userId: string): boolean {
  return !!db.prepare(
    'SELECT 1 FROM members WHERE space_id = ? AND user_id = ?'
  ).get(spaceId, userId);
}

// ─── GET /api/v1/spaces/:spaceId/channels ──────────────────────────────────────

channelsRouter.get('/', (req: AuthRequest, res) => {
  const { spaceId } = req.params as { spaceId: string };

  if (!assertMember(spaceId, req.userId!)) {
    res.status(403).json({ error: 'Not a member of this space' });
    return;
  }

  const channels = db.prepare(`
    SELECT id, space_id, name, type, position, created_at
    FROM channels
    WHERE space_id = ?
    ORDER BY position ASC, created_at ASC
  `).all(spaceId) as Channel[];

  res.json(channels);
});

// ─── POST /api/v1/spaces/:spaceId/channels ────────────────────────────────────
// Only owner or admin can create channels.

channelsRouter.post(
  '/',
  validateBody({
    name: { type: 'string', min: 1, max: CHANNEL_NAME_MAX_LENGTH },
    type: { type: 'string', optional: true },
  }),
  (req: AuthRequest, res) => {
    const { spaceId } = req.params as { spaceId: string };
    const { name, type = 'text' } = req.body as { name: string; type?: string };

    const validTypes = ['text', 'announcement', 'voice'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const member = db.prepare(
      'SELECT role FROM members WHERE space_id = ? AND user_id = ?'
    ).get(spaceId, req.userId) as { role: string } | undefined;

    if (!member) {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    if (!['owner', 'admin'].includes(member.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Position = max existing + 1
    const maxPos = (db.prepare(
      'SELECT COALESCE(MAX(position), -1) as p FROM channels WHERE space_id = ?'
    ).get(spaceId) as { p: number }).p;

    const id = ulid();
    db.prepare(`
      INSERT INTO channels (id, space_id, name, type, position) VALUES (?, ?, ?, ?, ?)
    `).run(id, spaceId, name.trim(), type, maxPos + 1);

    const channel = db.prepare(
      'SELECT id, space_id, name, type, position, created_at FROM channels WHERE id = ?'
    ).get(id) as Channel;

    res.status(201).json(channel);
  }
);
