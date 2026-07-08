import express, { type Express } from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { CORS_ORIGIN, UPLOAD_DIR } from './config.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { spacesRouter } from './routes/spaces.js';
import { channelsRouter } from './routes/channels.js';
import { membersRouter } from './routes/members.js';
import { invitesRouter, inviteSpaceRouter } from './routes/invites.js';
import { messagesRouter } from './routes/messages.js';
import { reactionsRouter } from './routes/reactions.js';
import { uploadsRouter } from './routes/uploads.js';

export function buildApp(): Express {
  const app = express();

  // Ensure upload directory exists before static middleware tries to serve it
  mkdirSync(UPLOAD_DIR, { recursive: true });

  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimiter);

  // Static file serving — /uploads/* served directly from disk.
  // In production Caddy can serve these instead for better performance,
  // but Express handles it fine for self-hosted scale.
  app.use('/uploads', express.static(resolve(UPLOAD_DIR)));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  app.use('/api/v1/auth',                                              authRouter);
  app.use('/api/v1/spaces',                                            spacesRouter);
  app.use('/api/v1/spaces/:spaceId/channels',                          channelsRouter);
  app.use('/api/v1/spaces/:spaceId/members',                           membersRouter);
  app.use('/api/v1/spaces/:spaceId/invites',                           inviteSpaceRouter);
  app.use('/api/v1/invites',                                           invitesRouter);
  app.use('/api/v1/channels/:channelId/messages',                      messagesRouter);
  app.use('/api/v1/channels/:channelId/messages/:msgId/reactions',     reactionsRouter);
  app.use('/api/v1/upload',                                            uploadsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
