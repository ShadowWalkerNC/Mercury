# Mercury

> **Self-hosted communication platform.** Spaces, channels, real-time messaging,
> voice and video — owned end to end.
>
> **Status:** Active development · Pre-alpha · Not ready for use
> **Version:** v0 · Build sequence: M-022 complete (22/57)

---

## Table of Contents

1. [What Mercury Is](#1-what-mercury-is)
2. [Monorepo Layout](#2-monorepo-layout)
3. [Technology Stack](#3-technology-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Model](#5-data-model)
6. [API Reference](#6-api-reference)
7. [WebSocket Protocol](#7-websocket-protocol)
8. [Authentication Flow](#8-authentication-flow)
9. [2FA (TOTP) Flow](#9-2fa-totp-flow)
10. [Request Lifecycle](#10-request-lifecycle)
11. [Middleware Stack](#11-middleware-stack)
12. [Real-Time Fan-Out](#12-real-time-fan-out)
13. [Web Client Architecture](#13-web-client-architecture)
14. [Infrastructure & Security](#14-infrastructure--security)
15. [Environment Variables](#15-environment-variables)
16. [Build Sequence](#16-build-sequence)
17. [Definition of Done](#17-definition-of-done)
18. [Quick Start](#18-quick-start)

---

## 1. What Mercury Is

Mercury is a private, self-hosted platform for:

- Real-time text messaging in organised **Spaces** (communities) and **Channels** (topic rooms)
- **Direct messages** — 1:1 and group DMs (up to 10 participants)
- **Voice and video calls** via LiveKit (self-hosted WebRTC SFU)
- **File and image uploads** served from the same server
- **Presence** — online / idle / offline per user, driven by WebSocket state
- **Roles and permissions** — owner / admin / moderator / member per space
- **Invite system** — code-based invites with optional max-uses and expiry
- **Full-text search** across message history (SQLite FTS5)
- **TOTP two-factor authentication** — optional per user, enforceable per space
- **Admin UI** — manage users, spaces, invites, view server stats
- **PWA** — installable on mobile and desktop from the browser
- **Electron desktop app** — wraps the web client, runs on macOS and Windows

Mercury is **not** a public SaaS product, an open-source release, or a
multi-tenant platform. It is a private, operator-owned tool. You run the
server. You own the data. No external platform dependency.

---

## 2. Monorepo Layout

```
mercury/                          ← npm workspaces root
├── package.json                  ← workspaces: ["packages/*"]
├── tsconfig.base.json            ← shared TS compiler base
├── .env.example                  ← all required env vars documented
├── .gitignore
├── docker-compose.yml            ← one-command local dev stack
├── Caddyfile.example             ← production TLS reverse proxy config
└── README.md                     ← this file

packages/
├── shared/                       ← types, WS protocol, constants
│   └── src/
│       ├── types.ts              ← User, Space, Channel, Message, Invite, Member
│       ├── events.ts             ← WSOp enum + all WSPayload interfaces
│       ├── constants.ts          ← TTLs, limits, rate limits, WS timing
│       └── index.ts              ← barrel export
├── server/                       ← Express + SQLite + WebSocket gateway
│   └── src/
│       ├── index.ts              ← process bootstrap, env guard, HTTP+WS start
│       ├── app.ts                ← Express app factory, route wiring
│       ├── db.ts                 ← SQLite connection, pragmas, full schema
│       ├── config.ts             ← typed env var accessors
│       ├── middleware/
│       │   ├── auth.ts           ← requireAuth — JWT Bearer verification
│       │   ├── rateLimit.ts      ← global 60 req/min per-IP limiter
│       │   ├── validate.ts       ← validateBody — schema-based body guard
│       │   ├── ssrf.ts           ← SSRF guard for outbound URL fetches
│       │   ├── hmac.ts           ← HMAC-SHA256 webhook signature verification
│       │   └── admin.ts          ← requireAdmin — is_admin guard [PENDING M-031]
│       ├── routes/
│       │   ├── auth.ts           ✅ register, login, refresh, me, logout
│       │   ├── spaces.ts         ✅ GET/POST /spaces, GET /spaces/:id
│       │   ├── channels.ts       ✅ GET/POST /spaces/:id/channels
│       │   ├── members.ts        ✅ GET /spaces/:id/members, DELETE member
│       │   ├── invites.ts        ✅ POST invite, POST redeem
│       │   ├── messages.ts       ✅ GET/POST /channels/:id/messages
│       │   ├── totp.ts           ⏳ 2FA setup/verify/disable [M-033]
│       │   ├── dm.ts             ⏳ POST/GET /dm [M-028]
│       │   ├── reactions.ts      ⏳ POST reactions [M-025]
│       │   ├── uploads.ts        ⏳ POST /upload [M-026]
│       │   ├── search.ts         ⏳ GET /search [M-027]
│       │   ├── admin.ts          ⏳ admin panel routes [M-030]
│       │   └── livekit.ts        ⏳ LiveKit token endpoint [M-029]
│       ├── gateway/
│       │   ├── index.ts          ✅ WS server, IDENTIFY, READY, PING, TYPING
│       │   ├── events.ts         ✅ userSockets, channelSubscribers, broadcast
│       │   └── heartbeat.ts      ✅ 30s ping interval, dead connection cleanup
│       └── utils/
│           ├── ulid.ts           ✅ monotonic ULID generator
│           ├── logger.ts         ✅ structured console logger
│           ├── sleep.ts          ✅ async sleep helper
│           ├── queue.ts          ⏳ async serial queue [M-026]
│           └── crypto.ts         ⏳ AES-256-GCM encrypt/decrypt [M-034]
├── web/                          ← React 19 + Vite + TypeScript [Phase 4]
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx
│       ├── api.ts            ← typed fetch wrapper, token refresh interceptor
│       ├── ws.ts             ← WS client, heartbeat, exponential backoff reconnect
│       ├── store/
│       │   ├── auth.ts
│       │   ├── spaces.ts
│       │   ├── channels.ts
│       │   ├── messages.ts
│       │   ├── presence.ts
│       │   └── dm.ts
│       ├── hooks/
│       │   ├── useWS.ts
│       │   ├── usePresence.ts
│       │   └── useTyping.ts
│       └── components/
│           ├── auth/             Login, Register, TwoFactor, TOTPSetup
│           ├── layout/           AppShell, Sidebar, ChannelList, MemberList
│           ├── messages/         MessagePane, MessageInput, Message, TypingIndicator
│           ├── dm/               DMList, DMPane
│           ├── voice/            VoiceChannel (LiveKit), VideoCall
│           └── admin/            AdminShell, UsersPanel, SpacesPanel, StatsPanel
└── electron/                     ← Electron desktop shell [Phase 6]
    └── src/
        ├── main.ts           ← BrowserWindow, tray, mercury:// deep links
        ├── preload.ts        ← contextBridge, contextIsolation ON, nodeIntegration OFF
        └── updater.ts        ← electron-updater auto-update
```

---

## 3. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Server language | TypeScript (Node 20, ESM) | Type safety across server + client via shared package |
| HTTP server | Express 4 | Minimal, well-understood, easy to extend |
| Database | SQLite via `better-sqlite3` | Zero-config, single file, WAL mode handles concurrent reads |
| WebSocket | `ws` (native) | No abstraction layer — full control over the protocol |
| Auth hashing | `bcrypt` (cost 12) | Industry standard for password storage |
| Auth tokens | `jsonwebtoken` (JWT HS256) | Stateless short-lived access tokens |
| ID generation | ULID (custom util) | Sortable by time, URL-safe, no integer ID enumeration |
| 2FA | `otplib` (TOTP/RFC 6238) | Standard authenticator app compatible |
| 2FA encryption | AES-256-GCM (Node crypto) | TOTP secrets encrypted at rest — DB breach doesn’t expose secrets |
| Voice/Video | LiveKit (self-hosted WebRTC SFU) | Full media stack, no external cloud |
| Web client | React 19 + Vite + TypeScript | Fast build, modern React (use hook, server components ready) |
| State management | Zustand | Minimal boilerplate, works well with WS event updates |
| CSS | CSS custom properties (dark-first) | No framework dependency, `prefers-color-scheme` native |
| Desktop | Electron (wraps web client) | One codebase, two targets |
| PWA | Vite PWA plugin + custom SW | Cache-first shell, offline fallback |
| Reverse proxy | Caddy | Auto TLS, one-line config, HTTP→2 HTTPS redirect |
| Container | Docker + docker-compose | Reproducible dev and prod environments |

---

## 4. Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                 │
│  │ Browser/PWA │ │  Electron   │ │   Mobile    │                 │
│  │ React + Vite│ │(wraps web) │ │ (PWA/web)  │                 │
│  └─────────────┘ └─────────────┘ └─────────────┘                 │
│       │ HTTPS REST          │ WSS (WebSocket Secure)             │
└──────┴────────────────────┴─────────────────────────────┘
        │                      │
┌──────┴────────────────────┴─────────────────────────────┐
│  CADDY REVERSE PROXY (TLS termination)                          │
│  • Auto Let’s Encrypt cert    • HTTP → HTTPS redirect             │
│  • WebSocket upgrade proxy   • Forwards to :4000               │
└───────────────────────────────────────────────────────────────────┘
        │
┌──────┴─────────────────────────────────────────────────────────────┐
│  MERCURY SERVER (Node 20, port 4000)                            │
│  ┌───────────────────────────┐  ┌───────────────────────┐    │
│  │   Express REST API       │  │   WebSocket Gateway      │    │
│  │   /api/v1/*              │  │   /gateway               │    │
│  └───────────────────────────┘  └───────────────────────┘    │
│           │ reads/writes              │ fan-out                    │
│  ┌─────────┴────────────────────┴───────────────────┐    │
│  │   better-sqlite3 (WAL mode)                             │    │
│  │   mercury.db                                            │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
        │ (voice/video only)
┌──────┴───────────────────┐
│  LiveKit SFU (self-hosted) │
│  WebRTC media relay        │
└───────────────────────────┘
```

**Key design decisions:**
- REST API for all stateful mutations (create, update, delete)
- WebSocket for real-time push events only (receive, never mutate)
- SQLite single-file database — no separate database server process
- LiveKit handles all media — Mercury only generates the room token
- Caddy handles TLS — Mercury never touches certificates

---

## 5. Data Model

### Entity Relationship

```
User ├── owns ────────────────────── Space
     ├── member of (via members) ── Space ── has many ── Channel
     ├── has many ─────────────── Session       Channel ── has many ── Message
     ├── has many ─────────────── Message                         Message ── has many ── Reaction
     ├── has many ─────────────── Reaction                        Message ── has many ── Attachment
     └── member of (via dm_members) DM Channel
```

### Schema

```sql
-- All IDs are ULIDs (26-char sortable string).
-- All timestamps are ISO-8601 strings from SQLite datetime('now').

CREATE TABLE users (
  id           TEXT PRIMARY KEY,   -- ulid
  username     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,       -- bcrypt hash, cost 12
  avatar       TEXT,                -- URL to avatar image
  status       TEXT NOT NULL DEFAULT 'offline', -- online|idle|offline
  is_admin     INTEGER NOT NULL DEFAULT 0,
  is_banned    INTEGER NOT NULL DEFAULT 0,
  totp_secret  TEXT,                -- AES-256-GCM encrypted, NULL if 2FA off
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE totp_backup_codes (
  id         TEXT PRIMARY KEY,   -- ulid
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,      -- bcrypt hash of 8-char backup code
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,  -- ulid, rotated on every /refresh
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE spaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,
  owner_id    TEXT NOT NULL REFERENCES users(id),
  require_2fa INTEGER NOT NULL DEFAULT 0, -- force 2FA for all members
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE channels (
  id         TEXT PRIMARY KEY,
  space_id   TEXT REFERENCES spaces(id) ON DELETE CASCADE, -- NULL for DMs
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text', -- text|announcement|voice|dm
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE dm_members (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE members (
  id        TEXT PRIMARY KEY,
  space_id  TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id),
  role      TEXT NOT NULL DEFAULT 'member', -- owner|admin|moderator|member
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (space_id, user_id)
);

CREATE TABLE messages (
  id         TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  edited_at  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE reactions (
  id         TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  emoji      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE attachments (
  id         TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  filename   TEXT NOT NULL,
  size       INTEGER NOT NULL,
  mime_type  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE invites (
  code       TEXT PRIMARY KEY,
  space_id   TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id),
  uses       INTEGER NOT NULL DEFAULT 0,
  max_uses   INTEGER,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Performance indexes (added M-023)
CREATE INDEX idx_messages_channel ON messages(channel_id, id DESC);
CREATE INDEX idx_members_space    ON members(space_id);
CREATE INDEX idx_members_user     ON members(user_id);
CREATE INDEX idx_sessions_user    ON sessions(user_id);

-- Full-text search (added M-027)
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  message_id UNINDEXED
);
-- Populated via INSERT/UPDATE/DELETE triggers on messages
```

---

## 6. API Reference

All routes are prefixed `/api/v1/`. All requests/responses are JSON.
All errors return `{ "error": "description" }` with a correct HTTP status code.
All protected routes require `Authorization: Bearer <access_token>`.

### Auth — `/api/v1/auth`

| Method | Path | Auth | Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/register` | ✗ | `{ username, email, password }` | `{ user, access_token, refresh_token, expires_in }` | 409 if username/email taken |
| POST | `/login` | ✗ | `{ email, password }` | `{ user, access_token, refresh_token, expires_in }` | 401 on bad creds; 429 after 10/min per IP. If 2FA enabled: returns `{ totp_required: true, totp_session: string }` instead of tokens |
| POST | `/refresh` | ✗ | `{ refresh_token }` | `{ access_token, refresh_token, expires_in }` | Rotates token; 401 if expired |
| GET | `/me` | ✓ | — | `User` | Returns current user |
| POST | `/logout` | ✓ | `{ refresh_token }` | 204 | Deletes session, sets offline |
| POST | `/2fa/setup` | ✓ | — | `{ otpauth_url, backup_codes[] }` | Returns QR code URI + 8 backup codes |
| POST | `/2fa/verify` | ✗ | `{ totp_session, code }` | `{ user, access_token, refresh_token, expires_in }` | Exchanges TOTP code for full session |
| DELETE | `/2fa` | ✓ | `{ code }` | 204 | Requires current TOTP code to disable |

### Spaces — `/api/v1/spaces`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `Space[]` — spaces the user is a member of |
| POST | `/` | `{ name }` | `Space` (201) — also creates default #general channel, joins creator as owner |
| GET | `/:id` | — | `Space` or 404 |

### Channels — `/api/v1/spaces/:spaceId/channels`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `Channel[]` — channels in the space |
| POST | `/` | `{ name, type? }` | `Channel` (201) |

### Members — `/api/v1/spaces/:spaceId/members`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `Member[]` with username, avatar, status joined |
| DELETE | `/:userId` | — | 204 — kick member (owner/admin only) |

### Invites

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/spaces/:spaceId/invites` | `{ max_uses?, expires_at? }` | `Invite` (201) |
| POST | `/api/v1/invites/:code/redeem` | — | `{ space, channel[] }` — joins space |

### Messages — `/api/v1/channels/:channelId/messages`

| Method | Path | Query | Body | Response |
|---|---|---|---|---|
| GET | `/` | `?before=<ulid>` | — | `Message[]` (last 50, ascending) |
| POST | `/` | — | `{ content }` | `Message` (201) + WS `MESSAGE_CREATE` fan-out |
| PATCH | `/:msgId` | — | `{ content }` | `Message` + WS `MESSAGE_UPDATE` [M-024] |
| DELETE | `/:msgId` | — | — | 204 + WS `MESSAGE_DELETE` [M-024] |

### Reactions — `/api/v1/channels/:channelId/messages/:msgId/reactions` [M-025]

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/` | `{ emoji }` | 201 + WS `REACTION_ADD` |
| DELETE | `/:emoji` | — | 204 + WS `REACTION_REMOVE` |

### Direct Messages [M-028]

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/dm` | `{ user_id }` | `Channel` — creates or returns existing DM |
| GET | `/api/v1/dm` | — | `Channel[]` — all DM channels for current user |
| GET | `/api/v1/dm/:channelId/messages` | — | `Message[]` |

### Uploads [M-026]

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/upload` | `multipart/form-data { file }` | `{ url, filename, size, mime_type }` |

Files served statically from `/uploads/*`.

### Search [M-027]

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/v1/search` | `?q=text&space_id=optional` | `Message[]` with match highlights |

### LiveKit [M-029]

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/livekit/token` | `{ channel_id }` | `{ token, url }` |

### Admin [M-030]

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/users` | List all users |
| PATCH | `/api/v1/admin/users/:id` | Ban/unban, force logout, revoke 2FA |
| GET | `/api/v1/admin/spaces` | List all spaces |
| DELETE | `/api/v1/admin/spaces/:id` | Delete space |
| GET | `/api/v1/admin/invites` | List active invites |
| DELETE | `/api/v1/admin/invites/:code` | Revoke invite |
| GET | `/api/v1/admin/stats` | users, messages, DB size, uptime, WS count |

---

## 7. WebSocket Protocol

**Endpoint:** `wss://your.domain/gateway`

All frames are JSON. Shape: `{ "op": "OPCODE", "d": { ...payload } }`

### Opcodes

| Direction | Op | Payload | Notes |
|---|---|---|---|
| C→S | `IDENTIFY` | `{ token: string }` | Must be sent within 5s of connect |
| C→S | `PING` | `{}` | Client sends every 30s |
| C→S | `TYPING_START` | `{ channel_id: string }` | Fires after 500ms typing debounce |
| S→C | `READY` | `{ user: User, session_id: string }` | Sent after successful IDENTIFY |
| S→C | `PONG` | `{}` | Reply to PING |
| S→C | `INVALID_SESSION` | `{ reason: string }` | Connection will be closed |
| S→C | `MESSAGE_CREATE` | `{ message: Message }` | New message in subscribed channel |
| S→C | `MESSAGE_UPDATE` | `{ message: Message }` | Message edited |
| S→C | `MESSAGE_DELETE` | `{ message_id, channel_id }` | Message deleted |
| S→C | `TYPING_INDICATOR` | `{ user_id, username, channel_id, timestamp, clear_after }` | Show typing for `clear_after` ms |
| S→C | `MEMBER_JOIN` | `{ member: Member, space_id }` | User joined a space |
| S→C | `MEMBER_LEAVE` | `{ user_id, space_id }` | User left a space |
| S→C | `PRESENCE_UPDATE` | `{ user_id, status }` | online/idle/offline changed |
| S→C | `REACTION_ADD` | `{ message_id, user_id, emoji }` | Reaction added |
| S→C | `REACTION_REMOVE` | `{ message_id, user_id, emoji }` | Reaction removed |
| S→C | `DM_MESSAGE_CREATE` | `{ message: Message }` | New DM |

### Connection Lifecycle

```
Client connects to wss://host/gateway
  │
  ├── Must send IDENTIFY within 5s (WS_IDENTIFY_TIMEOUT_MS)
  │     payload: { op: "IDENTIFY", d: { token: "<JWT access token>" } }
  │
  ├── Server verifies JWT, loads user, subscribes to all user's channels
  │     Sets user status = 'online' in DB
  │
  ├── Server sends READY
  │     payload: { op: "READY", d: { user, session_id } }
  │
  ├── Normal operation:
  │     Client sends PING every 30s → Server replies PONG
  │     Client sends TYPING_START → Server broadcasts TYPING_INDICATOR
  │     Server pushes all events to subscribed clients
  │
  └── On close:
        Unregisters socket. If no other sockets remain for user:
          Sets status = 'offline', unsubscribes from all channels.

If IDENTIFY not received within 5s:
  Server sends INVALID_SESSION { reason: 'Identify timeout' }
  Closes with code 4001

Client reconnect strategy (exponential backoff):
  Attempt 1: wait 1s
  Attempt 2: wait 2s
  Attempt 3: wait 4s
  Attempt 4: wait 8s
  Attempt 5+: wait 30s (max)
```

---

## 8. Authentication Flow

```
REGISTER
  POST /auth/register { username, email, password }
    └── validateBody (length checks)
    └── Check username/email uniqueness → 409 if taken
    └── bcrypt.hash(password, 12)
    └── INSERT user
    └── issueTokens(userId) → JWT access + ULID refresh, INSERT session
    └── 201 { user, access_token, refresh_token, expires_in: 900 }

LOGIN (no 2FA)
  POST /auth/login { email, password }
    └── loginRateCheck(ip) → 429 if >10/min
    └── SELECT user by email → 401 if not found (same message as wrong password)
    └── bcrypt.compare(password, hash) → 401 if no match
    └── UPDATE status = 'online'
    └── issueTokens(userId)
    └── 200 { user, access_token, refresh_token, expires_in: 900 }

LOGIN (2FA enabled)
  POST /auth/login { email, password }
    └── [same checks as above]
    └── totp_enabled = 1 → issue short-lived totp_session token (5 min, not a full session)
    └── 200 { totp_required: true, totp_session: "<jwt>" }
  POST /auth/2fa/verify { totp_session, code }
    └── Verify totp_session JWT
    └── Decrypt TOTP secret, otplib.authenticator.verify(code, secret)
    └── If valid → issueTokens(userId) → full session
    └── If invalid → try backup codes → mark used
    └── 200 { user, access_token, refresh_token, expires_in: 900 }

TOKEN REFRESH
  POST /auth/refresh { refresh_token }
    └── SELECT session by refresh_token
    └── Check expires_at
    └── DELETE old session (rotation)
    └── issueTokens(userId) → new access + new refresh token
    └── 200 { access_token, refresh_token, expires_in: 900 }

PROTECTED ROUTE
  Authorization: Bearer <access_token>
    └── middleware/auth.ts: jwt.verify(token, JWT_SECRET)
    └── Attaches req.userId
    └── Route handler runs

  Token expiry (15 min):
    Client receives 401 → calls POST /auth/refresh → retries original request
```

---

## 9. 2FA (TOTP) Flow

```
ENROLLMENT
  POST /auth/2fa/setup (requires auth, 2FA not yet enabled)
    └── Generate 20-byte random secret (crypto.randomBytes)
    └── AES-256-GCM encrypt secret with TOTP_SECRET env var
    └── Store encrypted secret in users.totp_secret (NOT yet enabled)
    └── Generate 8 backup codes (8 x 8-char random strings)
    └── bcrypt.hash each backup code, store in totp_backup_codes
    └── Return otpauth:// URI (user scans with any TOTP app)
      + plaintext backup codes (shown once, never retrievable again)

  User scans QR code in authenticator app (Google Authenticator, Authy, etc.)
  User submits a valid code to confirm enrollment:
    POST /auth/2fa/verify-setup { code }
      └── otplib.authenticator.verify(code, decryptedSecret)
      └── On success: UPDATE users SET totp_enabled = 1

DISABLE
  DELETE /auth/2fa { code }
    └── Verify current TOTP code
    └── UPDATE users SET totp_secret = NULL, totp_enabled = 0
    └── DELETE FROM totp_backup_codes WHERE user_id = ?

ADMIN REVOKE
  PATCH /admin/users/:id { action: 'revoke_2fa' }
    └── Same as disable but no TOTP code required — admin override
```

---

## 10. Request Lifecycle

Every HTTP request to Mercury passes through this exact chain:

```
Incoming request
  │
  ├── 1. Caddy (TLS termination, HTTPS redirect)
  │
  ├── 2. CORS middleware
  │     origin must match CORS_ORIGIN env var exactly
  │     credentials: true (cookies allowed if needed)
  │
  ├── 3. express.json() body parser (limit: 64kb)
  │
  ├── 4. rateLimiter (global, 60 req/min per IP)
  │     429 + Retry-After header if exceeded
  │
  ├── 5. Router match
  │
  ├── 6. requireAuth (protected routes only)
  │     jwt.verify(Bearer token, JWT_SECRET)
  │     401 if missing, invalid, or expired
  │
  ├── 7. validateBody (routes with body)
  │     Type + length checks. 400 if invalid.
  │
  ├── 8. Route handler (db read/write)
  │
  └── 9. Response (JSON) + optional WS broadcast
```

---

## 11. Middleware Stack

### `middleware/auth.ts` — `requireAuth`

Extends `Request` as `AuthRequest` with `userId: string`.
Extracts `Authorization: Bearer <token>`, calls `jwt.verify`, attaches `req.userId`.
Returns 401 on any failure. Never calls `next()` on failure.

### `middleware/rateLimit.ts` — `rateLimiter`

Global in-memory per-IP rate limiter. 60 requests per 60-second window.
Returns 429 with `Retry-After` header.
Separate tighter limiter in `auth.ts` for login: 10 per minute per IP.

### `middleware/validate.ts` — `validateBody(schema)`

Schema is a map of field name → `{ type, min, max }`.
Checks presence, type, and length of all specified fields.
Returns 400 `{ error: "field: reason" }` on first failure.

### `middleware/ssrf.ts` — SSRF guard

Used before any outbound URL fetch (link previews, webhooks).
Blocks private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1).
Blocks `file://`, `ftp://` schemes.
Returns 400 if URL resolves to a blocked address.

### `middleware/hmac.ts` — HMAC signature verification

For incoming webhooks. Verifies `X-Mercury-Signature` header.
Uses `timingSafeEqual` to prevent timing attacks.

### `middleware/admin.ts` — `requireAdmin` [M-031]

Checks `users.is_admin = 1` for `req.userId`.
Returns 403 if not admin. Applied to all `/api/v1/admin/*` routes.

---

## 12. Real-Time Fan-Out

The fan-out model is the core of Mercury’s real-time system.

```
gateway/events.ts maintains two in-memory maps:

  userSockets:         Map<userId, Set<WebSocket>>
    └─ One user can have multiple open sockets (tabs, devices)

  channelSubscribers:  Map<channelId, Set<userId>>
    └─ All users currently subscribed to a channel

When a user IDENTIFYs:
  1. Query DB: SELECT all channel IDs from spaces the user is a member of
  2. subscribeToChannels(userId, channelIds)
  3. registerSocket(userId, ws)

When a message is posted (POST /channels/:id/messages):
  1. INSERT message into DB
  2. broadcast(channelId, { op: MESSAGE_CREATE, d: { message } })
  3. broadcast() fans out:
     a. Gets Set<userId> from channelSubscribers[channelId]
     b. For each userId, gets Set<WebSocket> from userSockets[userId]
     c. Sends serialised JSON to every open socket (readyState === 1 only)

Multi-tab safety:
  - Same user in two tabs = two entries in userSockets[userId]
  - Both tabs receive the event
  - Client deduplicates by message.id

On disconnect:
  1. unregisterSocket(userId, ws)
  2. If userSockets[userId] is now empty:
     a. UPDATE users SET status = 'offline'
     b. unsubscribeAll(userId)
```

---

## 13. Web Client Architecture

> Phase 4 — not yet built. This is the implementation spec.

### State Management

Zustand stores, one per domain. No global Redux store.

```
store/auth.ts      ← { user, access_token, refresh_token, isAuthenticated }
store/spaces.ts    ← { spaces[], activeSpaceId }
store/channels.ts  ← { channels[], activeChannelId }
store/messages.ts  ← { messages: Map<channelId, Message[]> }
store/presence.ts  ← { status: Map<userId, PresenceStatus> }
store/dm.ts        ← { dmChannels[] }
```

### `api.ts` — Typed fetch wrapper

```
api.get<T>(path)       → Promise<T>
api.post<T>(path, body) → Promise<T>
api.patch<T>(path, body)
api.delete(path)

All calls:
  1. Attach Authorization: Bearer <access_token>
  2. On 401: call POST /auth/refresh, retry once
  3. On second 401: clear auth store, redirect to /login
```

### `ws.ts` — WebSocket client

```
connect(token):
  1. new WebSocket(WS_URL)
  2. On open: send IDENTIFY { token }
  3. On READY: update auth store with session_id
  4. On message: dispatch to relevant store based on op
  5. Start PING interval (30s)
  6. On close: clear interval, start reconnect backoff

Reconnect backoff: 1s → 2s → 4s → 8s → 30s (max)
Each reconnect calls connect(token) again — re-IDENTIFYs cleanly
```

### Component Tree

```
App
 ├── Router
 │   ├── /login          → Login.tsx
 │   ├── /register       → Register.tsx
 │   ├── /2fa            → TwoFactor.tsx
 │   ├── /settings/2fa   → TOTPSetup.tsx
 │   └── /app/*          → AppShell.tsx (protected)
 │       ├── Sidebar
 │       │   ├── Space list (icons)
 │       │   └── ChannelList (for active space)
 │       ├── MessagePane (for active channel)
 │       │   ├── Message (per message, with reactions)
 │       │   └── TypingIndicator
 │       ├── MessageInput
 │       ├── MemberList (right sidebar)
 │       └── VoiceChannel (LiveKit, when in voice channel)
 └── /admin/*        → AdminShell (requireAdmin)
     ├── UsersPanel
     ├── SpacesPanel
     ├── InvitesPanel
     └── StatsPanel
```

---

## 14. Infrastructure & Security

### Four-Layer Security Model

```
Layer 1 — Host
  ufw: allow 22/tcp, 80/tcp, 443/tcp — deny everything else
  SSH: key-only (/etc/ssh/sshd_config: PasswordAuthentication no)
  fail2ban: monitors SSH + Caddy access logs
  unattended-upgrades: automatic OS security patches
  deploy user: non-root, sudo only where required

Layer 2 — TLS (Caddy)
  Auto Let’s Encrypt certificate (renews automatically)
  HTTP → HTTPS redirect (Caddy default)
  WebSocket upgrade proxied transparently
  No TLS config required — Caddyfile.example:

    your.domain.com {
      reverse_proxy localhost:4000
    }

Layer 3 — Application
  Server refuses to start without JWT_SECRET, TOTP_SECRET
  CORS locked to CORS_ORIGIN env var
  Rate limiting before auth on all routes
  Input validation on all routes
  SSRF guard on all outbound fetches
  bcrypt passwords, rotating JWT sessions, TOTP 2FA

Layer 4 — Optional: WireGuard VPN
  Put Mercury on a private network accessible only to authorised devices.
  Each user device gets a WireGuard keypair + peer entry on the server.
  ufw: allow all from 10.0.0.0/24 (WireGuard subnet)
  Mercury listens on WireGuard interface only.
  Best for small, trusted-team deployments.
```

### Infrastructure Setup Checklist

```
INFRA-1  [ ]  ufw: ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
INFRA-1  [ ]  SSH: edit /etc/ssh/sshd_config — PasswordAuthentication no
INFRA-1  [ ]  fail2ban: apt install fail2ban, configure jail.local
INFRA-1  [ ]  apt install unattended-upgrades && dpkg-reconfigure unattended-upgrades
INFRA-2  [ ]  Install Caddy, deploy Caddyfile.example as /etc/caddy/Caddyfile
INFRA-2  [ ]  systemctl enable caddy && systemctl start caddy
INFRA-3  [ ]  (Optional) Install WireGuard, configure wg0
INFRA-4  [ ]  Configure daily SQLite backup: cp mercury.db /backup/mercury-$(date +%F).db
INFRA-4  [ ]  Configure off-site sync (rsync, rclone, or S3)
```

---

## 15. Environment Variables

All variables required unless marked optional. Server refuses to start if
required variables are missing or empty.

```bash
# .env.example

# ─── Required ─────────────────────────────────────────────────────────────────
JWT_SECRET=          # 32+ random bytes, base64. Signs all JWT access tokens.
TOTP_SECRET=         # 32 random bytes, base64. AES-256-GCM key for TOTP secrets.
CONTROL_SECRET=      # 32+ random bytes. HMAC key for webhook verification.
CORS_ORIGIN=         # Exact origin, e.g. https://chat.example.com

# ─── Server ───────────────────────────────────────────────────────────────────
PORT=4000            # HTTP server port (default: 4000)
DB_PATH=./data/mercury.db  # SQLite database file path

# ─── LiveKit (required for voice/video) ───────────────────────────────────────
LIVEKIT_URL=         # wss://your-livekit-server
LIVEKIT_API_KEY=     # From LiveKit server config
LIVEKIT_API_SECRET=  # From LiveKit server config

# ─── Uploads ──────────────────────────────────────────────────────────────────
UPLOAD_DIR=./uploads       # Directory for uploaded files
UPLOAD_MAX_SIZE_MB=25      # Max upload size in MB

# ─── Web client (Vite, build-time) ────────────────────────────────────────────
VITE_API_URL=https://chat.example.com/api/v1
VITE_WS_URL=wss://chat.example.com/gateway
```

---

## 16. Build Sequence

Every commit is atomic, independently deployable, and leaves the codebase in
a working state. `✅` = shipped. `⏳` = pending.

```
Phase 0 — Scaffold
  M-001–M-007  ✅  Monorepo + tsconfig + shared types + server skeleton
                   + web skeleton + .env + docker-compose + README

Phase 1 — Auth
  M-008–M-009  ✅  Security middleware (rateLimiter, validateBody, ssrf) + db schema
  M-010–M-013  ✅  register, login, refresh, me, logout

Phase 2 — Spaces & Channels
  M-014–M-017  ✅  spaces.ts, channels.ts, members.ts, invites.ts

Phase 3 — Messaging & WebSocket
  M-019–M-022  ✅  messages.ts (GET/POST) + gateway (IDENTIFY, READY,
                   MESSAGE_CREATE fan-out, TYPING_INDICATOR, heartbeat, presence)

─── CURRENT POSITION: M-022 COMPLETE ───

Phase 3b — Server completeness
  M-023  ⏳  fix: gateway/index.ts — import userSockets from events.ts
               db.ts — add 4 performance indexes
  M-024  ⏳  feat: PATCH + DELETE /channels/:id/messages/:msgId
               WS events: MESSAGE_UPDATE, MESSAGE_DELETE
  M-025  ⏳  feat: reactions.ts — POST/DELETE reactions
               WS events: REACTION_ADD, REACTION_REMOVE
  M-026  ⏳  feat: uploads.ts — multipart POST /upload
               utils/queue.ts — serial async queue for disk writes
               Static serving of /uploads/*
  M-027  ⏳  feat: search.ts — FTS5 virtual table + triggers + GET /search
  M-028  ⏳  feat: dm.ts — POST /dm, GET /dm, GET /dm/:id/messages
               dm_members table, DM_MESSAGE_CREATE WS event
  M-029  ⏳  feat: livekit.ts — POST /livekit/token
               LiveKit server SDK, room naming convention
  M-030  ⏳  feat: admin.ts (routes) — users, spaces, invites, stats
  M-031  ⏳  feat: middleware/admin.ts — requireAdmin guard
  M-032  ⏳  feat: db.ts migration — add is_admin, is_banned, totp_secret, totp_enabled
  M-033  ⏳  feat: totp.ts — 2FA setup, verify, disable, backup codes
  M-034  ⏳  feat: utils/crypto.ts — AES-256-GCM encrypt/decrypt for TOTP secrets

Phase 4 — Web Client (React 19 + Vite)
  M-035  ⏳  feat(web): App.tsx, router.tsx, api.ts, ws.ts scaffold
  M-036  ⏳  feat(web): design system — CSS custom properties, dark-first
  M-037  ⏳  feat(web): Login.tsx + Register.tsx
  M-038  ⏳  feat(web): TwoFactor.tsx + TOTPSetup.tsx
  M-039  ⏳  feat(web): AppShell.tsx + Sidebar.tsx + ChannelList.tsx
  M-040  ⏳  feat(web): MessagePane.tsx — history load, scroll anchor, unread ack
  M-041  ⏳  feat(web): MessageInput.tsx — Enter send, Shift+Enter newline
  M-042  ⏳  feat(web): TypingIndicator.tsx + presence badges
  M-043  ⏳  feat(web): Reactions.tsx — add/remove, live update via WS
  M-044  ⏳  feat(web): file upload UI — drag-drop + paste + progress
  M-045  ⏳  feat(web): DMList.tsx + DMPane.tsx
  M-046  ⏳  feat(web): VoiceChannel.tsx — LiveKit components
  M-047  ⏳  feat(web): search UI — input, results, jump to message
  M-048  ⏳  feat(web): MemberList.tsx — right sidebar with presence
  M-049  ⏳  feat(web): AdminShell + all admin panels

Phase 5 — PWA
  M-050  ⏳  feat(web): manifest.json + icons (192px, 512px)
  M-051  ⏳  feat(web): service worker — cache-first shell, offline fallback
  M-052  ⏳  feat(web): install prompt after first login

Phase 6 — Electron
  M-053  ⏳  feat(electron): main.ts — BrowserWindow, tray, mercury:// deep links
  M-054  ⏳  feat(electron): preload.ts — contextBridge, contextIsolation ON
  M-055  ⏳  feat(electron): updater.ts — electron-updater auto-update
  M-056  ⏳  feat(electron): native notifications + unread badge
  M-057  ⏳  feat(electron): electron-builder.yml + build pipeline
```

**Total: 57 commits to a complete platform.**

---

## 17. Definition of Done — Mercury v0

Mercury v0 ships when every checkbox is checked.

```
Core functionality
  [ ]  User can register, login, stay logged in across browser sessions
  [ ]  TOTP 2FA can be enrolled, used at login, and disabled by user
  [ ]  Admin can revoke a user’s 2FA remotely
  [ ]  User can create a space, create channels, and invite another user
  [ ]  Two browser tabs in the same channel see each other’s messages in real time
  [ ]  Message edit and delete work, changes propagate via WebSocket
  [ ]  Reactions work — add, remove, live update
  [ ]  File and image uploads work, files persist across restarts
  [ ]  Direct messages work between two users
  [ ]  Voice channel connects via LiveKit
  [ ]  Typing indicator fires and clears correctly
  [ ]  Presence shows online/offline correctly
  [ ]  Message history loads on channel select (cursor paginated)
  [ ]  Full-text search returns relevant results
  [ ]  Admin UI accessible to admin users — ban, manage spaces, view stats, revoke 2FA

Quality
  [ ]  All API routes return correct HTTP status codes
  [ ]  Server refuses to start without JWT_SECRET and TOTP_SECRET
  [ ]  Rate limiting blocks >60 req/min per IP with 429 + Retry-After

Client
  [ ]  PWA installable from Chrome and Safari
  [ ]  Electron app builds and runs on macOS and Windows

Infrastructure
  [ ]  All traffic served over TLS — no plaintext HTTP in production
  [ ]  Host firewall: only ports 80, 443, 22 open externally
```

---

## 18. Quick Start

### Development

```bash
git clone https://github.com/ShadowWalkerNC/Mercury
cd Mercury
cp .env.example .env
# Edit .env: set JWT_SECRET, TOTP_SECRET, CONTROL_SECRET, CORS_ORIGIN
npm install
npm run dev
# Server: http://localhost:4000
# Web:    http://localhost:5173 (Phase 4+)
```

### Generate secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Run once for JWT_SECRET, once for TOTP_SECRET, once for CONTROL_SECRET
```

### Production (Docker)

```bash
cp .env.example .env  # fill all values
docker-compose up -d
```

### Production (bare metal)

```bash
npm run build
node packages/server/dist/index.js
```

Place `Caddyfile.example` at `/etc/caddy/Caddyfile`, update domain, restart Caddy.

---

*Mercury — ShadowWalkerNC — July 2026*
*Full requirements: [MERCURY.md](https://github.com/ShadowWalkerNC/Sigil/blob/main/MERCURY.md) in the Sigil repo*
