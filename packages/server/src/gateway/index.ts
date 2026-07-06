/**
 * WebSocket gateway — Phase 3 implementation.
 * Scaffold only: accepts connections, enforces IDENTIFY timeout, sends INVALID_SESSION.
 */
import { WebSocketServer, type WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:http';
import { WSOp, WS_IDENTIFY_TIMEOUT_MS } from '@mercury/shared';
import { logger } from '../utils/logger.js';

export function initGateway(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/gateway' });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    logger.info('[gateway] client connected');

    let identified = false;

    // Enforce IDENTIFY within timeout
    const identifyTimer = setTimeout(() => {
      if (!identified) {
        ws.send(JSON.stringify({ op: WSOp.INVALID_SESSION, d: { reason: 'Identify timeout' } }));
        ws.close(4001, 'Identify timeout');
      }
    }, WS_IDENTIFY_TIMEOUT_MS);

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString()) as { op: string; d: unknown };

        if (payload.op === WSOp.IDENTIFY) {
          // Full auth wired in Phase 3 (M-020)
          clearTimeout(identifyTimer);
          identified = true;
          logger.info('[gateway] IDENTIFY received — full auth wired in M-020');
          ws.send(JSON.stringify({ op: WSOp.INVALID_SESSION, d: { reason: 'Not implemented yet' } }));
          ws.close(4002, 'Not implemented');
          return;
        }

        if (payload.op === WSOp.PING) {
          ws.send(JSON.stringify({ op: WSOp.PONG, d: {} }));
          return;
        }
      } catch {
        ws.close(4000, 'Invalid payload');
      }
    });

    ws.on('close', () => {
      clearTimeout(identifyTimer);
      logger.info('[gateway] client disconnected');
    });
  });

  logger.info('[gateway] WebSocket gateway ready on /gateway');
}
