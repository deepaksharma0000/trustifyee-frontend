// src/hooks/use-signal-executor.ts
// FIX #2: Frontend Signal Executor — receives TRADE_SIGNAL from /ws/signals
// FIX #6: Auto-reconnect with exponential backoff
// FIX #9: HTTP fallback polling when WebSocket is down
// FIX #10: IP change detection

import { useEffect, useRef, useCallback, useState } from "react";

const WS_BASE = process.env.REACT_APP_WS_URL || "ws://localhost:5000";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const FALLBACK_POLL_MS = 5000;
const IP_CHECK_INTERVAL_MS = 60_000;

interface TradeSignal {
  signalId: string;
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
  const [isConnected, setIsConnected] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // FIX #2: Execute a trade signal by calling /api/signals/execute
  // This is a backend PROXY call — the backend routes to AngelOne
  // using the USER's stored JWT session (user-side IP compliance).
  // ─────────────────────────────────────────────────────────────────
  const executeSignal = useCallback(
    async (signal: TradeSignal) => {
      // FIX 3: ORDER EXECUTION GUARD
      if (!enabled || !token) {
        console.warn("[SignalExecutor] Signal ignored: Execution disabled or token missing.");
        return;
      }

      onSignalReceived?.(signal);
      try {
        const res = await fetch(`${API_BASE}/signals/queue-execution`, {

          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            signalId: signal.signalId,
            lots: 1,
          }),
        });

        const result = await res.json();

        if (result.status) {
          onOrderPlaced?.(signal, result);
        } else {
          onOrderFailed?.(signal, result.error || "Unknown broker error");
        }
      } catch (err: any) {
        onOrderFailed?.(signal, err.message || "Network error");
      }
    },
    [token, enabled, onSignalReceived, onOrderPlaced, onOrderFailed]
  );

  // ─────────────────────────────────────────────────────────────────
  // FIX #9: HTTP Fallback — poll /api/signals/pending every 5s
  // when WebSocket is disconnected
  // ─────────────────────────────────────────────────────────────────
  const startFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) return;
    console.warn("[SignalExecutor] WebSocket down. Starting HTTP fallback polling.");
    fallbackTimerRef.current = setInterval(async () => {
      if (isConnectedRef.current) {
        stopFallbackPolling();
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/signals/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.signals)) {
          for (const signal of data.signals) {
            await executeSignal(signal);
          }
        }
      } catch (_) {
        // Silently retry
      }
    }, FALLBACK_POLL_MS);
  }, [token, executeSignal]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

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
        onIpChanged?.(ip, old);
      }
    } catch (_) {}
  }, [onIpChanged]);

  // ─────────────────────────────────────────────────────────────────
  // FIX #6: WebSocket connect with exponential backoff reconnect
  // ─────────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!token || !enabled) return;

    const url = `${WS_BASE}/ws/signals?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[SignalExecutor] ✅ Connected to /ws/signals");
      retriesRef.current = 0;
      isConnectedRef.current = true;
      setIsConnected(true);
      stopFallbackPolling();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "TRADE_SIGNAL" && msg.data) {
          console.log("[SignalExecutor] 📡 Signal received:", msg.data.tradingsymbol);
          executeSignal(msg.data as TradeSignal);
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
          console.log("[SignalExecutor] Server confirmed:", msg.message);
        }
        
        if (msg.type === "pong") {
          // Heartbeat ok
        }
      } catch (err) {
        console.error("[SignalExecutor] Failed to parse message:", err);
      }
    };

    ws.onclose = (event) => {
      isConnectedRef.current = false;
      setIsConnected(false);
      console.warn(`[SignalExecutor] ⚠️ Disconnected (code: ${event.code}). Reconnecting...`);

      // Start HTTP fallback during reconnect gap
      startFallbackPolling();

      // FIX #6: Exponential backoff — max 30s between retries
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
      retriesRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (enabled && token) connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.error("[SignalExecutor] WS error:", err);
      ws.close();
    };

    // Send keepalive pings every 20s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      } else {
        clearInterval(pingInterval);
      }
    }, 20_000);
  }, [token, enabled, executeSignal, startFallbackPolling, stopFallbackPolling]);

  // ─────────────────────────────────────────────────────────────────
  // Mount / unmount lifecycle
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !token) return;

    // Initial connect
    connect();

    // FIX #10: Start IP monitoring
    checkIpChange(); // immediate first check
    ipCheckTimerRef.current = setInterval(checkIpChange, IP_CHECK_INTERVAL_MS);

    return () => {
      // Cleanup all timers and connections
      wsRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      if (ipCheckTimerRef.current) clearInterval(ipCheckTimerRef.current);
    };
  }, [token, enabled]); // Re-connect if token or enabled status changes

  return { isConnected };
}
