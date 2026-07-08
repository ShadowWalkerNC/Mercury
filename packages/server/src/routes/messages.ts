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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns true if the user is a member of the space that owns this channel.
// Used to guard all read operations. Write operations use assertAuthor instead.
function assertChannelMember(channelId: string, userId: string): boolean {
  return !!db.prepare(`
    SELECT 1 FROM members m
    INNER JOIN channels c ON c.space_id = m.space_id
    WHERE c.id = ? AND m.user_id = ?
  `).get(channelId, userId);
}

// Fetches a full message row joined with author info.
const MESSAGE_SELECT = `
  SELECT m.id, m.channel_id, m.author_id, m.content, m.edited_at, m.created_at,
         u.username AS author_username, u.avatar AS author_avatar
  FROM messages m
  INNER JOIN users u ON u.id = m.author_id
  WHERE m.id = ?
`;

// ─── GET /api/v1/channels/:channelId/messages ─────────────────────────────────
// Returns last 50 messages, ascending. Cursor-paginated via ?before=<ulid>.

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

    const message = db.prepare(MESSAGE_SELECT).get(id) as Message;

    broadcast(channelId, { op: WSOp.MESSAGE_CREATE, d: { message } });

    res.status(201).json(message);
  }
);

// ─── PATCH /api/v1/channels/:channelId/messages/:msgId ────────────────────────
// Only the message author may edit. Sets edited_at to now.

messagesRouter.patch(
  '/:msgId',
  validateBody({ content: { type: 'string', min: 1, max: MESSAGE_MAX_LENGTH } }),
  (req: AuthRequest, res) => {
    const { channelId, msgId } = req.params as { channelId: string; msgId: string };
    const { content } = req.body as { content: string };

    const existing = db.prepare(
      'SELECT id, author_id, channel_id FROM messages WHERE id = ? AND channel_id = ?'
    ).get(msgId, channelId) as { id: string; author_id: string; channel_id: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only the author can edit their own message
    if (existing.author_id !== req.userId) {
      res.status(403).json({ error: 'Cannot edit another user\'s message' });
      return;
    }

    db.prepare(`
      UPDATE messages SET content = ?, edited_at = datetime('now') WHERE id = ?
    `).run(content.trim(), msgId);

    const message = db.prepare(MESSAGE_SELECT).get(msgId) as Message;

    broadcast(channelId, { op: WSOp.MESSAGE_UPDATE, d: { message } });

    res.json(message);
  }
);

// ─── DELETE /api/v1/channels/:channelId/messages/:msgId ───────────────────────
// Author may delete their own message. Space owner/admin may delete any message.

messagesRouter.delete(
  '/:msgId',
  (req: AuthRequest, res) => {
    const { channelId, msgId } = req.params as { channelId: string; msgId: string };

    const existing = db.prepare(
      'SELECT id, author_id, channel_id FROM messages WHERE id = ? AND channel_id = ?'
    ).get(msgId, channelId) as { id: string; author_id: string; channel_id: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Allow: author, or space owner/admin
    const isAuthor = existing.author_id === req.userId;
    const isPrivileged = !!db.prepare(`
      SELECT 1 FROM members m
      INNER JOIN channels c ON c.space_id = m.space_id
      WHERE c.id = ? AND m.user_id = ? AND m.role IN ('owner', 'admin')
    `).get(channelId, req.userId);

    if (!isAuthor && !isPrivileged) {
      res.status(403).json({ error: 'Cannot delete another user\'s message' });
      return;
    }

    db.prepare('DELETE FROM messages WHERE id = ?').run(msgId);

    broadcast(channelId, {
      op: WSOp.MESSAGE_DELETE,
      d: { message_id: msgId, channel_id: channelId },
    });

    res.status(204).send();
  }
);
