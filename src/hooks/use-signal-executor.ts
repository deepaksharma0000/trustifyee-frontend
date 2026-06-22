// src/hooks/use-signal-executor.ts
// FIX #2: Frontend Signal Executor — receives TRADE_SIGNAL from /ws/signals
// FIX #6: Auto-reconnect with exponential backoff
// FIX #9: HTTP fallback polling when WebSocket is down
// FIX #10: IP change detection

import { useEffect, useRef, useCallback, useState } from "react";

// Dynamic Production-Safe API and WebSocket URL Resolver
const getApiBase = (): string => {
  // 1. Check Vite environment variable
  const viteUrl = (import.meta as any).env?.VITE_API_URL;
  if (viteUrl) return viteUrl;

  // 2. Check React process environment variable
  const processUrl = typeof process !== "undefined" ? process.env?.REACT_APP_API_URL : undefined;
  if (processUrl) return processUrl;

  // 3. Dev convenience: if running on local browser, fallback to port 5000 backend
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:5000/api";
  }

  // 4. Production fallback dynamically to current origin
  return `${window.location.origin}/api`;
};

const API_BASE = getApiBase();

const getWsBase = (): string => {
  // 1. Check Vite environment variable
  const viteWsUrl = (import.meta as any).env?.VITE_WS_URL;
  if (viteWsUrl) return viteWsUrl;

  // 2. Check React process environment variable
  const processWsUrl = typeof process !== "undefined" ? process.env?.REACT_APP_WS_URL : undefined;
  if (processWsUrl) return processWsUrl;

  // 3. Dev convenience for local port 5000 backend
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "ws://localhost:5000";
  }

  // 4. Production fallback dynamically by replacing http/https protocols from API base
  return API_BASE
    .replace(/^https/, "wss")
    .replace(/^http/, "ws")
    .replace(/\/api$/, ""); // strip /api suffix for base WebSocket connection
};

const WS_BASE = getWsBase();
/** Backend-only architecture: WS receives signals; BullMQ executes on server. */
const FRONTEND_SIGNAL_EXECUTION_ENABLED = false;
const FALLBACK_POLL_MS = 5000;
const IP_CHECK_INTERVAL_MS = 60_000;

interface TradeSignal {
  signalId?: string;
  _id?: string;
  id?: string;
  symbol: string;
  exchange: string;
  tradingsymbol: string;
  side: "BUY" | "SELL";
  strike?: number;
  optiontype?: "CE" | "PE";
  expiry?: string;
  price?: number;
  quantity: number;
  strategy?: string;
  signalType: "ENTRY" | "EXIT";
  executionMode?: "SERVER" | "CLIENT";
  createdAt?: string;
}

interface TickData {
  symboltoken: string;
  ltp: number;
  oi: number;
  volume: number;
  percentChange: number;
  ts: number;
}

interface UseSignalExecutorOptions {
  token: string | null; // App JWT token (for /ws/signals auth)
  enabled: boolean;     // Only connect if user is Live + broker verified
  onSignalReceived?: (signal: TradeSignal) => void;
  onOrderPlaced?: (signal: TradeSignal, result: any) => void;
  onOrderFailed?: (signal: TradeSignal, error: string) => void;
  onIpChanged?: (newIp: string, oldIp: string) => void;
}

