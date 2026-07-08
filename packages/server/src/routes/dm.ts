import { Router } from 'express';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { broadcast, userSockets, subscribeToChannels } from '../gateway/events.js';
import { WSOp } from '@mercury/shared';
import { MESSAGES_PAGE_SIZE } from '@mercury/shared';
import type { Channel, Message } from '@mercury/shared';

export const dmRouter = Router();
dmRouter.use(requireAuth);

// ─── Shared SELECT for a full message row ───────────────────────────────────────
const DM_MESSAGE_SELECT = `
  SELECT m.id, m.channel_id, m.author_id, m.content, m.edited_at, m.created_at,
         u.username AS author_username, u.avatar AS author_avatar
  FROM messages m
  INNER JOIN users u ON u.id = m.author_id
  WHERE m.id = ?
`;

// ─── POST /api/v1/dm ────────────────────────────────────────────────────────────
//
// Creates a new DM channel between the caller and target user, or returns
// the existing one if it already exists. Idempotent — safe to call on every
// click of a user’s avatar.
//
// Implementation note:
//   We find an existing DM by looking for a channel of type='dm' where
//   BOTH the caller and the target are in dm_members, and the channel has
//   exactly 2 members. This prevents a 3-person DM from matching a 2-person
//   lookup.

dmRouter.post(
  '/',
  validateBody({ user_id: { type: 'string', min: 1, max: 26 } }),
  (req: AuthRequest, res) => {
    const { user_id: targetId } = req.body as { user_id: string };
    const callerId = req.userId!;

    if (targetId === callerId) {
      res.status(400).json({ error: 'Cannot DM yourself' });
      return;
    }

    // Verify target user exists
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check for existing 1:1 DM channel between these two users
    const existing = db.prepare(`
      SELECT c.id, c.name, c.type, c.space_id, c.position, c.created_at
      FROM channels c
      WHERE c.type = 'dm'
        AND (
          SELECT COUNT(*) FROM dm_members WHERE channel_id = c.id
        ) = 2
        AND EXISTS (
          SELECT 1 FROM dm_members WHERE channel_id = c.id AND user_id = ?
        )
        AND EXISTS (
          SELECT 1 FROM dm_members WHERE channel_id = c.id AND user_id = ?
        )
      LIMIT 1
    `).get(callerId, targetId) as Channel | undefined;

    if (existing) {
      res.json(existing);
      return;
    }

    // Create new DM channel
    const channelId = ulid();

    const createDm = db.transaction(() => {
      db.prepare(
        `INSERT INTO channels (id, space_id, name, type, position) VALUES (?, NULL, ?, 'dm', 0)`
      ).run(channelId, channelId); // name = channelId (client resolves display name from participants)

      db.prepare(
        'INSERT INTO dm_members (channel_id, user_id) VALUES (?, ?)'
      ).run(channelId, callerId);

      db.prepare(
        'INSERT INTO dm_members (channel_id, user_id) VALUES (?, ?)'
      ).run(channelId, targetId);
    });

    createDm();

    // Subscribe both participants to the new DM channel in the WS gateway
    // so they receive DM_MESSAGE_CREATE events immediately, even before
    // the target user’s client re-fetches their DM list.
    subscribeToChannels(callerId, [channelId]);
    subscribeToChannels(targetId, [channelId]);

    const channel = db.prepare(
      'SELECT id, name, type, space_id, position, created_at FROM channels WHERE id = ?'
    ).get(channelId) as Channel;

    res.status(201).json(channel);
  }
);

// ─── GET /api/v1/dm ─────────────────────────────────────────────────────────────
// Returns all DM channels the caller is a participant in, ordered by
// most recently created.

dmRouter.get('/', (req: AuthRequest, res) => {
  const channels = db.prepare(`
    SELECT c.id, c.name, c.type, c.space_id, c.position, c.created_at
    FROM channels c
    INNER JOIN dm_members dm ON dm.channel_id = c.id
    WHERE dm.user_id = ? AND c.type = 'dm'
    ORDER BY c.created_at DESC
  `).all(req.userId) as Channel[];

  res.json(channels);
});

// ─── GET /api/v1/dm/:channelId/messages ────────────────────────────────────────
// Cursor-paginated message history for a DM channel.
// Guards that the requester is actually a participant.

dmRouter.get('/:channelId/messages', (req: AuthRequest, res) => {
  const { channelId } = req.params as { channelId: string };

  // Verify membership
  const isMember = db.prepare(
    'SELECT 1 FROM dm_members WHERE channel_id = ? AND user_id = ?'
  ).get(channelId, req.userId);

  if (!isMember) {
    res.status(403).json({ error: 'Not a participant of this DM' });
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

// ─── POST /api/v1/dm/:channelId/messages ───────────────────────────────────────
// Send a message in a DM channel.
// Broadcasts DM_MESSAGE_CREATE — a separate WS event from MESSAGE_CREATE
// so clients can route it to the DM pane, not the channel pane.

dmRouter.post(
  '/:channelId/messages',
  validateBody({ content: { type: 'string', min: 1, max: 4000 } }),
  (req: AuthRequest, res) => {
    const { channelId } = req.params as { channelId: string };
    const { content } = req.body as { content: string };

    const isMember = db.prepare(
      'SELECT 1 FROM dm_members WHERE channel_id = ? AND user_id = ?'
    ).get(channelId, req.userId);

    if (!isMember) {
      res.status(403).json({ error: 'Not a participant of this DM' });
      return;
    }

    const id = ulid();
    db.prepare(
      'INSERT INTO messages (id, channel_id, author_id, content) VALUES (?, ?, ?, ?)'
    ).run(id, channelId, req.userId, content.trim());

    const message = db.prepare(DM_MESSAGE_SELECT).get(id) as Message;

    // DM_MESSAGE_CREATE is a distinct opcode from MESSAGE_CREATE.
    // The web client listens for both but routes them to different UI panels.
    broadcast(channelId, { op: WSOp.DM_MESSAGE_CREATE, d: { message } });

    res.status(201).json(message);
  }
);
