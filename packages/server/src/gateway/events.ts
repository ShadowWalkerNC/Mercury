import type { WebSocket } from 'ws';
import type { WSPayload } from '@mercury/shared';

// ─── Session registry ───────────────────────────────────────────────────────────────
//
// Maps userId → Set<WebSocket> so we can fan-out to all connections for a user,
// and channelId → Set<userId> so we can fan-out to a channel’s members.

export const userSockets = new Map<string, Set<WebSocket>>();
export const channelSubscribers = new Map<string, Set<string>>();

export function registerSocket(userId: string, ws: WebSocket): void {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId)!.add(ws);
}

export function unregisterSocket(userId: string, ws: WebSocket): void {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) userSockets.delete(userId);
}

export function subscribeToChannels(userId: string, channelIds: string[]): void {
  for (const channelId of channelIds) {
    if (!channelSubscribers.has(channelId)) channelSubscribers.set(channelId, new Set());
    channelSubscribers.get(channelId)!.add(userId);
  }
}

export function unsubscribeAll(userId: string): void {
  for (const subscribers of channelSubscribers.values()) {
    subscribers.delete(userId);
  }
}

// ─── Fan-out ─────────────────────────────────────────────────────────────────────

export function broadcast(channelId: string, payload: WSPayload): void {
  const subscribers = channelSubscribers.get(channelId);
  if (!subscribers) return;
  const data = JSON.stringify(payload);
  for (const userId of subscribers) {
    const sockets = userSockets.get(userId);
    if (!sockets) continue;
    for (const ws of sockets) {
      if (ws.readyState === 1 /* OPEN */) ws.send(data);
    }
  }
}

export function sendToUser(userId: string, payload: WSPayload): void {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const data = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(data);
  }
}