export function useSignalExecutor({
  token,
  enabled,
  onSignalReceived,
  onOrderPlaced,
  onOrderFailed,
  onIpChanged,
}: UseSignalExecutorOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ipCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retriesRef = useRef(0);
  const storedIpRef = useRef<string>("");
  const isConnectedRef = useRef(false);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const intentionalCloseRef = useRef(false);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onSignalReceivedRef = useRef(onSignalReceived);
  const onOrderPlacedRef = useRef(onOrderPlaced);
  const onOrderFailedRef = useRef(onOrderFailed);
  const onIpChangedRef = useRef(onIpChanged);

  useEffect(() => {
    console.log('SignalExecutor Mounted');
    return () => console.log('SignalExecutor Unmounted');
  }, []);

  useEffect(() => {
    onSignalReceivedRef.current = onSignalReceived;
    onOrderPlacedRef.current = onOrderPlaced;
    onOrderFailedRef.current = onOrderFailed;
    onIpChangedRef.current = onIpChanged;
  }, [onSignalReceived, onOrderPlaced, onOrderFailed, onIpChanged]);

  // ─────────────────────────────────────────────────────────────────
  // Signal display + optional backend queue (disabled — server-only execution)
  // ─────────────────────────────────────────────────────────────────
  const executeSignal = useCallback(
    async (signal: TradeSignal) => {
      if (!enabled || !token) {
        console.warn("[SignalExecutor] Signal ignored: Execution disabled or token missing.");
        return;
      }

      const resolvedSignalId = signal.signalId || signal._id || signal.id;
      const mode = String(signal.executionMode || "SERVER").toUpperCase();

      console.info(
        `[SignalStream] TRADE_SIGNAL received (${mode}) id=${resolvedSignalId || "unknown"} — display only; backend BullMQ executes orders.`
      );

      if (resolvedSignalId) {
        onSignalReceivedRef.current?.({ ...signal, signalId: resolvedSignalId });
      }

      if (!FRONTEND_SIGNAL_EXECUTION_ENABLED) {
        return;
      }

      if (mode === "SERVER") {
        return;
      }

      if (!resolvedSignalId) {
        console.error("[SignalExecutor] Missing signal identifier:", signal);
        return;
      }

      if (processedSignalsRef.current.has(resolvedSignalId)) {
        console.warn(`[SignalExecutor] Duplicate suppression: ${resolvedSignalId}`);
        return;
      }

      processedSignalsRef.current.add(resolvedSignalId);

      try {
        const res = await fetch(`${API_BASE}/signals/queue-execution`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-access-token": token,
          },
          body: JSON.stringify({ signalId: resolvedSignalId, lots: 1 }),
        });
        const result = await res.json();
        if (result.status) {
          onOrderPlacedRef.current?.({ ...signal, signalId: resolvedSignalId }, result);
        } else {
          processedSignalsRef.current.delete(resolvedSignalId);
          onOrderFailedRef.current?.({ ...signal, signalId: resolvedSignalId }, result.error || "Unknown error");
        }
      } catch (err: any) {
        processedSignalsRef.current.delete(resolvedSignalId);
        onOrderFailedRef.current?.({ ...signal, signalId: resolvedSignalId }, err?.message || "Network error");
      }
    },
    [token, enabled]
  );

  const executeSignalRef = useRef(executeSignal);
  executeSignalRef.current = executeSignal;

  // ─────────────────────────────────────────────────────────────────
  // Reconnect Replay Logic & Gap-Fill Poller
  // ─────────────────────────────────────────────────────────────────
  const replayPendingSignals = useCallback(async () => {
    if (!FRONTEND_SIGNAL_EXECUTION_ENABLED) {
      return;
    }
    if (!token || !enabled) return;
    console.log("%c[SignalExecutor] 🔍 Querying active/pending signal queue replay...", "color: #00bcd4; font-weight: bold;");
    try {
      const res = await fetch(`${API_BASE}/signals/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.signals) && data.signals.length > 0) {
        console.log(`%c[SignalExecutor] ⚡ Replaying ${data.signals.length} pending signals...`, "color: #ff9800; font-weight: bold;");
        
        // Normalize incoming REST pending list elements
        const normalizedList = data.signals.map((sig: any) => ({
          ...sig,
          signalId: sig.signalId || sig._id || sig.id,
        }));

        // Dynamically chain pending signal execution sequentially to satisfy no-restricted-syntax and no-await-in-loop
        normalizedList.reduce(
          (promiseChain: Promise<any>, nextSignal: TradeSignal) => promiseChain.then(() => executeSignal(nextSignal)),
          Promise.resolve()
        ).catch((err: any) => {
          console.error("[SignalExecutor] Error in pending signal replay chain:", err);
        });
      } else {
        console.log("%c[SignalExecutor] ✅ Queue replay complete: No pending signals found.", "color: #4caf50;");
      }
    } catch (err: any) {
      console.error("[SignalExecutor] ❌ Reconnect replay preflight failed:", err.message);
    }
  }, [token, enabled, executeSignal]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const stopFallbackPollingRef = useRef(stopFallbackPolling);
  stopFallbackPollingRef.current = stopFallbackPolling;

  const detachSocketHandlers = useCallback((ws: WebSocket) => {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
  }, []);

  const closeActiveSocket = useCallback((intentional: boolean) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    const existing = wsRef.current;
    if (!existing) {
      return;
    }

    if (intentional) {
      intentionalCloseRef.current = true;
    }

    detachSocketHandlers(existing);

    if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
      try {
        existing.close(1000, intentional ? 'client-intentional-close' : 'client-replaced');
      } catch {
        // best effort
      }
    }

    if (wsRef.current === existing) {
      wsRef.current = null;
    }
  }, [detachSocketHandlers]);

  // ─────────────────────────────────────────────────────────────────
  // FIX #9: HTTP Fallback — poll /api/signals/pending every 5s
  // when WebSocket is disconnected
  // ─────────────────────────────────────────────────────────────────
  const startFallbackPolling = useCallback(() => {
    if (!FRONTEND_SIGNAL_EXECUTION_ENABLED) return;
    if (fallbackTimerRef.current) return;
    console.warn("%c[SignalExecutor] ⚠️ WebSocket offline. Starting HTTP fallback poller...", "color: #ff9800; font-weight: bold;");
    fallbackTimerRef.current = setInterval(async () => {
      if (isConnectedRef.current) {
        stopFallbackPolling();
        return;
      }
      await replayPendingSignals();
    }, FALLBACK_POLL_MS);
  }, [replayPendingSignals, stopFallbackPolling]);

  // ─────────────────────────────────────────────────────────────────
  // FIX #10: IP Change Detection
  // ─────────────────────────────────────────────────────────────────
  const checkIpChange = useCallback(async () => {
    try {
      const res = await fetch("https://ipv4.icanhazip.com");
      const ip = (await res.text()).trim();
      if (!storedIpRef.current) {
        storedIpRef.current = ip;
        return;
      }
      if (ip !== storedIpRef.current) {
        const old = storedIpRef.current;
        storedIpRef.current = ip;
        console.warn(`[SignalExecutor] IP changed: ${old} → ${ip}`);
        onIpChangedRef.current?.(ip, old);
      }
    } catch (_) {
      // Silently catch and ignore IP tracking network request failures
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // FIX #6: WebSocket connect with exponential backoff reconnect
  // ─────────────────────────────────────────────────────────────────
  const connectRef = useRef<() => void>(() => undefined);

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    const current = wsRef.current;
    if (
      current &&
      (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    closeActiveSocket(true);
    intentionalCloseRef.current = false;

    const url = `${WS_BASE}/ws/signals?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = async () => {
      if (wsRef.current !== ws) {
        return;
      }

      console.log("%c[SignalExecutor] 🚀 WS CONNECTED: Registered active runtime on /ws/signals", "color: #22c55e; font-weight: bold; font-size: 12px;");
      retriesRef.current = 0;
      isConnectedRef.current = true;
      setIsConnected(true);
      stopFallbackPollingRef.current();

      await replayPendingSignals();
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) {
        return;
      }

      try {
        const msg = JSON.parse(event.data);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ws-signal-message", { detail: msg }));
        }

        if (msg.type === "TRADE_SIGNAL" && msg.data) {
          const rawSignal = msg.data as TradeSignal;
          const resolvedId = rawSignal.signalId || rawSignal._id || rawSignal.id;
          executeSignalRef.current({ ...rawSignal, signalId: resolvedId });
        }

        if (msg.type === "TRADE_EXECUTION_UPDATE" && msg.data) {
          console.info("[SignalExecutor] Trade execution update:", msg.data);
        }

        if (msg.type === "tick" && Array.isArray(msg.items)) {
          msg.items.forEach((tick: TickData) => {
            const latency = Date.now() - tick.ts;
            if (latency > 500) {
              console.warn(`[SignalExecutor] ⚠️ Stale tick detected (${latency}ms delay) for ${tick.symboltoken}`);
            }
          });
        }

        if (msg.type === "connected") {
          console.log("%c[SignalExecutor] 🛡️ SERVER CONFIRMED REGISTRATION: Client device is now LIVE and whitelisted.", "color: #00bcd4; font-weight: bold;");
        }

        if (msg.type === "pong") {
          // Heartbeat ok
        }
      } catch (err) {
        console.error("[SignalExecutor] Failed to parse message:", err);
      }
    };

    ws.onclose = (event) => {
      if (wsRef.current !== ws) {
        return;
      }

      wsRef.current = null;
      isConnectedRef.current = false;
      setIsConnected(false);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      if (intentionalCloseRef.current) {
        return;
      }

      console.warn(`%c[SignalExecutor] ⚠️ WS DISCONNECTED: Runtime offline (code: ${event.code}). Reconnecting...`, "color: #ff9800; font-weight: bold;");

      startFallbackPolling();

      const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
      retriesRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (enabled && token && !intentionalCloseRef.current) {
          connectRef.current();
        }
      }, delay);
    };

    ws.onerror = (err) => {
      if (wsRef.current !== ws) {
        return;
      }
      console.error("[SignalExecutor] WS error:", err);
      ws.close();
    };

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      ws.send(JSON.stringify({ type: "ping" }));
    }, 20_000);
  }, [token, enabled, closeActiveSocket, startFallbackPolling, replayPendingSignals]);

  connectRef.current = connect;

  useEffect(() => {
    if (!enabled || !token) {
      closeActiveSocket(true);
      stopFallbackPollingRef.current();
      return undefined;
    }

    connectRef.current();

    checkIpChange().catch(() => undefined);
    ipCheckTimerRef.current = setInterval(checkIpChange, IP_CHECK_INTERVAL_MS);

    return () => {
      closeActiveSocket(true);
      if (ipCheckTimerRef.current) clearInterval(ipCheckTimerRef.current);
      stopFallbackPollingRef.current();
    };
  }, [token, enabled, checkIpChange, closeActiveSocket]);

  useEffect(() => {
    (window as any).runtimeConnected = isConnected;
    window.dispatchEvent(new CustomEvent("runtime-status-change", { detail: isConnected }));
    return () => {
      (window as any).runtimeConnected = false;
      window.dispatchEvent(new CustomEvent("runtime-status-change", { detail: false }));
    };
  }, [isConnected]);

  return { isConnected };
}
