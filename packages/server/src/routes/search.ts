import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import type { Message } from '@mercury/shared';

export const searchRouter = Router();
searchRouter.use(requireAuth);

// ─── GET /api/v1/search ───────────────────────────────────────────────────────────
//
// Query params:
//   q          (required) — the search term, 2–64 chars
//   space_id   (optional) — narrow results to a single space
//
// Results:
//   Up to 50 matching messages, most-relevant first (FTS5 BM25 ranking).
//   Only returns messages in spaces the requesting user is a member of.
//   Each result includes a snippet (up to 64 tokens) for the client to
//   highlight the match without having to re-parse the full content.
//
// Security:
//   The space membership join means a user can never receive messages
//   from spaces they are not in, even if they craft a raw HTTP request.

const SEARCH_MAX_RESULTS = 50;
const QUERY_MIN_LENGTH   = 2;
const QUERY_MAX_LENGTH   = 64;

searchRouter.get('/', (req: AuthRequest, res) => {
  const q        = (req.query['q'] as string | undefined)?.trim() ?? '';
  const spaceId  = req.query['space_id'] as string | undefined;

  if (q.length < QUERY_MIN_LENGTH) {
    res.status(400).json({ error: `Query must be at least ${QUERY_MIN_LENGTH} characters` });
    return;
  }

  if (q.length > QUERY_MAX_LENGTH) {
    res.status(400).json({ error: `Query must be at most ${QUERY_MAX_LENGTH} characters` });
    return;
  }

  // Escape FTS5 special characters to prevent query injection.
  // FTS5 treats ", *, (, ), NOT, AND, OR as operators.
  // Wrapping the entire term in double-quotes makes it a phrase query,
  // which is the safest and most intuitive behaviour for a chat search box.
  const safeTerm = `"${q.replace(/"/g, '""')}"`;

  // Two query variants: with and without space_id filter.
  // Both variants enforce membership via the members JOIN so a user
  // can never see results outside their own spaces.

  type Row = Message & { snippet: string };

  let rows: Row[];

  if (spaceId) {
    rows = db.prepare(`
      SELECT
        m.id, m.channel_id, m.author_id, m.content,
        m.edited_at, m.created_at,
        u.username  AS author_username,
        u.avatar    AS author_avatar,
        snippet(messages_fts, 0, '<mark>', '</mark>', '...', 64) AS snippet
      FROM messages_fts
      JOIN messages m   ON m.rowid    = messages_fts.rowid
      JOIN channels c   ON c.id       = m.channel_id
      JOIN members  mb  ON mb.space_id = c.space_id AND mb.user_id = ?
      JOIN users    u   ON u.id        = m.author_id
      WHERE c.space_id  = ?
        AND messages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(req.userId, spaceId, safeTerm, SEARCH_MAX_RESULTS) as Row[];
  } else {
    rows = db.prepare(`
      SELECT
        m.id, m.channel_id, m.author_id, m.content,
        m.edited_at, m.created_at,
        u.username  AS author_username,
        u.avatar    AS author_avatar,
        snippet(messages_fts, 0, '<mark>', '</mark>', '...', 64) AS snippet
      FROM messages_fts
      JOIN messages m   ON m.rowid    = messages_fts.rowid
      JOIN channels c   ON c.id       = m.channel_id
      JOIN members  mb  ON mb.space_id = c.space_id AND mb.user_id = ?
      JOIN users    u   ON u.id        = m.author_id
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(req.userId, safeTerm, SEARCH_MAX_RESULTS) as Row[];
  }

  res.json(rows);
});
