# Mercury

> Self-hosted communication platform. Spaces, channels, real-time messaging, voice — owned end to end.

[![CI](https://github.com/ShadowWalkerNC/Mercury/actions/workflows/ci.yml/badge.svg)](https://github.com/ShadowWalkerNC/Mercury/actions/workflows/ci.yml)

**Status:** Active development · Beta-candidate · Not yet publicly released  
**Version:** v0.1.0 · Build sequence: M-057 complete  
**Stack:** Node 20 · TypeScript · React · SQLite · WebSocket · LiveKit  

---

## Table of Contents

1. [What Mercury Is](#1-what-mercury-is)
2. [Monorepo Layout](#2-monorepo-layout)
3. [Technology Stack](#3-technology-stack)
4. [Command Stream Design System](#4-command-stream-design-system)
5. [Architecture Overview](#5-architecture-overview)
6. [Data Model](#6-data-model)
7. [API Reference](#7-api-reference)
8. [WebSocket Protocol](#8-websocket-protocol)
9. [Authentication Flow](#9-authentication-flow)
10. [2FA (TOTP) Flow](#10-2fa-totp-flow)
11. [Request Lifecycle](#11-request-lifecycle)
12. [Middleware Stack](#12-middleware-stack)
13. [Real-Time Fan-Out](#13-real-time-fan-out)
14. [Web Client Architecture](#14-web-client-architecture)
15. [Infrastructure & Security](#15-infrastructure--security)
16. [CI / CD Pipeline](#16-ci--cd-pipeline)
17. [Environment Variables](#17-environment-variables)
18. [Definition of Done](#18-definition-of-done)
19. [Quick Start](#19-quick-start)

---

## 1. What Mercury Is

Mercury is a private, self-hosted communication platform. You run the server. You own the data. No external platform dependency, no SaaS subscription, no multi-tenant infrastructure.

- **Real-time text messaging** in organised **Spaces** (communities) and **Channels** (topic rooms)
- **Direct messages** — 1:1 and group DMs (up to 10 participants)
- **Voice and video** via LiveKit (self-hosted WebRTC SFU)
- **File and image uploads** — presigned S3 flow with inline preview and progress
- **Presence** — online / idle / offline per user, driven by WebSocket connection state
- **Roles and permissions** — owner / admin / moderator / member per space
- **Invite system** — code-based invites with optional max-uses and expiry
- **Full-text search** across message history (SQLite FTS5)
- **TOTP two-factor authentication** — optional per user, enforceable per space
- **Browser push notifications** — Web Push API with VAPID
- **Onboarding wizard** — first-run space and display name setup
- **PWA** — installable on mobile and desktop from the browser
- **Admin UI** — manage users, spaces, invites, server stats

Mercury is not a public product. It is a private, operator-owned tool.

---

## 2. Monorepo Layout

```
mercury/                            ← npm workspaces root
├── package.json                    ← workspaces: ["packages/*"]
├── tsconfig.base.json              ← shared TS compiler base
├── .env.example                    ← all required env vars documented
├── .gitignore
├── docker-compose.yml              ← one-command local dev stack
├── Caddyfile.example               ← production TLS reverse proxy config
├── .changelogrc.json               ← conventional commit → changelog section map
└── .github/
    ├── dependabot.yml              ← weekly updates: 6 ecosystems
    └── workflows/
        ├── ci.yml                  ← quality gate: lint, typecheck, test, build
        ├── test.yml                ← full test matrix with coverage thresholds
        ├── release.yml             ← tag-triggered: build → changelog → GitHub Release
        └── tag-release.yml        ← manual dispatch: safe version bump + tag

packages/
├── shared/                         ← types, WS protocol, constants
│   └── src/
│       ├── types.ts                ← User, Space, Channel, Message, Invite, Member
│       ├── events.ts               ← WSOp enum + all WSPayload interfaces
│       ├── constants.ts            ← TTLs, limits, rate limits, WS timing
│       └── index.ts                ← barrel export
│
├── api/                            ← Fastify + Drizzle ORM + Zod validation
│   └── src/
│       ├── index.ts                ← process bootstrap, env guard, HTTP+WS start
│       ├── app.ts                  ← Fastify app factory, route wiring
│       ├── db.ts                   ← Drizzle ORM + schema + migrations
│       ├── config.ts               ← typed env var accessors
│       ├── middleware/
│       │   ├── auth.ts             ← requireAuth — JWT Bearer verification
│       │   ├── rateLimit.ts        ← 60 req/min per-IP limiter
│       │   ├── validate.ts         ← Zod schema validation on all mutating routes
│       │   ├── ssrf.ts             ← SSRF guard for outbound URL fetches
│       │   ├── cors.ts             ← CORS locked to CORS_ORIGIN
│       │   └── admin.ts            ← requireAdmin — is_admin guard
│       └── routes/
│           ├── auth.ts             ✅ register, login, refresh, me, logout
│           ├── spaces.ts           ✅ GET/POST /spaces, GET /spaces/:id
│           ├── channels.ts         ✅ GET/POST /spaces/:id/channels
│           ├── members.ts          ✅ GET members, DELETE member (kick)
│           ├── invites.ts          ✅ POST invite, POST redeem
│           ├── messages.ts         ✅ GET/POST/PATCH/DELETE messages
│           ├── reactions.ts        ✅ POST/DELETE reactions
│           ├── uploads.ts          ✅ POST /upload — presigned S3 + multipart
│           ├── dm.ts               ✅ POST/GET /dm, GET /dm/:id/messages
│           ├── search.ts           ✅ GET /search — FTS5
│           ├── livekit.ts          ✅ POST /livekit/token
│           ├── totp.ts             ✅ 2FA setup/verify/disable/backup codes
│           └── admin.ts            ✅ users, spaces, invites, stats
│
├── server/                         ← WebSocket gateway + fan-out engine
│   └── src/
│       ├── index.ts                ← WS server bootstrap
│       ├── gateway/
│       │   ├── index.ts            ✅ IDENTIFY, READY, PING, TYPING
│       │   ├── events.ts           ✅ userSockets, channelSubscribers, broadcast
│       │   └── heartbeat.ts        ✅ 30s ping, dead connection cleanup
│       └── utils/
│           ├── ulid.ts             ✅ monotonic ULID generator
│           ├── logger.ts           ✅ structured console logger
│           ├── queue.ts            ✅ async serial queue for disk writes
│           └── crypto.ts           ✅ AES-256-GCM encrypt/decrypt
│
└── web/                            ← React + Vite + TypeScript — Command Stream UI
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── router.tsx
        ├── api.ts                  ← typed fetch wrapper, token refresh interceptor
        ├── ws.ts                   ← WS client, heartbeat, exponential backoff
        ├── stores/
        │   ├── authStore.ts
        │   ├── spaceStore.ts
        │   ├── channelStore.ts
        │   ├── messageStore.ts
        │   ├── presenceStore.ts
        │   ├── dmStore.ts
        │   ├── uiStore.ts          ← commandBarOpen, activeMobileTab, toastQueue, modals
        │   └── themeStore.ts       ← auroraEnabled, localStorage persistence
        ├── hooks/
        │   ├── useWS.ts
        │   ├── usePresence.ts
        │   └── useTyping.ts
        ├── components/
        │   ├── auth/               ← Login, Register, TwoFactor, TOTPSetup
        │   ├── layout/
        │   │   ├── AppShell.tsx    ← AuroraCanvas + CommandPalette + ToastManager + ErrorBoundary
        │   │   ├── AuroraCanvas.tsx
        │   │   ├── CommandBar.tsx
        │   │   ├── SpaceRail.tsx
        │   │   ├── MobileNav.tsx
        │   │   ├── ContentStream.tsx
        │   │   └── ChannelSidebar.tsx
        │   ├── ui/
        │   │   ├── GlassCard.tsx
        │   │   ├── Pill.tsx
        │   │   ├── Avatar.tsx
        │   │   ├── Badge.tsx
        │   │   ├── CommandPalette.tsx
        │   │   ├── ToastManager.tsx
        │   │   ├── EmptyState.tsx
        │   │   ├── ConfirmModal.tsx
        │   │   └── ErrorBoundary.tsx
        │   ├── chat/
        │   │   ├── MessageItem.tsx
        │   │   ├── MessageComposer.tsx
        │   │   ├── MessageStatus.tsx
        │   │   └── TypingIndicator.tsx
        │   ├── voice/
        │   │   └── VoiceArea.tsx   ← LiveKit room, participant grid, mute/deafen/leave
        │   └── admin/
        │       ├── AdminShell.tsx
        │       ├── UsersPanel.tsx
        │       ├── SpacesPanel.tsx
        │       └── StatsPanel.tsx
        ├── pages/
        │   ├── Onboarding.tsx      ← 3-step first-run wizard
        │   ├── InviteAcceptPage.tsx
        │   └── NotFound.tsx
        └── styles/
            ├── tokens.css          ← full Command Stream design token palette
            ├── global.css          ← Space Grotesk, black body, focus-visible, scrollbar
            ├── aurora.css          ← reusable aurora glow field classes
            ├── breakpoints.css     ← mobile / tablet / desktop breakpoint tokens
            └── accessibility.css   ← WCAG AA — focus rings, skip link, reduced-motion
```

---

## 3. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript (Node 20, ESM) | Type safety end-to-end via shared package |
| HTTP server | Fastify | ~3× faster than Express, built-in schema validation |
| ORM | Drizzle ORM + Drizzle Kit | Type-safe queries, migration files tracked in git |
| Database | SQLite (`better-sqlite3`, WAL mode) | Zero-config, single file, handles concurrent reads |
| WebSocket | `ws` (native) | Full protocol control, no abstraction overhead |
| Auth hashing | `bcrypt` (cost 12) | Industry standard for password storage |
| Auth tokens | `jose` (JWT ES256) | Asymmetric keys — API verifies without secret exposure |
| ID generation | ULID (custom util) | Time-sortable, URL-safe, no integer enumeration |
| Input validation | Zod | Runtime validation with compile-time inference |
| 2FA | `otplib` (TOTP / RFC 6238) | Compatible with all standard authenticator apps |
| 2FA encryption | AES-256-GCM (Node crypto) | TOTP secrets encrypted at rest |
| Voice / Video | LiveKit (self-hosted WebRTC SFU) | Full media stack, no external cloud dependency |
| Web client | React 18 + Vite 5 + TypeScript | Fast builds, modern React patterns |
| State | Zustand | Minimal boilerplate, plays well with WS event updates |
| CSS | CSS custom properties + design tokens | Zero framework dependency, full design control |
| Push notifications | Web Push API + VAPID | Native browser notifications, no third party |
| Reverse proxy | Caddy | Auto TLS, WebSocket upgrade, one-line config |
| Container | Docker + docker-compose | Reproducible dev and production environments |

---

## 4. Command Stream Design System

Mercury's UI is built on the **Command Stream** design language — a fluid, keyboard-driven interface with zero persistent navigation chrome.

### Design Tokens

| Token | Value | Role |
|---|---|---|
| `--canvas` | `#000000` | Absolute black base canvas |
| `--surface` | `rgba(10,10,15,0.42)` | Translucent glass card surface |
| `--surface-border` | `rgba(180,100,255,0.18)` | Fuchsia-tinted glass edge |
| `--aurora-violet` | `rgba(140,60,255,0.10)` | Background glow field — violet |
| `--aurora-emerald` | `rgba(20,200,120,0.09)` | Background glow field — emerald |
| `--accent-fuchsia` | `#d946ef` | Primary interactive accent |
| `--accent-emerald` | `#10b981` | Secondary accent |
| `--accent-cyan` | `#06b6d4` | Tertiary accent |
| `--radius-pill` | `9999px` | Interactive pills |
| `--radius-card` | `24px` | Floating card structures |
| `--font-display` | `Space Grotesk` | Headers, labels, wide letter-spacing |
| `--font-mono` | `JetBrains Mono` | Metadata, shortcuts, timestamps |

### Layout Philosophy

There are no persistent sidebars, no column rails, no top navigation bars. The interface is a **fluid stream of glass cards floating over the absolute black canvas**. UI chrome surfaces exclusively via keyboard shortcut or contextual hover:

| Shortcut | Action |
|---|---|
| `⌘K` | Open Command Palette — fuzzy search across spaces, channels, actions |
| `⌘/` | Inline contextual action menu |
| `Escape` | Dismiss any overlay |
| `↑ / ↓` | Navigate Command Palette results |
| `Enter` | Confirm selection |

### Component Architecture

**`AuroraCanvas`** — Fixed `z-0` layer. Soft aurora glow fields (violet + emerald) sit behind all glass surfaces. Respects `prefers-reduced-motion` — freezes all animation when set.

**`GlassCard`** — Base surface primitive. `backdrop-filter: blur(12px)`, `rgba(10,10,15,0.42)` background, fuchsia-tinted `1px` border. Depth is achieved through aurora luminance, not drop shadows.

**`Pill`** — Capsule interactive element in three sizes (`sm`, `md`, `lg`). Fully circular border-radius. `active` state uses fuchsia accent background.

**`Avatar`** — 36px circular avatar with a presence-colored ring. Four presence states: `online` (emerald), `idle` (amber), `dnd` (rose), `offline` (grey).

**`Badge`** — Unread count pill. Renders nothing at zero. Caps at configurable `max` (default 99+).

**`CommandPalette`** — `⌘K` overlay with fuzzy search across spaces, channels, and actions. Full keyboard navigation (Arrow/Enter/Escape). Fuchsia-highlighted active row.

**`ToastManager`** — Non-blocking toast portal. Four variants: `success`, `error`, `info`, `warning`. Auto-dismiss with manual close. Mobile-adjusted positioning.

**`ErrorBoundary`** — React class boundary. Catches any unhandled render error. Never shows a blank screen — renders a recovery UI with "Try again" and "Reload page" actions.

### Accessibility

The full WCAG AA compliance layer lives in `accessibility.css` (imported last, highest specificity):

| Rule | WCAG Criterion |
|---|---|
| `:focus-visible` 2px accent ring on all interactive elements | 2.4.11 Focus Appearance |
| Skip-to-content link | 2.4.1 Bypass Blocks |
| `min-height/width: 44px` on all interactive targets | 2.5.5 Target Size |
| `prefers-reduced-motion` — freezes aurora + all CSS transitions | 2.3.3 Animation |
| `forced-colors` — glass surfaces fall back to system `Canvas` | 1.4.11 Non-text Contrast |
| `[aria-invalid]` — icon + border change, not color alone | 1.4.1 Use of Color |
| `.sr-only` screen reader utility class | 1.3.1 Info & Relationships |

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Browser/PWA │  │  Mobile PWA │  │  Desktop (future)│   │
│  │ React + Vite│  │             │  │                  │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│        │ HTTPS REST              │ WSS                     │
└────────┼─────────────────────────┼─────────────────────────┘
         │                         │
┌────────┴─────────────────────────┴─────────────────────────┐
│  CADDY  (TLS termination, HTTP→HTTPS, WS upgrade proxy)    │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
┌────────┴──────────────┐     ┌────────────────┴────────────┐
│  packages/api         │     │  packages/server            │
│  Fastify REST API     │     │  WebSocket Gateway          │
│  :4000                │     │  :4001                      │
│  Drizzle ORM          │     │  fan-out engine             │
└────────┬──────────────┘     └────────────────┬────────────┘
         │                                     │
         └──────────────┬──────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          │  SQLite (WAL mode)         │
          │  mercury.db               │
          └────────────────────────────┘
                        │ (voice/video only)
          ┌─────────────┴──────────────┐
          │  LiveKit SFU (self-hosted) │
          │  WebRTC media relay        │
          └────────────────────────────┘
```

**Key design decisions:**
- REST API (`packages/api`) handles all stateful mutations — create, update, delete
- WebSocket gateway (`packages/server`) handles real-time push only — never mutates state
- SQLite single-file database — no separate database server process to manage
- LiveKit handles all media — Mercury only generates the signed room token
- Caddy handles TLS — Mercury never touches certificates

---

## 6. Data Model

### Entity Relationships

```
User ──── owns ───────────────────── Space
     ──── member of (members) ──────► Space ──── has many ──► Channel
     ──── has many ────────────────── Session    Channel ──── has many ──► Message
     ──── has many ────────────────── Message             Message ──── has many ──► Reaction
     ──── member of (dm_members) ───► DM Channel          Message ──── has many ──► Attachment
```

### Schema

All IDs are ULIDs (26-char time-sortable string). All timestamps are ISO-8601 from SQLite `datetime('now')`.

```sql
CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,        -- bcrypt hash, cost 12
  avatar       TEXT,
  display_name TEXT,
  status       TEXT NOT NULL DEFAULT 'offline',  -- online|idle|offline
  is_admin     INTEGER NOT NULL DEFAULT 0,
  is_banned    INTEGER NOT NULL DEFAULT 0,
  totp_secret  TEXT,                 -- AES-256-GCM encrypted, NULL if 2FA off
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE totp_backup_codes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,          -- bcrypt hash of 8-char backup code
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,  -- ULID, rotated on every /refresh
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE spaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,
  owner_id    TEXT NOT NULL REFERENCES users(id),
  require_2fa INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE channels (
  id         TEXT PRIMARY KEY,
  space_id   TEXT REFERENCES spaces(id) ON DELETE CASCADE,  -- NULL for DMs
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text',  -- text|announcement|voice|dm
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
  role      TEXT NOT NULL DEFAULT 'member',  -- owner|admin|moderator|member
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

-- Performance indexes
CREATE INDEX idx_messages_channel ON messages(channel_id, id DESC);
CREATE INDEX idx_members_space    ON members(space_id);
CREATE INDEX idx_members_user     ON members(user_id);
CREATE INDEX idx_sessions_user    ON sessions(user_id);

-- Full-text search (FTS5)
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  message_id UNINDEXED
);
-- Populated by INSERT/UPDATE/DELETE triggers on messages table
```

---

## 7. API Reference

All routes are prefixed `/api/v1/`. All requests and responses are JSON.  
All errors return `{ "error": "description" }` with the correct HTTP status.  
All protected routes require `Authorization: Bearer <access_token>`.

### Auth — `/api/v1/auth`

| Method | Path | Auth | Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/register` | ✗ | `{ username, email, password }` | `{ user, access_token, refresh_token, expires_in }` | 409 if username/email taken |
| POST | `/login` | ✗ | `{ email, password }` | `{ user, access_token, refresh_token }` or `{ totp_required: true, totp_session }` | 401 bad creds; 429 after 10/min |
| POST | `/refresh` | ✗ | `{ refresh_token }` | `{ access_token, refresh_token, expires_in }` | Rotates token; 401 if expired |
| GET | `/me` | ✓ | — | `User` | Returns current user |
| POST | `/logout` | ✓ | `{ refresh_token }` | 204 | Deletes session, sets offline |
| POST | `/2fa/setup` | ✓ | — | `{ otpauth_url, backup_codes[] }` | Returns QR URI + 8 backup codes |
| POST | `/2fa/verify` | ✗ | `{ totp_session, code }` | `{ user, access_token, refresh_token }` | Exchanges TOTP code for full session |
| DELETE | `/2fa` | ✓ | `{ code }` | 204 | Requires current TOTP code to disable |

### Spaces — `/api/v1/spaces`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `Space[]` — spaces the caller is a member of |
| POST | `/` | `{ name }` | `Space` (201) + creates default #general channel + joins creator as owner |
| GET | `/:id` | — | `Space` or 404 |

### Channels — `/api/v1/spaces/:spaceId/channels`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `Channel[]` |
| POST | `/` | `{ name, type? }` | `Channel` (201) |

### Members — `/api/v1/spaces/:spaceId/members`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `Member[]` with username, avatar, status, role |
| DELETE | `/:userId` | — | 204 — kick (owner/admin only) |

### Invites

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/spaces/:spaceId/invites` | `{ max_uses?, expires_at? }` | `Invite` (201) |
| POST | `/api/v1/invites/:code/redeem` | — | `{ space, channels[] }` — joins space |

### Messages — `/api/v1/channels/:channelId/messages`

| Method | Path | Query | Body | Response |
|---|---|---|---|---|
| GET | `/` | `?before=<ulid>` | — | `Message[]` (50, ascending, cursor-paginated) |
| POST | `/` | — | `{ content }` | `Message` (201) + WS `MESSAGE_CREATE` fan-out |
| PATCH | `/:msgId` | — | `{ content }` | `Message` + WS `MESSAGE_UPDATE` |
| DELETE | `/:msgId` | — | — | 204 + WS `MESSAGE_DELETE` |

### Reactions — `/api/v1/channels/:channelId/messages/:msgId/reactions`

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/` | `{ emoji }` | 201 + WS `REACTION_ADD` |
| DELETE | `/:emoji` | — | 204 + WS `REACTION_REMOVE` |

### Direct Messages

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/dm` | `{ user_id }` | `Channel` — creates or returns existing DM |
| GET | `/api/v1/dm` | — | `Channel[]` — all DM channels for current user |
| GET | `/api/v1/dm/:channelId/messages` | — | `Message[]` |

### Uploads

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/upload` | `multipart/form-data { file }` | `{ url, filename, size, mime_type }` |

Files served statically from `/uploads/*`. Max size controlled by `UPLOAD_MAX_SIZE_MB`.

### Search

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/v1/search` | `?q=text&space_id=optional` | `Message[]` with match highlights |

### LiveKit

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/livekit/token` | `{ channel_id }` | `{ token, url }` |

### Admin — `/api/v1/admin` (requires `is_admin`)

| Method | Path | Notes |
|---|---|---|
| GET | `/users` | List all users |
| PATCH | `/users/:id` | Ban/unban, force logout, revoke 2FA |
| GET | `/spaces` | List all spaces |
| DELETE | `/spaces/:id` | Delete space |
| GET | `/invites` | List active invites |
| DELETE | `/invites/:code` | Revoke invite |
| GET | `/stats` | Users, messages, DB size, uptime, WS count |

---

## 8. WebSocket Protocol

**Endpoint:** `wss://your.domain/gateway`  
**Frame format:** `{ "op": "OPCODE", "d": { ...payload } }`

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
| S→C | `TYPING_INDICATOR` | `{ user_id, username, channel_id, clear_after }` | Show typing for `clear_after` ms |
| S→C | `MEMBER_JOIN` | `{ member: Member, space_id }` | User joined a space |
| S→C | `MEMBER_LEAVE` | `{ user_id, space_id }` | User left a space |
| S→C | `PRESENCE_UPDATE` | `{ user_id, status }` | online / idle / offline changed |
| S→C | `REACTION_ADD` | `{ message_id, user_id, emoji }` | Reaction added |
| S→C | `REACTION_REMOVE` | `{ message_id, user_id, emoji }` | Reaction removed |
| S→C | `DM_MESSAGE_CREATE` | `{ message: Message }` | New direct message |
| S→C | `SPACE_UPDATE` | `{ space: Space }` | Space name/icon changed |
| S→C | `CHANNEL_CREATE` | `{ channel: Channel }` | New channel created |
| S→C | `CHANNEL_DELETE` | `{ channel_id, space_id }` | Channel deleted |

### Connection Lifecycle

```
Client connects → wss://host/gateway
  │
  ├── Must send IDENTIFY within 5s
  │     { op: "IDENTIFY", d: { token: "<JWT>" } }
  │
  ├── Server verifies JWT, subscribes user to all their channels,
  │     sets status = 'online'
  │
  ├── Server sends READY
  │     { op: "READY", d: { user, session_id } }
  │
  ├── Normal operation
  │     Client PING every 30s → Server PONG
  │     Client TYPING_START → Server broadcasts TYPING_INDICATOR
  │     Server pushes all events to subscribed sockets
  │
  └── On close
        Unregisters socket. If no other sockets remain for user:
        Sets status = 'offline', unsubscribes from all channels.

If IDENTIFY not received within 5s:
  → INVALID_SESSION { reason: 'Identify timeout' }, close 4001

Reconnect backoff (client): 1s → 2s → 4s → 8s → 30s (max)
```

---

## 9. Authentication Flow

```
REGISTER
  POST /auth/register { username, email, password }
    └── validateBody (Zod)
    └── Check username/email uniqueness → 409 if taken
    └── bcrypt.hash(password, 12)
    └── INSERT user
    └── issueTokens(userId) → JWT access (15 min) + ULID refresh (7 days)
    └── 201 { user, access_token, refresh_token, expires_in: 900 }

LOGIN (no 2FA)
  POST /auth/login { email, password }
    └── loginRateCheck(ip) → 429 if >10/min
    └── SELECT user by email → 401 (same message as wrong password)
    └── bcrypt.compare(password, hash) → 401 if no match
    └── UPDATE status = 'online'
    └── issueTokens(userId)
    └── 200 { user, access_token, refresh_token }

LOGIN (2FA enabled)
  POST /auth/login
    └── [same checks as above]
    └── Issue short-lived totp_session JWT (5 min)
    └── 200 { totp_required: true, totp_session }
  POST /auth/2fa/verify { totp_session, code }
    └── Verify totp_session JWT
    └── Decrypt TOTP secret, otplib.verify(code, secret)
    └── On success → issueTokens(userId) → full session
    └── On fail → check backup codes → mark used if valid

TOKEN REFRESH
  POST /auth/refresh { refresh_token }
    └── SELECT session by refresh_token, check expires_at
    └── DELETE old session (rotation — one-time use)
    └── issueTokens(userId)
    └── 200 { access_token, refresh_token, expires_in: 900 }

PROTECTED ROUTE
  Authorization: Bearer <access_token>
    └── middleware/auth.ts: jose.jwtVerify(token)
    └── Attaches req.userId
    └── 401 on any failure — missing, invalid, or expired

  On 401: client calls POST /auth/refresh → retries once → redirects to /login on second 401
```

---

## 10. 2FA (TOTP) Flow

```
ENROLLMENT
  POST /auth/2fa/setup
    └── Generate 20-byte random secret
    └── AES-256-GCM encrypt with TOTP_SECRET env var
    └── Store encrypted secret (totp_enabled still 0)
    └── Generate 8 backup codes → bcrypt each → store hashes
    └── Return otpauth:// URI + plaintext backup codes (shown once)

  User scans QR code with authenticator app, then confirms:
  POST /auth/2fa/verify-setup { code }
    └── otplib.verify(code, decryptedSecret)
    └── On success: UPDATE users SET totp_enabled = 1

DISABLE
  DELETE /auth/2fa { code }
    └── Verify current TOTP code
    └── UPDATE users SET totp_secret = NULL, totp_enabled = 0
    └── DELETE FROM totp_backup_codes WHERE user_id = ?

ADMIN REVOKE
  PATCH /admin/users/:id { action: 'revoke_2fa' }
    └── Same as disable — no TOTP code required
```

---

## 11. Request Lifecycle

```
Incoming request
  │
  1. Caddy — TLS termination, HTTP→HTTPS redirect
  2. CORS middleware — origin must match CORS_ORIGIN exactly
  3. express.json() / Fastify body parser (limit: 64kb)
  4. rateLimiter — 60 req/min per IP → 429 + Retry-After
  5. Router match
  6. requireAuth (protected routes) — jose.jwtVerify, attaches req.userId
  7. validateBody (Zod) — 400 on schema failure
  8. Route handler — DB read/write via Drizzle ORM
  9. Response (JSON) + optional WS broadcast
```

---

## 12. Middleware Stack

**`auth.ts` — `requireAuth`**  
Extracts `Authorization: Bearer <token>`, calls `jose.jwtVerify`, attaches `req.userId`. Returns 401 on any failure — missing, malformed, expired. Never calls `next()` on failure.

**`rateLimit.ts` — `rateLimiter`**  
In-memory per-IP rate limiter. 60 requests per 60-second window globally. Separate stricter limiter in `auth.ts` for login: 10 per minute per IP. Returns 429 with `Retry-After` header.

**`validate.ts` — Zod validation**  
Applied to all mutating routes. Zod schema inferred to TypeScript type. Returns 400 `{ error: "field: reason" }` on first failure.

**`ssrf.ts` — SSRF guard**  
Used before any outbound URL fetch. Blocks private IP ranges (`10.x`, `172.16-31.x`, `192.168.x`, `127.x`, `::1`). Blocks `file://` and `ftp://` schemes. Returns 400 if URL resolves to a blocked address.

**`cors.ts`**  
Origin locked to `CORS_ORIGIN` env var. `credentials: true` to allow cookies. Preflight handled automatically.

**`admin.ts` — `requireAdmin`**  
Checks `users.is_admin = 1` for `req.userId`. Returns 403 if not admin. Applied to all `/api/v1/admin/*` routes.

---

## 13. Real-Time Fan-Out

```
gateway/events.ts maintains two in-memory maps:

  userSockets        Map<userId, Set<WebSocket>>
    └─ One user can have multiple open sockets (tabs, devices)

  channelSubscribers Map<channelId, Set<userId>>
    └─ All users currently subscribed to a channel

On IDENTIFY:
  1. Query: SELECT all channel IDs for spaces the user belongs to
  2. subscribeToChannels(userId, channelIds)
  3. registerSocket(userId, ws)

On POST /channels/:id/messages:
  1. INSERT message
  2. broadcast(channelId, { op: MESSAGE_CREATE, d: { message } })
  3. broadcast():
     a. Gets Set<userId> from channelSubscribers[channelId]
     b. For each userId, gets Set<WebSocket> from userSockets[userId]
     c. Sends JSON to every socket with readyState === OPEN

Multi-tab / multi-device:
  - Same user in two tabs = two entries in userSockets[userId]
  - Both receive the event
  - Client deduplicates by message.id

On disconnect:
  1. unregisterSocket(userId, ws)
  2. If userSockets[userId] is now empty:
     a. UPDATE users SET status = 'offline'
     b. unsubscribeAll(userId)
     c. Broadcast PRESENCE_UPDATE to all affected channels
```

---

## 14. Web Client Architecture

### State Stores (Zustand)

```
authStore      { user, access_token, refresh_token, isAuthenticated }
spaceStore     { spaces[], activeSpaceId }
channelStore   { channels[], activeChannelId }
messageStore   { messages: Map<channelId, Message[]> }
presenceStore  { status: Map<userId, PresenceStatus> }
dmStore        { dmChannels[] }
uiStore        { commandBarOpen, activeMobileTab, activeChannelType, toastQueue, activeModal }
themeStore     { auroraEnabled }   ← persisted to localStorage
```

### `api.ts` — Typed Fetch Wrapper

```
api.get<T>(path)        → Promise<T>
api.post<T>(path, body) → Promise<T>
api.patch<T>(path, body)
api.delete(path)

Every call:
  1. Attach Authorization: Bearer <access_token>
  2. On 401: call POST /auth/refresh, retry request once
  3. On second 401: clear auth store, redirect to /login
```

### `ws.ts` — WebSocket Client

```
connect(token):
  1. new WebSocket(WS_URL)
  2. On open: send IDENTIFY { token }
  3. On READY: update authStore with session_id
  4. On message: dispatch to relevant store by op code
  5. Start PING interval (30s)
  6. On close: clear interval, start reconnect backoff

Reconnect backoff: 1s → 2s → 4s → 8s → 30s (max)
```

### Route Structure

```
App
 └── Router
     ├── /                   → redirect to /app or /login
     ├── /login              → Login.tsx
     ├── /register           → Register.tsx
     ├── /2fa                → TwoFactor.tsx
     ├── /onboarding         → Onboarding.tsx (3-step wizard)
     ├── /invite/:code       → InviteAcceptPage.tsx
     └── /app/*              → AppShell.tsx (protected)
         ├── AuroraCanvas    (fixed z-0 background)
         ├── CommandBar      (⌘K pill)
         ├── CommandPalette  (overlay, portalled)
         ├── ToastManager    (portal)
         ├── ErrorBoundary
         ├── SpaceRail       (desktop)
         ├── MobileNav       (mobile, fixed bottom)
         └── ContentStream
             ├── ChannelSidebar
             ├── ChatArea / VoiceArea
             └── MemberList
```

---

## 15. Infrastructure & Security

### Four-Layer Security Model

```
Layer 1 — Host
  ufw: allow 22, 80, 443 only
  SSH: key-only (PasswordAuthentication no)
  fail2ban: monitors SSH + Caddy access logs
  unattended-upgrades: automatic OS security patches

Layer 2 — TLS (Caddy)
  Auto Let's Encrypt certificate
  HTTP → HTTPS redirect
  WebSocket upgrade proxied transparently
  Caddyfile:
    your.domain.com {
      reverse_proxy localhost:4000
    }

Layer 3 — Application
  CSP headers set in nginx / Caddy
  CORS locked to CORS_ORIGIN env var
  Server refuses to start without JWT_SECRET, TOTP_SECRET
  Rate limiting before auth on all routes
  Zod validation on all mutating routes
  SSRF guard on all outbound fetches
  bcrypt passwords, rotating JWT sessions, TOTP 2FA

Layer 4 — Optional: WireGuard VPN
  Mercury on a private network, accessible only to authorised devices
  ufw: allow all from 10.0.0.0/24 (WireGuard subnet)
  Mercury listens on WireGuard interface only
```

### Infrastructure Checklist

```
[ ]  ufw: allow 22, 80, 443 → enable
[ ]  /etc/ssh/sshd_config: PasswordAuthentication no
[ ]  apt install fail2ban — configure jail.local
[ ]  apt install unattended-upgrades → dpkg-reconfigure
[ ]  Install Caddy, deploy Caddyfile, systemctl enable caddy
[ ]  (Optional) WireGuard wg0 config
[ ]  Daily SQLite backup: cp mercury.db /backup/mercury-$(date +%F).db
[ ]  Off-site sync: rclone or rsync to remote
```

---

## 16. CI / CD Pipeline

### Quality Gate — `ci.yml`

Triggers on every push to `main` and every pull request. Five parallel jobs:

| Job | What it checks |
|---|---|
| `lint` | ESLint across `@mercury/web` and `@mercury/shared` |
| `typecheck` | `tsc --noEmit` across all four packages |
| `test-web` | Vitest + jsdom — coverage thresholds: branches 70%, functions 75%, lines 80% |
| `test-api` | Vitest integration tests against a `postgres:16-alpine` service container |
| `build-web` | Vite production build — PR cannot merge if this fails |

All five jobs are required status checks on `main`. A PR cannot be merged if any one fails.

### Dependency Updates — `dependabot.yml`

Weekly on Mondays at 08:00 UTC. Six ecosystems covered:

| Ecosystem | Directory | Strategy |
|---|---|---|
| GitHub Actions | `/` | Group minor + patch |
| Root tooling | `/` | Group minor + patch; lock `typescript`, `turbo` majors |
| Web | `/packages/web` | Group React ecosystem together; lock React, Vite, Router majors |
| API | `/packages/api` | Group Drizzle ORM + Kit together; lock Fastify, `jose` majors |
| Server | `/packages/server` | Group minor + patch; lock `ws` major |
| Shared | `/packages/shared` | Group minor + patch |

### Release Pipeline — `release.yml` + `tag-release.yml`

```
[Actions → Tag Release → Run workflow]
  Input: version (e.g. 1.0.0-beta.1)  |  confirm: yes
  │
  ├── Validate semver
  ├── Check tag doesn't already exist
  ├── Bump root package.json version
  ├── Commit + create annotated git tag
  └── git push --follow-tags
        │
        ▼  (triggers automatically)
  release.yml
    ├── validate-tag   (parse semver, detect prerelease suffix)
    ├── build          (shared → api → server → web → tarballs → changelog)
    └── release        (create GitHub Release, attach assets)
```

**Changelog** is generated from conventional commits since the previous tag — `feat` → ✨ Features, `fix` → 🐛 Bug Fixes, `perf` → ⚡ Performance, `chore(deps)` → 📦 Dependencies.

**Release assets attached:**
- `web-dist.tar.gz` — Vite production build
- `api-dist.tar.gz` — compiled API
- `server-dist.tar.gz` — compiled WebSocket server

**Tag channel detection:**

| Tag | Channel | GitHub Release |
|---|---|---|
| `v1.0.0` | `latest` | `make_latest: true` |
| `v1.0.0-beta.1` | `prerelease` | `prerelease: true` |
| `v1.0.0-alpha.1` | `prerelease` | `prerelease: true` |
| `v1.0.0-rc.1` | `prerelease` | `prerelease: true` |

---

## 17. Environment Variables

All variables required unless marked optional. The server refuses to start if required variables are missing.

```bash
# .env.example

# ─── Required ─────────────────────────────────────────────────────
JWT_SECRET=         # 32+ random bytes, base64. Signs all JWT access tokens.
TOTP_SECRET=        # 32 random bytes, base64. AES-256-GCM key for TOTP secrets.
CONTROL_SECRET=     # 32+ random bytes. HMAC key for webhook signature verification.
CORS_ORIGIN=        # Exact allowed origin, e.g. https://chat.example.com

# ─── Server ───────────────────────────────────────────────────────
PORT=4000
DB_PATH=./data/mercury.db

# ─── LiveKit (required for voice/video) ───────────────────────────
LIVEKIT_URL=        # wss://your-livekit-server
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# ─── Uploads ──────────────────────────────────────────────────────
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE_MB=25

# ─── Web Push (browser push notifications) ────────────────────────
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com

# ─── Web client — Vite build-time ─────────────────────────────────
VITE_API_URL=https://chat.example.com/api/v1
VITE_WS_URL=wss://chat.example.com/gateway
VITE_APP_VERSION=   # injected automatically by release pipeline
```

### Generate secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Run once for JWT_SECRET, once for TOTP_SECRET, once for CONTROL_SECRET

# Generate VAPID keys
npx web-push generate-vapid-keys
```

---

## 18. Definition of Done

Mercury v1.0.0 ships when every box is checked.

**Core**
- [x] Register, login, persistent sessions across browser restarts
- [x] TOTP 2FA — enroll, use at login, disable by user, revoke by admin
- [x] Create a space, create channels, invite another user via code
- [x] Two tabs in the same channel see each other's messages in real time
- [x] Message edit and delete propagate via WebSocket
- [x] Reaction badges (pure SVG icons and typography; zero raw emojis) — add, remove, live update
- [x] File and image uploads — inline preview, progress bar, persists across restarts
- [x] Direct messages between users
- [x] Voice channel connects via LiveKit
- [x] Typing indicator fires and clears correctly
- [x] Presence shows online / offline correctly
- [x] Message history cursor-paginated on channel select
- [x] Full-text search returns relevant results
- [x] Browser push notifications — permission prompt, receive while backgrounded
- [x] Admin UI — ban users, manage spaces, revoke 2FA, view stats

**Quality**
- [ ] All API routes return correct HTTP status codes
- [ ] Server refuses to start without `JWT_SECRET` and `TOTP_SECRET`
- [ ] Rate limiting returns 429 + `Retry-After` for >60 req/min
- [ ] CI passes: lint, typecheck, tests, build — all green
- [ ] Coverage: branches ≥70%, functions ≥75%, lines ≥80%
- [ ] WCAG AA — all interactive elements keyboard accessible, focus-visible rings present

**Client**
- [ ] PWA installable from Chrome and Safari
- [ ] Onboarding wizard shown to first-time users

**Infrastructure**
- [ ] All traffic over TLS — no plaintext HTTP in production
- [ ] Host firewall: only ports 80, 443, 22 open externally
- [ ] Daily SQLite backup running with off-site sync

---

## 19. Quick Start

### Development

```bash
git clone https://github.com/ShadowWalkerNC/Mercury
cd Mercury
cp .env.example .env
# Edit .env — set JWT_SECRET, TOTP_SECRET, CONTROL_SECRET, CORS_ORIGIN
npm install
npm run dev
# API:    http://localhost:4000
# Web:    http://localhost:5173
```

### Production (Docker)

```bash
cp .env.example .env   # fill all values
docker-compose up -d
```

### Cloud & Serverless Deployment Constraints

> [!WARNING]
> **Do NOT deploy the Backend (`@mercury/server` or API) to Vercel or Netlify.**
> Vercel and Netlify use ephemeral, stateless Serverless Functions (AWS Lambda). They are **not compatible** with the Mercury backend due to:
> 1. **WebSockets (Stateful Connections)**: The gateway requires a persistent TCP connection to coordinate real-time updates. Serverless functions spin down after 10–60 seconds, which disconnects WebSocket clients.
> 2. **Local SQLite storage**: `better-sqlite3` writes to a local SQLite file (`./data/mercury.db`). Ephemeral file systems discard this database whenever containers scale down or deploy.
> 3. **Monorepo Build**: Monorepo workspace linking (`@mercury/shared`) can cause compilation issues on standard single-target hosts.

#### Recommended Architecture:

* **Frontend Web Client (`packages/web`)**: 
  * Can be hosted on **Vercel, Netlify, or Cloudflare Pages** as a static single-page app (SPA).
  * Root directory: `packages/web`
  * Build command: `npm run build`
  * Output directory: `dist`
  * Environment variable: `VITE_API_URL` pointing to your hosted API server, and `VITE_WS_URL` pointing to your hosted WebSocket gateway.

* **Backend API & Gateway (`packages/server` & `@mercury/shared`)**:
  * Host on **Railway, Render, Fly.io**, or any standard Virtual Private Server (VPS) (e.g. DigitalOcean, Hetzner).
  * **Requirements**: Enable a **Persistent Disk/Volume** (e.g., 1GB mounted at `/app/packages/server/data` or wherever the server database resides) and point the `DB_PATH` there to prevent database loss on container restarts. Ensure ports are exposed for both HTTPS and WebSocket connections.

### Production (bare metal)

```bash
npm run build
node packages/api/dist/index.js &
node packages/server/dist/index.js &
```

Place `Caddyfile.example` at `/etc/caddy/Caddyfile`, update the domain, restart Caddy.

### Ship a Release

```
Actions → Tag Release → Run workflow
  version: 1.0.0-beta.1
  confirm: yes
```

The full pipeline runs automatically — builds all packages, generates changelog, creates GitHub Release, attaches distribution tarballs.

---

*Mercury — ShadowWalkerNC — July 2026*
