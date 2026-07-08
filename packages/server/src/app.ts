import express, { type Express } from 'express';
import cors from 'cors';
import { CORS_ORIGIN } from './config.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';

export function buildApp(): Express {
  const app = express();

  // ── Security middleware ────────────────────────────────────────────────────
  app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimiter);

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // ── API v1 ─────────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);

  // Phase 2+ routes mounted here:
  // app.use('/api/v1/spaces', spacesRouter);
  // app.use('/api/v1/channels', channelsRouter);
  // app.use('/api/v1/messages', messagesRouter);
  // app.use('/api/v1/members', membersRouter);
  // app.use('/api/v1/invites', invitesRouter);

  // ── 404 fallback ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
