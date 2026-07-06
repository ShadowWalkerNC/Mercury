/**
 * Mercury server entry point.
 * Validates required secrets, then starts Express + WebSocket gateway.
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

// ─── Hard-fail on missing secrets ─────────────────────────────────────────────
const REQUIRED = ['JWT_SECRET', 'CONTROL_SECRET'] as const;
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[boot] FATAL: ${key} is not set. Refusing to start.`);
    process.exit(1);
  }
}

export const JWT_SECRET = process.env['JWT_SECRET'] as string;
export const CONTROL_SECRET = process.env['CONTROL_SECRET'] as string;

// Warm the comparison buffer now so the first request isn't slower
const _controlBuf = Buffer.from(CONTROL_SECRET);
export function verifyControlSecret(provided: string): boolean {
  const buf = Buffer.from(provided);
  if (buf.length !== _controlBuf.length) return false;
  return timingSafeEqual(buf, _controlBuf);
}

import { PORT, HOST } from './config.js';
import { buildApp } from './app.js';
import { initGateway } from './gateway/index.js';

const app = buildApp();
const httpServer = createServer(app);
initGateway(httpServer);

httpServer.listen(PORT, HOST, () => {
  console.log(`[boot] Mercury server listening on http://${HOST}:${PORT}`);
});
