import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import type { Invite } from '@mercury/shared';

export const invitesRouter = Router();
invitesRouter.use(requireAuth);

function generateCode(): string {
  return randomBytes(6).toString('base64url');
}

// ─── POST /api/v1/spaces/:spaceId/invites ──────────────────────────────────────
// Any member can create an invite. Optional max_uses and expires_in_hours.

const inviteSpaceRouter = Router({ mergeParams: true });
inviteSpaceRouter.use(requireAuth);

inviteSpaceRouter.post(
  '/',
  validateBody({
    max_uses:        { type: 'number', optional: true },
    expires_in_hours: { type: 'number', optional: true },
  }),
  (req: AuthRequest, res) => {
    const { spaceId } = req.params as { spaceId: string };
    const { max_uses, expires_in_hours } = req.body as {
      max_uses?: number;
      expires_in_hours?: number;
    };

    const isMember = db.prepare(
      'SELECT 1 FROM members WHERE space_id = ? AND user_id = ?'
    ).get(spaceId, req.userId);

    if (!isMember) {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    const code = generateCode();
    const expiresAt = expires_in_hours
      ? new Date(Date.now() + expires_in_hours * 3600_000).toISOString()
      : null;

    db.prepare(`
      INSERT INTO invites (code, space_id, creator_id, max_uses, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(code, spaceId, req.userId, max_uses ?? null, expiresAt);

    const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(code) as Invite;
    res.status(201).json(invite);
  }
);

export { inviteSpaceRouter };

// ─── POST /api/v1/invites/:code/redeem ─────────────────────────────────────────
// Redeems an invite code — joins the user to the space.

invitesRouter.post('/:code/redeem', (req: AuthRequest, res) => {
  const { code } = req.params as { code: string };

  const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(code) as Invite | undefined;

  if (!invite) {
    res.status(404).json({ error: 'Invalid invite code' });
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ error: 'Invite has expired' });
    return;
  }

  if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
    res.status(410).json({ error: 'Invite has reached its use limit' });
    return;
  }

  // Already a member?
  const already = db.prepare(
    'SELECT 1 FROM members WHERE space_id = ? AND user_id = ?'
  ).get(invite.space_id, req.userId);

  if (already) {
    res.status(409).json({ error: 'Already a member of this space' });
    return;
  }

  const redeem = db.transaction(() => {
    db.prepare(`
      INSERT INTO members (id, space_id, user_id, role) VALUES (?, ?, ?, 'member')
    `).run(ulid(), invite.space_id, req.userId);

    db.prepare('UPDATE invites SET uses = uses + 1 WHERE code = ?').run(code);
  });

  redeem();

  const space = db.prepare(
    'SELECT id, name, icon, owner_id, created_at FROM spaces WHERE id = ?'
  ).get(invite.space_id);

  res.status(201).json({ space });
});
