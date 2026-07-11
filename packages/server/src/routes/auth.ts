import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { JWT_SECRET } from '../index.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  LOGIN_RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from '@mercury/shared';
import type { User, AuthTokens } from '@mercury/shared';

export const authRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function issueTokens(userId: string): AuthTokens {
  const access_token = jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
  const refresh_token = ulid();
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000
  ).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(ulid(), userId, refresh_token, expiresAt);

  return {
    access_token,
    refresh_token,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
  };
}

function safeUser(row: Record<string, unknown>): User {
  return {
    id: row['id'] as string,
    username: row['username'] as string,
    email: row['email'] as string,
    avatar: (row['avatar'] as string | null) ?? null,
    status: (row['status'] as User['status']) ?? 'offline',
    created_at: row['created_at'] as string,
    display_name: (row['display_name'] as string | null) ?? null,
  };
}

// ─── Per-IP login rate limiter (tighter: 10/min) ──────────────────────────────

const loginRateMap = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginRateMap) if (v.resetAt < now) loginRateMap.delete(k);
}, 60_000).unref();

function loginRateCheck(ip: string): boolean {
  const now = Date.now();
  const entry = loginRateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    loginRateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_RATE_LIMIT_MAX;
}

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────

authRouter.post(
  '/register',
  validateBody({
    username: { type: 'string', min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH },
    email:    { type: 'string', min: 3, max: 254 },
    password: { type: 'string', min: PASSWORD_MIN_LENGTH, max: 128 },
  }),
  async (req, res) => {
    const { username, email, password } = req.body as {
      username: string;
      email: string;
      password: string;
    };

    const existing = db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username, email);

    if (existing) {
      res.status(409).json({ error: 'Username or email already taken' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const id = ulid();

    db.prepare(`
      INSERT INTO users (id, username, email, password)
      VALUES (?, ?, ?, ?)
    `).run(id, username, email, hash);

    const tokens = issueTokens(id);
    const user = safeUser(
      db.prepare('SELECT id, username, email, avatar, status, created_at FROM users WHERE id = ?').get(id) as Record<string, unknown>
    );

    res.status(201).json({ user, ...tokens });
  }
);

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

authRouter.post(
  '/login',
  validateBody({
    email:    { type: 'string', min: 1, max: 254 },
    password: { type: 'string', min: 1, max: 128 },
  }),
  async (req, res) => {
    const ip = req.ip ?? '0.0.0.0';
    if (!loginRateCheck(ip)) {
      res.status(429).json({ error: 'Too many login attempts' });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };

    const row = db.prepare(
      'SELECT id, username, email, avatar, status, created_at, password FROM users WHERE email = ?'
    ).get(email) as (Record<string, unknown> & { password: string }) | undefined;

    if (!row) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, row['password'] as string);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update presence to online
    db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(row['id']);

    const tokens = issueTokens(row['id'] as string);
    const user = safeUser({ ...row, status: 'online' });

    res.json({ user, ...tokens });
  }
);

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────

authRouter.post(
  '/refresh',
  validateBody({ refresh_token: { type: 'string', min: 1, max: 128 } }),
  (req, res) => {
    const { refresh_token } = req.body as { refresh_token: string };

    const session = db.prepare(`
      SELECT id, user_id, expires_at FROM sessions
      WHERE refresh_token = ?
    `).get(refresh_token) as { id: string; user_id: string; expires_at: string } | undefined;

    if (!session || new Date(session.expires_at) < new Date()) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Rotate: delete old session, issue new tokens
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    const tokens = issueTokens(session.user_id);

    res.json(tokens);
  }
);

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  const row = db.prepare(
    'SELECT id, username, email, avatar, status, created_at FROM users WHERE id = ?'
  ).get(req.userId) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  res.json(safeUser(row));
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

authRouter.post(
  '/logout',
  requireAuth,
  validateBody({ refresh_token: { type: 'string', min: 1, max: 128 } }),
  (req: AuthRequest, res) => {
    const { refresh_token } = req.body as { refresh_token: string };

    db.prepare(
      'DELETE FROM sessions WHERE user_id = ? AND refresh_token = ?'
    ).run(req.userId, refresh_token);

    db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(req.userId);

    res.status(204).send();
  }
);
