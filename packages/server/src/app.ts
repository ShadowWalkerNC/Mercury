import express, { type Express } from 'express';
import cors from 'cors';
import { resolve, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
import { searchRouter } from './routes/search.js';
import { dmRouter } from './routes/dm.js';
import { livekitRouter } from './routes/livekit.js';
import { adminRouter } from './routes/admin.js';
import { totpRouter } from './routes/totp.js';
import { usersRouter } from './routes/users.js';
import { pushRouter } from './routes/push.js';

export function buildApp(): Express {
  const app = express();
  mkdirSync(UPLOAD_DIR, { recursive: true });
  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimiter);
  app.use('/uploads', express.static(resolve(UPLOAD_DIR)));
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  app.use('/api/v1/auth',         authRouter);
  app.use('/api/v1/auth/2fa',     totpRouter);
  app.use('/api/v1/users',        usersRouter);
  app.use('/api/v1/spaces',       spacesRouter);
  app.use('/api/v1/spaces/:spaceId/channels',                          channelsRouter);
  app.use('/api/v1/spaces/:spaceId/members',                           membersRouter);
  app.use('/api/v1/spaces/:spaceId/invites',                           inviteSpaceRouter);
  app.use('/api/v1/invites',      invitesRouter);
  app.use('/api/v1/channels/:channelId/messages',                      messagesRouter);
  app.use('/api/v1/channels/:channelId/messages/:msgId/reactions',     reactionsRouter);
  app.use('/api/v1/upload',       uploadsRouter);
  app.use('/api/v1/uploads',      uploadsRouter);
  app.use('/api/v1/search',       searchRouter);
  app.use('/api/v1/dm',           dmRouter);
  app.use('/api/v1/dms',          dmRouter);
  app.use('/api/v1/push',         pushRouter);
  app.use('/api/v1/livekit',      livekitRouter);
  app.use('/api/v1/admin',        adminRouter);

  // Serve frontend SPA built files in production if built
  const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
  const WEB_DIST = resolve(__dirname, '../../web/dist');
  
  if (existsSync(WEB_DIST)) {
    console.log(`[app] Found web client assets at ${WEB_DIST}. Serving UI.`);
    app.use(express.static(WEB_DIST));
    // Wildcard route to let React Router handle routing in frontend SPA
    app.get('*', (req, res, next) => {
      // Skip API routes so they can return 404 instead of serving index.html
      if (req.path.startsWith('/api/v1/')) {
        return next();
      }
      res.sendFile(resolve(WEB_DIST, 'index.html'));
    });
  } else {
    console.log(`[app] No web client assets found at ${WEB_DIST}. Operating in API-only mode.`);
  }

  app.use((_req, res) => res.status(404).json({ error: 'Not found', code: 'ERR_NOT_FOUND' }));

  // Global error handler — catches unhandled sync/async route exceptions
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[error] Unhandled exception:', err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Internal Server Error',
      code: err.code || 'ERR_INTERNAL_SERVER',
    });
  });

  return app;
}
