/**
 * Module-level singleton for /ws/signals.
 * Exactly one browser WebSocket per JWT session — survives React effect re-runs and remounts.
 */

const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30_000;
const PING_INTERVAL_MS = 20_000;

export type SignalWsMessageHandler = (msg: unknown) => void;
export type SignalWsStatusHandler = (connected: boolean) => void;

type AcquireOptions = {
  token: string;
  wsBase: string;
  onMessage: SignalWsMessageHandler;
  onStatusChange: SignalWsStatusHandler;
};

class SignalWebSocketManager {
  private ws: WebSocket | null = null;

  private token: string | null = null;

  private wsBase = '';

  private refCount = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private retries = 0;

  private intentionalClose = false;

  private onMessage: SignalWsMessageHandler | null = null;

  private onStatusChange: SignalWsStatusHandler | null = null;

  private lastConnectAttemptMs = 0;

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearPingTimer() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private detachHandlers(ws: WebSocket) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
  }

  private teardownSocket(intentional: boolean) {
    this.clearReconnectTimer();
    this.clearPingTimer();

    const existing = this.ws;
    if (!existing) {
      return;
    }

    if (intentional) {
      this.intentionalClose = true;
    }

    this.detachHandlers(existing);

    if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
      try {
        existing.close(1000, intentional ? 'client-intentional-close' : 'client-replaced');
      } catch {
        // best effort
      }
    }

    if (this.ws === existing) {
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.intentionalClose || !this.token || this.refCount === 0) {
      return;
    }

    this.clearReconnectTimer();

    const delay = Math.min(MIN_RECONNECT_MS * 2 ** this.retries, MAX_RECONNECT_MS);
    this.retries += 1;

    this.reconnectTimer = setTimeout(() => {
      if (!this.intentionalClose && this.token && this.refCount > 0) {
        this.openSocket();
      }
    }, delay);
  }

  private openSocket() {
    if (!this.token || this.refCount === 0) {
      return;
    }

    const current = this.ws;
    if (
      current &&
      (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const now = Date.now();
    if (now - this.lastConnectAttemptMs < MIN_RECONNECT_MS) {
      this.clearReconnectTimer();
      this.reconnectTimer = setTimeout(() => this.openSocket(), MIN_RECONNECT_MS);
      return;
    }
    this.lastConnectAttemptMs = now;

    this.teardownSocket(true);
    this.intentionalClose = false;

    console.count('Signal WS Created');

    const url = `${this.wsBase}/ws/signals?token=${encodeURIComponent(this.token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) {
        return;
      }

      this.retries = 0;
      this.onStatusChange?.(true);

      this.pingTimer = setInterval(() => {
        if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        ws.send(JSON.stringify({ type: 'ping' }));
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      if (this.ws !== ws) {
        return;
      }

      try {
        const msg = JSON.parse(String(event.data));
        this.onMessage?.(msg);
      } catch {
        // ignore malformed payloads
      }
    };

    ws.onerror = () => {
      if (this.ws !== ws) {
        return;
      }
      ws.close();
    };

    ws.onclose = () => {
      if (this.ws !== ws) {
        return;
      }

      this.ws = null;
      this.clearPingTimer();
      this.onStatusChange?.(false);

      if (this.intentionalClose) {
        return;
      }

      this.scheduleReconnect();
    };
  }

  acquire(options: AcquireOptions): () => void {
    const tokenChanged = this.token !== null && this.token !== options.token;

    this.refCount += 1;
    this.onMessage = options.onMessage;
    this.onStatusChange = options.onStatusChange;
    this.wsBase = options.wsBase;

    if (tokenChanged) {
      this.teardownSocket(true);
    }

    this.token = options.token;
    this.intentionalClose = false;

    const existing = this.ws;
    if (
      !tokenChanged &&
      existing &&
      (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
    ) {
      return () => {
        this.refCount = Math.max(0, this.refCount - 1);
        if (this.refCount === 0) {
          this.teardownSocket(true);
          this.token = null;
          this.onMessage = null;
          this.onStatusChange = null;
          this.retries = 0;
          this.lastConnectAttemptMs = 0;
        }
      };
    }

    this.openSocket();

    return () => {
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        this.teardownSocket(true);
        this.token = null;
        this.onMessage = null;
        this.onStatusChange = null;
        this.retries = 0;
        this.lastConnectAttemptMs = 0;
      }
    };
  }

  releaseAll() {
    this.refCount = 0;
    this.teardownSocket(true);
    this.token = null;
    this.onMessage = null;
    this.onStatusChange = null;
    this.retries = 0;
    this.lastConnectAttemptMs = 0;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const signalWsManager = new SignalWebSocketManager();
