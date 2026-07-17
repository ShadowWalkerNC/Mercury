import { WSOp, WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS } from '@mercury/shared';
import type { WSPayload } from '@mercury/shared';
import { useAuthStore } from '@/stores/authStore';

type Handler = (payload: WSPayload) => void;

const PING_INTERVAL_MS  = 30_000;
const RECONNECT_JITTER  = 0.3;

function backoff(attempt: number): number {
  const base = Math.min(WS_RECONNECT_BASE_MS * 2 ** attempt, WS_RECONNECT_MAX_MS);
  return base * (1 + (Math.random() - 0.5) * 2 * RECONNECT_JITTER);
}

class GatewayClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private intentionalClose = false;

  connect(): void { this.intentionalClose = false; this._open(); }
  disconnect(): void { this.intentionalClose = true; this._cleanup(); }

  on(op: string, handler: Handler): () => void {
    if (!this.handlers.has(op)) this.handlers.set(op, new Set());
    this.handlers.get(op)!.add(handler);
    return () => this.handlers.get(op)?.delete(handler);
  }

  send(payload: WSPayload): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  private _open(): void {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/gateway`);

    this.ws.onopen = () => {
      const token = useAuthStore.getState().accessToken;
      if (!token) { this.disconnect(); return; }
      this.send({ op: WSOp.IDENTIFY, d: { token } });
      this.attempt = 0;
      this._startPing();
    };

    this.ws.onmessage = (ev) => {
      let payload: WSPayload;
      try { payload = JSON.parse(ev.data as string) as WSPayload; } catch { return; }
      const handlers = this.handlers.get(payload.op);
      if (handlers) for (const h of handlers) h(payload);
    };

    this.ws.onerror = () => { /* handled by onclose */ };
    this.ws.onclose = () => {
      this._cleanup();
      if (!this.intentionalClose) {
        this.reconnectTimer = setTimeout(() => this._open(), backoff(this.attempt++));
      }
    };
  }

  private _startPing(): void {
    this._stopPing();
    this.pingTimer = setInterval(() => this.send({ op: WSOp.PING, d: {} }), PING_INTERVAL_MS);
  }

  private _stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private _cleanup(): void {
    this._stopPing();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onerror = this.ws.onclose = null;
      if (this.ws.readyState < WebSocket.CLOSING) this.ws.close();
      this.ws = null;
    }
  }
}

export const gateway = new GatewayClient();
