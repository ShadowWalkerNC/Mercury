/**
 * Single database connection for the Mercury server.
 * WAL mode + foreign keys enabled at connection time.
 * All schema migrations run here via migrate().
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DB_PATH } from './config.js';

// Auto-create the data directory if it doesn't exist
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

// Required pragmas — must run before any queries
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// ─── Migration helper ─────────────────────────────────────────────────────────
// Additive only. Swallows duplicate-column and already-exists errors,
// throws on everything else.
function migrate(sql: string): void {
  try {
    db.exec(sql);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate column')) return;
    if (msg.includes('already exists')) return;
    throw err;
  }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

migrate(`
  CREATE TABLE IF NOT EXISTS schema_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    avatar     TEXT,
    status     TEXT NOT NULL DEFAULT 'offline',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at    TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS spaces (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    icon       TEXT,
    owner_id   TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS channels (
    id         TEXT PRIMARY KEY,
    space_id   TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'text',
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS members (
    id         TEXT PRIMARY KEY,
    space_id   TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id),
    role       TEXT NOT NULL DEFAULT 'member',
    joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (space_id, user_id)
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id  TEXT NOT NULL REFERENCES users(id),
    content    TEXT NOT NULL,
    edited_at  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS reactions (
    id         TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id),
    emoji      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (message_id, user_id, emoji)
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS attachments (
    id         TEXT PRIMARY KEY,
    message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    filename   TEXT NOT NULL,
    size       INTEGER NOT NULL,
    mime_type  TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

migrate(`
  CREATE TABLE IF NOT EXISTS invites (
    code       TEXT PRIMARY KEY,
    space_id   TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES users(id),
    uses       INTEGER NOT NULL DEFAULT 0,
    max_uses   INTEGER,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Full-text search (FTS5) ─────────────────────────────────────────────────────
//
// messages_fts shadows the messages table for tokenised search.
// content= keeps the FTS index lean — only the message_id is stored
// in the FTS table itself; the full content is retrieved from messages.
// content_rowid= maps FTS rowids to messages.rowid for the join.
//
// Three triggers keep the FTS index in sync automatically:
//   messages_ai  — after INSERT  → add to FTS
//   messages_ad  — after DELETE  → remove from FTS
//   messages_au  — after UPDATE  → remove old, add new

migrate(`
  CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts
  USING fts5(
    content,
    content=messages,
    content_rowid=rowid,
    tokenize='unicode61 remove_diacritics 2'
  );
`);

migrate(`
  CREATE TRIGGER IF NOT EXISTS messages_ai
  AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
  END;
`);

migrate(`
  CREATE TRIGGER IF NOT EXISTS messages_ad
  AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
  END;
`);

migrate(`
  CREATE TRIGGER IF NOT EXISTS messages_au
  AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
  END;
`);

// ─── Performance indexes ──────────────────────────────────────────────────────
migrate(`CREATE INDEX IF NOT EXISTS idx_messages_channel  ON messages(channel_id, id DESC);`);
migrate(`CREATE INDEX IF NOT EXISTS idx_members_space      ON members(space_id);`);
migrate(`CREATE INDEX IF NOT EXISTS idx_members_user       ON members(user_id);`);
migrate(`CREATE INDEX IF NOT EXISTS idx_sessions_user      ON sessions(user_id);`);
migrate(`CREATE INDEX IF NOT EXISTS idx_reactions_message  ON reactions(message_id);`);

// ─── Schema version ───────────────────────────────────────────────────────────
db.prepare(`INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('version', '1')`).run();

console.log(`[db] Connected to ${DB_PATH} (WAL mode)`);
