import express, { type Express } from 'express';
import cors from 'cors';
import { CORS_ORIGIN } from './config.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { spacesRouter } from './routes/spaces.js';
import { channelsRouter } from './routes/channels.js';
import { membersRouter } from './routes/members.js';
import { invitesRouter, inviteSpaceRouter } from './routes/invites.js';

export function buildApp(): Express {
  const app = express();

  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimiter);

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // ── API v1 ─────────────────────────────────────────────────────────────────
  app.use('/api/v1/auth',                           authRouter);
  app.use('/api/v1/spaces',                          spacesRouter);
  app.use('/api/v1/spaces/:spaceId/channels',        channelsRouter);
  app.use('/api/v1/spaces/:spaceId/members',         membersRouter);
  app.use('/api/v1/spaces/:spaceId/invites',         inviteSpaceRouter);
  app.use('/api/v1/invites',                         invitesRouter);

  // Phase 3+ routes:
  // app.use('/api/v1/channels/:channelId/messages', messagesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
