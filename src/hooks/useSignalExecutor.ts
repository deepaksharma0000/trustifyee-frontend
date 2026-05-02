import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HOST_API } from 'src/config-global';
import { useBrokerSession } from 'src/trading/context/broker-session-context';
import { OrderRateLimiter } from 'src/trading/execution/rate-limiter';
import { AsyncSignalQueue } from 'src/trading/execution/queue';
import { AngelApiResponse, AngelOrderResponse } from 'src/trading/angelone/types';

// Configuration
const WS_BASE = process.env.REACT_APP_WS_URL || HOST_API.replace(/^http/i, 'ws');
const API_BASE = process.env.REACT_APP_API_URL || `${HOST_API}/api`;
const WS_PATH = '/ws/signals';
const FALLBACK_POLL_MS = 5000;

export interface TradeSignal {
  signalId: string;
  tradingsymbol: string;
  symboltoken: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET' | 'IOC';
  price: number;
  qty: number;
  strategyId?: string;
  signalType?: 'ENTRY' | 'EXIT';
}

export interface SignalExecutionResult {
  signalId: string;
  status: 'SUCCESS' | 'FAILED';
  orderId?: string;
  error?: string;
  timestamp: string;
  brokerResponse?: AngelApiResponse<AngelOrderResponse>;
}

interface UseSignalExecutorOptions {
  appToken: string | null; // JWT for our backend
  enabled: boolean;      // User opted-in to live trading
  onSignalReceived?: (signal: TradeSignal) => void;
  onExecutionSuccess?: (result: SignalExecutionResult) => void;
  onExecutionFailure?: (result: SignalExecutionResult) => void;
}

/**
 * 🛡️ COMPLIANCE AUDIT
 * Sends the execution result back to the server for regulatory logging.
 */
async function postAuditEvent(token: string, result: SignalExecutionResult) {
  try {
    await fetch(`${API_BASE}/signals/execution-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        signalId: result.signalId,
        status: result.status,
        orderId: result.orderId,
        errorMessage: result.error,
        executedAt: result.timestamp,
        orderType: 'LIMIT',
        brokerResponse: result.brokerResponse,
      }),
    });
  } catch (err) {
    console.error('[Audit] Failed to log execution event:', err);
  }
}

/**
 * 🚀 PRODUCTION FRONTEND EXECUTION ENGINE
 * Strictly follows NSE compliance:
 * 1. Executes via browser (User IP)
 * 2. Only allows LIMIT orders
 * 3. Enforces rate limits (8/sec)
 * 4. Logs audit trails
 */
export function useSignalExecutor({
  appToken,
  enabled,
  onSignalReceived,
  onExecutionSuccess,
  onExecutionFailure,
}: UseSignalExecutorOptions) {
  const { angelClient } = useBrokerSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isExecutorReady, setIsExecutorReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // 1. Rate Limiter (8 orders per second)
  const limiter = useMemo(() => new OrderRateLimiter(8, 1000), []);

  // 2. Execution Logic
  const processSignal = useCallback(
    async (signal: TradeSignal) => {
      onSignalReceived?.(signal);

      // 🛡️ [DUPLICATE PREVENTION]
      // If the signal is marked for server-side execution, ignore it on the client.
      if ((signal as any).executionMode === 'SERVER') {
        console.log(`[Executor] Signal ${signal.signalId} is handled by server. Skipping client execution.`);
        return;
      }

      if (!enabled) return;

      // 🛡️ VALIDATION: LIMIT Order Only
      if (signal.orderType !== 'LIMIT') {
        const result: SignalExecutionResult = {
          signalId: signal.signalId,
          status: 'FAILED',
          error: `Compliance Block: ${signal.orderType} orders are forbidden.`,
          timestamp: new Date().toISOString(),
        };
        if (appToken) await postAuditEvent(appToken, result);
        onExecutionFailure?.(result);
        return;
      }

      try {
        // 🛡️ VALIDATION: Session Active
        const isSessionValid = await angelClient.validateSession();
        if (!isSessionValid) {
          throw new Error('Broker session invalid. Please reconnect.');
        }

        // ⏱️ RATE LIMITING
        await limiter.waitForTurn();

        // ⚡ EXECUTION (User-Device IP)
        const brokerResponse = await angelClient.placeOrder({
          tradingsymbol: signal.tradingsymbol,
          symboltoken: signal.symboltoken,
          exchange: signal.exchange,
          transactiontype: signal.side,
          quantity: signal.qty,
          price: signal.price,
          ordertype: 'LIMIT',
        });

        const result: SignalExecutionResult = {
          signalId: signal.signalId,
          status: 'SUCCESS',
          orderId: brokerResponse.data?.orderid,
          timestamp: new Date().toISOString(),
          brokerResponse,
        };

        if (appToken) await postAuditEvent(appToken, result);
        onExecutionSuccess?.(result);

      } catch (error: any) {
        setLastError(error.message);
        const result: SignalExecutionResult = {
          signalId: signal.signalId,
          status: 'FAILED',
          error: error.message || 'Execution failed',
          timestamp: new Date().toISOString(),
        };
        if (appToken) await postAuditEvent(appToken, result);
        onExecutionFailure?.(result);
      }
    },
    [angelClient, appToken, enabled, limiter, onExecutionFailure, onExecutionSuccess, onSignalReceived]
  );

  // 3. Buffer Queue
  const queue = useMemo(() => new AsyncSignalQueue<TradeSignal>(processSignal), [processSignal]);

  // 4. Fallback Polling (if WS dies)
  const startFallbackPolling = useCallback(() => {
    if (!appToken || fallbackTimerRef.current) return;
    
    fallbackTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/signals/pending`, {
          headers: { Authorization: `Bearer ${appToken}` },
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.signals)) {
          data.signals.forEach((s: TradeSignal) => queue.enqueue(s));
        }
      } catch (err) {}
    }, FALLBACK_POLL_MS);
  }, [appToken, queue]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // 5. WebSocket Handler
  const connect = useCallback(() => {
    if (!appToken || !enabled) return;

    const ws = new WebSocket(`${WS_BASE}${WS_PATH}?token=${encodeURIComponent(appToken)}`);
    wsRef.current = ws;

    ws.onopen = async () => {
      setIsConnected(true);
      stopFallbackPolling();
      const valid = await angelClient.validateSession().catch(() => false);
      setIsExecutorReady(valid);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'TRADE_SIGNAL' && msg.data) {
          queue.enqueue(msg.data as TradeSignal);
        }
      } catch (err) {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      startFallbackPolling();
      reconnectTimerRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, [angelClient, appToken, enabled, queue, startFallbackPolling, stopFallbackPolling]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      stopFallbackPolling();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect, stopFallbackPolling]);

  return { isConnected, isExecutorReady, lastError, queueSize: queue.size() };
}
