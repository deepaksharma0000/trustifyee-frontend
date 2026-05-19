export type OMSState =
  | "CREATED"
  | "INTENT_LOGGED"
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "REJECTED"
  | "CANCELLED"
  | "RECONCILING"
  | "FAILED";

export type ExecutionSafetyMode =
  | "NORMAL_MODE"
  | "DEGRADED_MODE"
  | "ENTRY_BLOCK_MODE"
  | "READ_ONLY_MODE"
  | "PANIC_LIQUIDATION_MODE";

export type ValidationLifecycleState =
  | "SHADOW_MATCHED"
  | "SHADOW_DIVERGED"
  | "REPLAY_VALIDATED"
  | "CHAOS_RECOVERED"
  | "INVARIANT_CONFIRMED";

export interface AlertRecord {
  id: string;
  type: "LATP_SPIKE" | "RECON_MISMATCH" | "DUPLICATE_FILL" | "STUCK_ORDER" | "SHADOW_DIVERGENCE" | "SANDBOX_CRASH";
  message: string;
  timestamp: number;
  severity: "WARNING" | "CRITICAL";
}

export interface MetricSnapshot {
  tickThroughput: number;
  avgOmsLatencyMs: number;
  avgReconLatencyMs: number;
  reconMismatchesCount: number;
  activeAlertsCount: number;
}

export interface ShadowRecord {
  clientOrderId: string;
  tradingsymbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  livePrice: number;
  paperPrice: number;
  liveTimestamp: number;
  paperTimestamp: number;
  state: ValidationLifecycleState;
  divergenceDeltaPaisa: number;
}

export interface TemporalMetrics {
  driftConfidence: number;
  monotonicDriftDeltaMs: number;
  lastSyncTimestamp: number;
  driftOutagesCount: number;
  currentSafetyMode: ExecutionSafetyMode;
}

export interface TickData {
  symboltoken: string;
  ltp: number;
  oi: number;
  volume: number;
  percentChange: number;
  ts: number;
}
