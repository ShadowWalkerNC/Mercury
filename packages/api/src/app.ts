/**
 * app.ts — Express application factory.
 */
import express from 'express';
import helmet  from 'helmet';
import { cors } from './lib/cors';
import { authRouter }     from './routes/auth';
import { spacesRouter }   from './routes/spaces';
import { channelsRouter } from './routes/channels';
import { messagesRouter } from './routes/messages';
import { usersRouter }    from './routes/users';
import { dmsRouter }      from './routes/dms';
import { pushRouter }     from './routes/push';
import { uploadsRouter }  from './routes/uploads';

export const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSP handled by nginx in prod
app.use(cors);
app.options('*', cors);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api/v1/auth',     authRouter);
app.use('/api/v1/spaces',   spacesRouter);
app.use('/api/v1/channels', channelsRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/users',    usersRouter);
app.use('/api/v1/dms',      dmsRouter);
app.use('/api/v1/push',     pushRouter);
app.use('/api/v1/uploads',  uploadsRouter);

app.get('/api/v1/health', (_req, res) => res.json({ ok: true }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message.startsWith('CORS:')) {
    res.status(403).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
