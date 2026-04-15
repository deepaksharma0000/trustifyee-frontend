export type AngelOrderSide = 'BUY' | 'SELL';
export type AngelOrderType = 'LIMIT';
export type AngelProductType = 'INTRADAY' | 'DELIVERY' | 'CARRYFORWARD' | 'MARGIN' | 'CNC' | 'NRML';

export interface AngelSessionTokens {
  jwtToken: string;
  refreshToken?: string;
  feedToken?: string;
  issuedAt: number;
  expiresAt?: number;
}

export interface AngelCredentials {
  clientCode: string;
  apiKey: string;
}

export interface AngelSessionState {
  credentials: AngelCredentials | null;
  tokens: AngelSessionTokens | null;
}

export interface AngelLoginPayload {
  clientcode: string;
  password: string;
  totp: string;
}

export interface AngelOrderRequest {
  tradingsymbol: string;
  symboltoken: string;
  exchange: string;
  transactiontype: AngelOrderSide;
  quantity: number;
  price: number;
  producttype?: AngelProductType;
  duration?: 'DAY';
  variety?: 'NORMAL';
  ordertype: AngelOrderType;
}

export interface AngelApiResponse<T> {
  status: boolean;
  message?: string;
  errorcode?: string;
  data?: T;
}

export interface AngelOrderResponse {
  orderid?: string;
  uniqueorderid?: string;
  text?: string;
}

export interface AngelProfileResponse {
  clientcode?: string;
  name?: string;
}

export interface SignalExecutionAuditEvent {
  signalId: string;
  status: 'SUCCESS' | 'FAILED';
  orderId?: string;
  error?: string;
  timestamp: string;
}
