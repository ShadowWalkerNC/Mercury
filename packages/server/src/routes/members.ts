import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import type { Member } from '@mercury/shared';

export const membersRouter = Router({ mergeParams: true });
membersRouter.use(requireAuth);

// ─── GET /api/v1/spaces/:spaceId/members ───────────────────────────────────────
// Returns members with joined user info. Only visible to members.

membersRouter.get('/', (req: AuthRequest, res) => {
  const { spaceId } = req.params as { spaceId: string };

  const isMember = db.prepare(
    'SELECT 1 FROM members WHERE space_id = ? AND user_id = ?'
  ).get(spaceId, req.userId);

  if (!isMember) {
    res.status(403).json({ error: 'Not a member of this space' });
    return;
  }

  const members = db.prepare(`
    SELECT
      m.id, m.space_id, m.user_id, m.role, m.joined_at,
      u.username, u.avatar, u.status
    FROM members m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.space_id = ?
    ORDER BY m.joined_at ASC
  `).all(spaceId) as Member[];

  res.json(members);
});

// ─── DELETE /api/v1/spaces/:spaceId/members/:userId ──────────────────────────
// Leave a space (self only) or kick (owner/admin only).

membersRouter.delete('/:userId', (req: AuthRequest, res) => {
  const { spaceId, userId: targetId } = req.params as { spaceId: string; userId: string };
  const requesterId = req.userId!;

  const requester = db.prepare(
    'SELECT role FROM members WHERE space_id = ? AND user_id = ?'
  ).get(spaceId, requesterId) as { role: string } | undefined;

  if (!requester) {
    res.status(403).json({ error: 'Not a member of this space' });
    return;
  }

  const target = db.prepare(
    'SELECT role FROM members WHERE space_id = ? AND user_id = ?'
  ).get(spaceId, targetId) as { role: string } | undefined;

  if (!target) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  // Self-leave is always permitted (except owner must transfer first)
  if (targetId === requesterId) {
    if (requester.role === 'owner') {
      res.status(400).json({ error: 'Owner cannot leave — transfer ownership first' });
      return;
    }
    db.prepare('DELETE FROM members WHERE space_id = ? AND user_id = ?').run(spaceId, targetId);
    res.status(204).send();
    return;
  }

  // Kicking requires owner or admin; cannot kick owner
  if (!['owner', 'admin'].includes(requester.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }
  if (target.role === 'owner') {
    res.status(403).json({ error: 'Cannot kick the owner' });
    return;
  }

  db.prepare('DELETE FROM members WHERE space_id = ? AND user_id = ?').run(spaceId, targetId);
  res.status(204).send();
});
