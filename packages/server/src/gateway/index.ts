import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
import { exec } from 'node:child_process';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET } from '../index.js';
import {
  WSOp,
  WS_IDENTIFY_TIMEOUT_MS,
  TYPING_CLEAR_MS,
} from '@mercury/shared';
import type { WSPayload, IdentifyPayload, ReadyPayload } from '@mercury/shared';
import { logger } from '../utils/logger.js';
import {
  userSockets,
  registerSocket,
  unregisterSocket,
  subscribeToChannels,
  unsubscribeAll,
  broadcast,
} from './events.js';
import { startHeartbeat } from './heartbeat.js';

export function initGateway(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/gateway' });
  startHeartbeat(wss);

  wss.on('connection', (ws: WebSocket) => {
    const w = ws as WebSocket & { isAlive?: boolean; userId?: string };
    w.isAlive = true;

    w.on('pong', () => { w.isAlive = true; });

    let identified = false;

    const identifyTimer = setTimeout(() => {
      if (!identified) {
        send({ op: WSOp.INVALID_SESSION, d: { reason: 'Identify timeout' } });
        w.close(4001, 'Identify timeout');
      }
    }, WS_IDENTIFY_TIMEOUT_MS);

    function send(payload: WSPayload): void {
      if (w.readyState === 1) w.send(JSON.stringify(payload));
    }

    w.on('message', (raw) => {
      let payload: WSPayload;
      try {
        payload = JSON.parse(raw.toString()) as WSPayload;
      } catch {
        w.close(4000, 'Invalid JSON');
        return;
      }

      // ── IDENTIFY ──────────────────────────────────────────────────────────────
      if (payload.op === WSOp.IDENTIFY) {
        const { token } = payload.d as IdentifyPayload;
        let userId: string;

        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
          userId = decoded.sub;
        } catch {
          send({ op: WSOp.INVALID_SESSION, d: { reason: 'Invalid token' } });
          w.close(4001, 'Invalid token');
          return;
        }

        const user = db.prepare(
          'SELECT id, username, email, avatar, status, created_at FROM users WHERE id = ?'
        ).get(userId);

        if (!user) {
          send({ op: WSOp.INVALID_SESSION, d: { reason: 'User not found' } });
          w.close(4001, 'User not found');
          return;
        }

        db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(userId);

        // Subscribe to space channels
        const spaceChannels = db.prepare(`
          SELECT c.id FROM channels c
          INNER JOIN members m ON m.space_id = c.space_id
          WHERE m.user_id = ?
        `).all(userId) as { id: string }[];

        // Subscribe to DM channels
        const dmChannels = db.prepare(`
          SELECT channel_id AS id FROM dm_members WHERE user_id = ?
        `).all(userId) as { id: string }[];

        const channelIds = [
          ...spaceChannels.map(c => c.id),
          ...dmChannels.map(c => c.id),
        ];

        subscribeToChannels(userId, channelIds);
        registerSocket(userId, w);

        const presencePayload = {
          op: WSOp.PRESENCE_UPDATE,
          d: { user_id: userId, status: 'online' },
        };
        channelIds.forEach(cid => broadcast(cid, presencePayload));

        clearTimeout(identifyTimer);
        identified = true;
        w.userId = userId;

        const sessionId = `${userId}-${Date.now()}`;
        const ready: ReadyPayload = { user: user as never, session_id: sessionId };
        send({ op: WSOp.READY, d: ready });
        logger.info('[gateway] READY sent', { userId });
        return;
      }

      if (!identified) {
        send({ op: WSOp.INVALID_SESSION, d: { reason: 'Not identified' } });
        return;
      }

      // ── PING ───────────────────────────────────────────────────────────────────
      if (payload.op === WSOp.PING) {
        send({ op: WSOp.PONG, d: {} });
        return;
      }

      // ── TYPING_START ───────────────────────────────────────────────────────────
      if (payload.op === WSOp.TYPING_START) {
        const { channel_id } = payload.d as { channel_id: string };
        const user = db.prepare(
          'SELECT username FROM users WHERE id = ?'
        ).get(w.userId) as { username: string } | undefined;

        if (!user) return;

        broadcast(channel_id, {
          op: WSOp.TYPING_INDICATOR,
          d: {
            user_id: w.userId,
            username: user.username,
            channel_id,
            timestamp: Date.now(),
            clear_after: TYPING_CLEAR_MS,
          },
        });
        return;
      }

      // ── TERMINAL_EXEC (Admin Shell) ──────────────────────────────────────────
      if (payload.op === WSOp.TERMINAL_EXEC) {
        if (!w.userId) return;

        const adminUser = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(w.userId) as { is_admin: number } | undefined;
        if (!adminUser || !adminUser.is_admin) {
          send({
            op: WSOp.TERMINAL_DATA,
            d: { command: '', output: 'Error: Permission Denied. Operator privileges (is_admin=1) required.', exit_code: 1 },
          });
          return;
        }

        const { command } = payload.d as { command: string };
        if (!command || !command.trim()) return;

        const trimmed = command.trim();

        exec(trimmed, { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
          let output = stdout || '';
          if (stderr) output += (output ? '\n' : '') + stderr;
          if (err && !output) output = err.message;
          send({
            op: WSOp.TERMINAL_DATA,
            d: {
              command: trimmed,
              output: output || '(No output returned)',
              exit_code: err ? (err.code || 1) : 0,
            },
          });
        });
        return;
      }
    });

    w.on('close', () => {
      clearTimeout(identifyTimer);
      if (w.userId) {
        unregisterSocket(w.userId, w);
        if (!userSockets.has(w.userId)) {
          db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(w.userId);

          const spaceChannels = db.prepare(`
            SELECT c.id FROM channels c
            INNER JOIN members m ON m.space_id = c.space_id
            WHERE m.user_id = ?
          `).all(w.userId) as { id: string }[];

          const dmChannels = db.prepare(`
            SELECT channel_id AS id FROM dm_members WHERE user_id = ?
          `).all(w.userId) as { id: string }[];

          const allChannels = [
            ...spaceChannels.map(c => c.id),
            ...dmChannels.map(c => c.id),
          ];

          const presencePayload = {
            op: WSOp.PRESENCE_UPDATE,
            d: { user_id: w.userId, status: 'offline' },
          };
          allChannels.forEach(cid => broadcast(cid, presencePayload));

          unsubscribeAll(w.userId);
        }
      }
      logger.info('[gateway] client disconnected');
    });
  });

  logger.info('[gateway] WebSocket gateway ready on /gateway');
}
