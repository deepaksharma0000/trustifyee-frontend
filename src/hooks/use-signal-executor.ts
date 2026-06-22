// src/hooks/use-signal-executor.ts
// FIX #2: Frontend Signal Executor — receives TRADE_SIGNAL from /ws/signals
// FIX #6: Auto-reconnect with exponential backoff (module singleton)
// FIX #9: HTTP fallback polling when WebSocket is down
// FIX #10: IP change detection

import { useEffect, useRef, useCallback, useState } from "react";
import { signalWsManager } from "src/services/signal-ws-manager";

// Dynamic Production-Safe API and WebSocket URL Resolver
const getApiBase = (): string => {
  const viteUrl = (import.meta as any).env?.VITE_API_URL;
  if (viteUrl) return viteUrl;

  const processUrl = typeof process !== "undefined" ? process.env?.REACT_APP_API_URL : undefined;
  if (processUrl) return processUrl;

  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:5000/api";
  }

  return `${window.location.origin}/api`;
};

const API_BASE = getApiBase();

const getWsBase = (): string => {
  const viteWsUrl = (import.meta as any).env?.VITE_WS_URL;
  if (viteWsUrl) return viteWsUrl;

  const processWsUrl = typeof process !== "undefined" ? process.env?.REACT_APP_WS_URL : undefined;
  if (processWsUrl) return processWsUrl;

  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "ws://localhost:5000";
  }

  return API_BASE
    .replace(/^https/, "wss")
    .replace(/^http/, "ws")
    .replace(/\/api$/, "");
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
  token: string | null;
  enabled: boolean;
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
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ipCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const storedIpRef = useRef<string>("");
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const releaseWsRef = useRef<(() => void) | null>(null);
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

      if (!FRONTEND_SIGNAL_EXECUTION_ENABLED || mode === "SERVER") {
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

  const replayPendingSignals = useCallback(async () => {
    if (!FRONTEND_SIGNAL_EXECUTION_ENABLED || !token || !enabled) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/signals/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.signals) && data.signals.length > 0) {
        const normalizedList = data.signals.map((sig: any) => ({
          ...sig,
          signalId: sig.signalId || sig._id || sig.id,
        }));

        normalizedList.reduce(
          (promiseChain: Promise<any>, nextSignal: TradeSignal) => promiseChain.then(() => executeSignal(nextSignal)),
          Promise.resolve()
        ).catch((err: any) => {
          console.error("[SignalExecutor] Error in pending signal replay chain:", err);
        });
      }
    } catch (err: any) {
      console.error("[SignalExecutor] Reconnect replay preflight failed:", err.message);
    }
  }, [token, enabled, executeSignal]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (!FRONTEND_SIGNAL_EXECUTION_ENABLED || fallbackTimerRef.current) {
      return;
    }

    fallbackTimerRef.current = setInterval(async () => {
      if (signalWsManager.isConnected()) {
        stopFallbackPolling();
        return;
      }
      await replayPendingSignals();
    }, FALLBACK_POLL_MS);
  }, [replayPendingSignals, stopFallbackPolling]);

  const handleWsMessage = useCallback((msg: any) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ws-signal-message", { detail: msg }));
    }

    if (msg?.type === "TRADE_SIGNAL" && msg.data) {
      const rawSignal = msg.data as TradeSignal;
      const resolvedId = rawSignal.signalId || rawSignal._id || rawSignal.id;
      executeSignalRef.current({ ...rawSignal, signalId: resolvedId });
    }

    if (msg?.type === "TRADE_EXECUTION_UPDATE" && msg.data) {
      console.info("[SignalExecutor] Trade execution update:", msg.data);
    }

    if (msg?.type === "tick" && Array.isArray(msg.items)) {
      msg.items.forEach((tick: TickData) => {
        const latency = Date.now() - tick.ts;
        if (latency > 500) {
          console.warn(`[SignalExecutor] Stale tick detected (${latency}ms delay) for ${tick.symboltoken}`);
        }
      });
    }

    if (msg?.type === "connected") {
      console.log("%c[SignalExecutor] SERVER CONFIRMED REGISTRATION on /ws/signals", "color: #00bcd4; font-weight: bold;");
    }
  }, []);

  const handleWsMessageRef = useRef(handleWsMessage);
  handleWsMessageRef.current = handleWsMessage;

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
    } catch {
      // ignore IP lookup failures
    }
  }, []);

  useEffect(() => {
    releaseWsRef.current?.();
    releaseWsRef.current = null;
    stopFallbackPolling();

    if (!enabled || !token) {
      setIsConnected(false);
      return undefined;
    }

    releaseWsRef.current = signalWsManager.acquire({
      token,
      wsBase: WS_BASE,
      onMessage: (msg) => handleWsMessageRef.current(msg),
      onStatusChange: (connected) => {
        setIsConnected(connected);
        if (connected) {
          console.log("%c[SignalExecutor] WS CONNECTED via singleton /ws/signals", "color: #22c55e; font-weight: bold;");
          replayPendingSignals().catch(() => undefined);
          stopFallbackPolling();
        } else {
          console.warn("%c[SignalExecutor] WS DISCONNECTED — singleton will backoff reconnect", "color: #ff9800; font-weight: bold;");
          startFallbackPolling();
        }
      },
    });

    checkIpChange().catch(() => undefined);
    ipCheckTimerRef.current = setInterval(checkIpChange, IP_CHECK_INTERVAL_MS);

    return () => {
      releaseWsRef.current?.();
      releaseWsRef.current = null;
      if (ipCheckTimerRef.current) {
        clearInterval(ipCheckTimerRef.current);
        ipCheckTimerRef.current = null;
      }
      stopFallbackPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect only when auth session inputs change
  }, [token, enabled]);

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
