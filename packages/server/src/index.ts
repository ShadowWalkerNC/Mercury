/**
 * Mercury server entry point.
 * Validates required secrets, then starts Express + WebSocket gateway.
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Load Environment Variables from .env ─────────────────────────────────────
const paths = [
  join(process.cwd(), '.env'),
  join(process.cwd(), 'packages', 'server', '.env'),
  join(process.cwd(), '..', '..', '.env'),
];

for (const path of paths) {
  if (existsSync(path)) {
    try {
      const content = readFileSync(path, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
      break;
    } catch (e) {
      console.warn(`[boot] Failed to load .env at ${path}:`, e);
    }
  }
}

// ─── Hard-fail on missing or weak secrets ──────────────────────────────────────
const REQUIRED = ['JWT_SECRET', 'CONTROL_SECRET', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'] as const;
const errors: string[] = [];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    errors.push(`- ${key} is not set.`);
  }
}

if (process.env['JWT_SECRET'] && process.env['JWT_SECRET'].length < 32) {
  errors.push(`- JWT_SECRET is too short (${process.env['JWT_SECRET'].length} chars). It must be at least 32 characters long for security.`);
}

if (errors.length > 0) {
  console.error("===============================================================================");
  console.error("[boot] FATAL: Server configuration verification failed.");
  errors.forEach(err => console.error(err));
  console.error("Please configure the environment variables correctly and try again.");
  console.error("===============================================================================");
  process.exit(1);
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
