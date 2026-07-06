# Mercury

Self-hosted communication platform. Spaces, channels, real-time messaging, web-first.

> **Status:** Active development — pre-alpha. Not ready for use.

## Architecture

See [`MERCURY.md`](https://github.com/ShadowWalkerNC/Sigil/blob/main/MERCURY.md) in the Sigil repo for the full requirements document.

## Monorepo layout

```
packages/
  shared/   — TypeScript types, WS protocol constants
  server/   — Express + better-sqlite3 + ws gateway
  web/      — Vite + TypeScript client
```

## Quick start (development)

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET and CONTROL_SECRET
npm install
npm run dev
```

Server runs on `http://localhost:4000`  
Web client runs on `http://localhost:5173`

## Build sequence

| Phase | Target |
|-------|--------|
| 0 | Monorepo scaffold ← **here** |
| 1 | Auth (register, login, JWT, refresh, logout) |
| 2 | Spaces, channels, members, invites |
| 3 | Messaging + WebSocket gateway |
| 4 | Web client |

## Requirements

- Node 20+
- npm 10+
