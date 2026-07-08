import { Router } from 'express';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { broadcast } from '../gateway/events.js';
import { WSOp } from '@mercury/shared';
import type { Reaction } from '@mercury/shared';

export const reactionsRouter = Router({ mergeParams: true });
reactionsRouter.use(requireAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolves the channel_id for a message and confirms the user is a member.
// Returns channel_id string on success, null if message not found or not a member.
function resolveChannelMember(
  msgId: string,
  userId: string,
): string | null {
  const row = db.prepare(`
    SELECT m.channel_id
    FROM messages m
    INNER JOIN channels c ON c.id = m.channel_id
    INNER JOIN members mb ON mb.space_id = c.space_id AND mb.user_id = ?
    WHERE m.id = ?
  `).get(userId, msgId) as { channel_id: string } | undefined;
  return row ? row.channel_id : null;
}

// Maximum emoji length guard — prevents oversized custom emoji strings.
const EMOJI_MAX_LENGTH = 64;

// ─── POST /api/v1/channels/:channelId/messages/:msgId/reactions ───────────────
// Add a reaction. One emoji per user per message (UNIQUE constraint in DB).

reactionsRouter.post(
  '/',
  validateBody({ emoji: { type: 'string', min: 1, max: EMOJI_MAX_LENGTH } }),
  (req: AuthRequest, res) => {
    const { msgId } = req.params as { msgId: string };
    const { emoji } = req.body as { emoji: string };

    const channelId = resolveChannelMember(msgId, req.userId!);
    if (!channelId) {
      res.status(404).json({ error: 'Message not found or not a member' });
      return;
    }

    // UNIQUE (message_id, user_id, emoji) — return 409 on duplicate
    const existing = db.prepare(
      'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
    ).get(msgId, req.userId, emoji);

    if (existing) {
      res.status(409).json({ error: 'Reaction already added' });
      return;
    }

    const id = ulid();
    db.prepare(
      'INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)'
    ).run(id, msgId, req.userId, emoji);

    const reaction = db.prepare(`
      SELECT r.id, r.message_id, r.user_id, r.emoji, r.created_at,
             u.username
      FROM reactions r
      INNER JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `).get(id) as Reaction;

    broadcast(channelId, {
      op: WSOp.REACTION_ADD,
      d: { reaction, channel_id: channelId },
    });

    res.status(201).json(reaction);
  }
);

// ─── DELETE /api/v1/channels/:channelId/messages/:msgId/reactions/:emoji ──────
// Remove a reaction. Users may only remove their own reactions.

reactionsRouter.delete(
  '/:emoji',
  (req: AuthRequest, res) => {
    const { msgId, emoji } = req.params as { msgId: string; emoji: string };

    const channelId = resolveChannelMember(msgId, req.userId!);
    if (!channelId) {
      res.status(404).json({ error: 'Message not found or not a member' });
      return;
    }

    const existing = db.prepare(
      'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
    ).get(msgId, req.userId, emoji);

    if (!existing) {
      res.status(404).json({ error: 'Reaction not found' });
      return;
    }

    db.prepare(
      'DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
    ).run(msgId, req.userId, emoji);

    broadcast(channelId, {
      op: WSOp.REACTION_REMOVE,
      d: {
        message_id: msgId,
        user_id: req.userId,
        emoji,
        channel_id: channelId,
      },
    });

    res.status(204).send();
  }
);
