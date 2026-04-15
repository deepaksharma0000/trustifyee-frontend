import { useCallback, useEffect, useRef, useState } from 'react';

const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const EXECUTOR_BASE = process.env.REACT_APP_EXECUTOR_URL || 'http://127.0.0.1:43119';
const FALLBACK_POLL_MS = 5000;
const OPS_LIMIT = 8;
const ONE_SECOND_MS = 1000;

export type ExecutionStatus = 'idle' | 'ready' | 'degraded' | 'unavailable';

export interface TradeSignal {
  signalId: string;
  symbol: string;
  exchange: string;
  tradingsymbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT';
  price: number;
  qty: number;
  strategyId?: string;
  signalType: 'ENTRY' | 'EXIT';
  createdAt?: string;
}

interface ExecutorHealth {
  ok: boolean;
  sessionValid: boolean;
  connected: boolean;
  ipAddress?: string;
  reason?: string;
}

export interface ExecutionResponse {
  ok: boolean;
  orderId?: string;
  brokerResponse?: unknown;
  ipAddress?: string;
  error?: string;
}

interface UseCompliantSignalExecutorOptions {
  token: string | null;
  enabled: boolean;
  onSignalReceived?: (signal: TradeSignal) => void;
  onOrderPlaced?: (signal: TradeSignal, result: ExecutionResponse) => void;
  onOrderFailed?: (signal: TradeSignal, error: string) => void;
}

async function postAuditEvent(token: string, signal: TradeSignal, result: ExecutionResponse) {
  await fetch(`${API_BASE}/signals/execution-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      signalId: signal.signalId,
      status: result.ok ? 'SUCCESS' : 'FAILED',
      orderId: result.orderId,
      errorMessage: result.error,
      executedAt: new Date().toISOString(),
      orderType: 'LIMIT',
      strategyId: signal.strategyId,
      ipAddress: result.ipAddress,
      brokerResponse: result.brokerResponse,
    }),
  });
}

export function useCompliantSignalExecutor({
  token,
  enabled,
  onSignalReceived,
  onOrderPlaced,
  onOrderFailed,
}: UseCompliantSignalExecutorOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opsTimestampsRef = useRef<number[]>([]);
  const queueRef = useRef<TradeSignal[]>([]);
  const processingRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<ExecutionStatus>('idle');
  const [executorIp, setExecutorIp] = useState<string | null>(null);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const waitForOpsSlot = useCallback(async () => {
    while (true) {
      const now = Date.now();
      opsTimestampsRef.current = opsTimestampsRef.current.filter((ts) => now - ts < ONE_SECOND_MS);

      if (opsTimestampsRef.current.length < OPS_LIMIT) {
        opsTimestampsRef.current.push(now);
        return;
      }

      const oldest = opsTimestampsRef.current[0];
      const delay = Math.max(ONE_SECOND_MS - (now - oldest), 25);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }, []);

  const validateExecutor = useCallback(async (): Promise<ExecutorHealth> => {
    const response = await fetch(`${EXECUTOR_BASE}/health`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Executor health check failed with ${response.status}`);
    }

    return response.json();
  }, [token]);

  const executeViaUserDevice = useCallback(async (signal: TradeSignal): Promise<ExecutionResponse> => {
    if (!token) {
      return { ok: false, error: 'Missing app session token' };
    }

    const health = await validateExecutor();
    if (!health.ok || !health.connected || !health.sessionValid) {
      setConnectionStatus(health.connected ? 'degraded' : 'unavailable');
      return { ok: false, error: health.reason || 'User executor is unavailable', ipAddress: health.ipAddress };
    }

    setConnectionStatus('ready');
    setExecutorIp(health.ipAddress || null);

    if (signal.orderType !== 'LIMIT') {
      return { ok: false, error: 'Non-LIMIT signal rejected by compliance guard', ipAddress: health.ipAddress };
    }

    await waitForOpsSlot();

    const response = await fetch(`${EXECUTOR_BASE}/orders/execute-signal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(signal),
    });

    const result = (await response.json()) as ExecutionResponse;
    return {
      ...result,
      ok: response.ok && result.ok,
      ipAddress: result.ipAddress || health.ipAddress,
    };
  }, [token, validateExecutor, waitForOpsSlot]);

  const drainQueue = useCallback(async () => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const signal = queueRef.current.shift();
        if (!signal) {
          continue;
        }

        onSignalReceived?.(signal);
        const result = await executeViaUserDevice(signal);

        if (token) {
          await postAuditEvent(token, signal, result).catch(() => undefined);
        }

        if (result.ok) {
          onOrderPlaced?.(signal, result);
        } else {
          onOrderFailed?.(signal, result.error || 'Execution failed');
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [executeViaUserDevice, onOrderFailed, onOrderPlaced, onSignalReceived, token]);

  const enqueueSignal = useCallback((signal: TradeSignal) => {
    queueRef.current.push(signal);
    void drainQueue();
  }, [drainQueue]);

  const startFallbackPolling = useCallback(() => {
    if (!token || fallbackTimerRef.current) {
      return;
    }

    fallbackTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/signals/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.ok && Array.isArray(data.signals)) {
          data.signals.forEach((signal: TradeSignal) => enqueueSignal(signal));
        }
      } catch {
        setConnectionStatus('degraded');
      }
    }, FALLBACK_POLL_MS);
  }, [enqueueSignal, token]);

  const connect = useCallback(() => {
    if (!token || !enabled) {
      return;
    }

    const ws = new WebSocket(`${WS_BASE}/ws/signals?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('ready');
      stopFallbackPolling();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'TRADE_SIGNAL' && message.data) {
          enqueueSignal(message.data as TradeSignal);
        }
      } catch {
        setConnectionStatus('degraded');
      }
    };

    ws.onclose = () => {
      setConnectionStatus('degraded');
      startFallbackPolling();
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled, enqueueSignal, startFallbackPolling, stopFallbackPolling, token]);

  useEffect(() => {
    if (!enabled || !token) {
      setConnectionStatus('idle');
      return;
    }

    void validateExecutor()
      .then((health) => {
        setConnectionStatus(health.ok && health.sessionValid && health.connected ? 'ready' : 'degraded');
        setExecutorIp(health.ipAddress || null);
      })
      .catch(() => setConnectionStatus('unavailable'));

    connect();

    return () => {
      wsRef.current?.close();
      stopFallbackPolling();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect, enabled, stopFallbackPolling, token, validateExecutor]);

  return {
    connectionStatus,
    executorIp,
    enqueueSignal,
  };
}
