import { Router } from 'express';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { MESSAGE_MAX_LENGTH, MESSAGES_PAGE_SIZE } from '@mercury/shared';
import type { Message } from '@mercury/shared';
import { broadcast } from '../gateway/events.js';
import { WSOp } from '@mercury/shared';

export const messagesRouter = Router({ mergeParams: true });
messagesRouter.use(requireAuth);

function assertChannelMember(channelId: string, userId: string): boolean {
  return !!db.prepare(`
    SELECT 1 FROM members m
    INNER JOIN channels c ON c.space_id = m.space_id
    WHERE c.id = ? AND m.user_id = ?
  `).get(channelId, userId);
}

// ─── GET /api/v1/channels/:channelId/messages ──────────────────────────────────
// Returns last 50 messages (cursor-paginated via ?before=<ulid>).

messagesRouter.get('/', (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };

  if (!assertChannelMember(channelId, req.userId!)) {
    res.status(403).json({ error: 'Not a member of this channel\'s space' });
    return;
  }

  const before = req.query['before'] as string | undefined;

  const rows = before
    ? db.prepare(`
        SELECT m.id, m.channel_id, m.author_id, m.content, m.edited_at, m.created_at,
               u.username AS author_username, u.avatar AS author_avatar
        FROM messages m
        INNER JOIN users u ON u.id = m.author_id
        WHERE m.channel_id = ? AND m.id < ?
        ORDER BY m.id DESC
        LIMIT ?
      `).all(channelId, before, MESSAGES_PAGE_SIZE)
    : db.prepare(`
        SELECT m.id, m.channel_id, m.author_id, m.content, m.edited_at, m.created_at,
               u.username AS author_username, u.avatar AS author_avatar
        FROM messages m
        INNER JOIN users u ON u.id = m.author_id
        WHERE m.channel_id = ?
        ORDER BY m.id DESC
        LIMIT ?
      `).all(channelId, MESSAGES_PAGE_SIZE);

  // Return in ascending order for the client
  res.json((rows as Message[]).reverse());
});

// ─── POST /api/v1/channels/:channelId/messages ─────────────────────────────────

messagesRouter.post(
  '/',
  validateBody({ content: { type: 'string', min: 1, max: MESSAGE_MAX_LENGTH } }),
  (req: AuthRequest, res) => {
    const { channelId } = req.params as { channelId: string };
    const { content } = req.body as { content: string };

    if (!assertChannelMember(channelId, req.userId!)) {
      res.status(403).json({ error: 'Not a member of this channel\'s space' });
      return;
    }

    const id = ulid();
    db.prepare(`
      INSERT INTO messages (id, channel_id, author_id, content) VALUES (?, ?, ?, ?)
    `).run(id, channelId, req.userId, content.trim());

    const message = db.prepare(`
      SELECT m.id, m.channel_id, m.author_id, m.content, m.edited_at, m.created_at,
             u.username AS author_username, u.avatar AS author_avatar
      FROM messages m
      INNER JOIN users u ON u.id = m.author_id
      WHERE m.id = ?
    `).get(id) as Message;

    // Fan-out via WebSocket
    broadcast(channelId, { op: WSOp.MESSAGE_CREATE, d: { message } });

    res.status(201).json(message);
  }
);
