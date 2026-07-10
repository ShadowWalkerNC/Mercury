/**
 * cors.ts — configures the cors middleware from the ALLOWED_ORIGINS env var.
 *
 * ALLOWED_ORIGINS is a comma-separated list of allowed origins.
 * Example: http://localhost:5173,https://mercury.example.com
 *
 * In development (NODE_ENV !== production) all origins are allowed when
 * ALLOWED_ORIGINS is not set, so local dev keeps working out of the box.
 */
import corsMiddleware from 'cors';

const raw  = process.env.ALLOWED_ORIGINS ?? '';
const list = raw.split(',').map(s => s.trim()).filter(Boolean);
const isDev = process.env.NODE_ENV !== 'production';

export const cors = corsMiddleware({
  origin: (origin, callback) => {
    if (!origin)                          return callback(null, true); // server-to-server
    if (isDev && list.length === 0)       return callback(null, true); // dev free-pass
    if (list.includes(origin))            return callback(null, true); // allow-list hit
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge:         86400,
});
