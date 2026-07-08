import type { WebSocket } from 'ws';
import type { WebSocketServer } from 'ws';
import { WS_HEARTBEAT_INTERVAL_MS } from '@mercury/shared';
import { logger } from '../utils/logger.js';

export function startHeartbeat(wss: WebSocketServer): void {
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      const w = ws as WebSocket & { isAlive?: boolean };
      if (w.isAlive === false) {
        logger.info('[gateway] terminating unresponsive client');
        w.terminate();
        continue;
      }
      w.isAlive = false;
      w.ping();
    }
  }, WS_HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(interval));
}
