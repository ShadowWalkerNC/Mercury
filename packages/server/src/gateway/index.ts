import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
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

        // Set presence online
        db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(userId);

        // Subscribe to all channels in all spaces the user is a member of
        const channels = db.prepare(`
          SELECT c.id FROM channels c
          INNER JOIN members m ON m.space_id = c.space_id
          WHERE m.user_id = ?
        `).all(userId) as { id: string }[];

        const channelIds = channels.map(c => c.id);
        subscribeToChannels(userId, channelIds);
        registerSocket(userId, w);

        clearTimeout(identifyTimer);
        identified = true;
        w.userId = userId;

        const sessionId = `${userId}-${Date.now()}`;
        const ready: ReadyPayload = { user: user as never, session_id: sessionId };
        send({ op: WSOp.READY, d: ready });
        logger.info('[gateway] READY sent', { userId });
        return;
      }

      // All ops below require identification
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
      }
    });

    w.on('close', () => {
      clearTimeout(identifyTimer);
      if (w.userId) {
        unregisterSocket(w.userId, w);
        // Only set offline if no other sockets remain for this user
        if (!userSockets.has(w.userId)) {
          db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(w.userId);
          unsubscribeAll(w.userId);
        }
      }
      logger.info('[gateway] client disconnected');
    });
  });

  logger.info('[gateway] WebSocket gateway ready on /gateway');
}
