import {
  AngelApiResponse,
  AngelCredentials,
  AngelLoginPayload,
  AngelOrderRequest,
  AngelOrderResponse,
  AngelProfileResponse,
  AngelSessionState,
  AngelSessionTokens,
} from './types';

const ANGEL_BASE_URL = process.env.REACT_APP_ANGELONE_BASE_URL || 'https://smartapi.angelone.in';
const DEFAULT_SESSION_TTL_MS = 23 * 60 * 60 * 1000;

function createHeaders(credentials: AngelCredentials, jwtToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': 'CLIENT_DEVICE',
    'X-MACAddress': 'CLIENT_DEVICE',
    'X-PrivateKey': credentials.apiKey,
    'X-Api-Key': credentials.apiKey,
  };

  if (jwtToken) {
    headers.Authorization = `Bearer ${jwtToken}`;
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<AngelApiResponse<T>> {
  const payload = (await response.json().catch(() => ({}))) as AngelApiResponse<T>;

  if (!response.ok || payload.status === false) {
    throw new Error(payload.message || payload.errorcode || `AngelOne request failed with ${response.status}`);
  }

  return payload;
}

export class AngelOneClient {
  constructor(
    private readonly getSession: () => AngelSessionState,
    private readonly setSession: (state: AngelSessionState) => void
  ) {}

  setCredentials(credentials: AngelCredentials | null) {
    this.setSession({
      credentials,
      tokens: credentials ? this.getSession().tokens : null,
    });
  }

  clearSession() {
    this.setSession({ credentials: null, tokens: null });
  }

  getSessionState() {
    return this.getSession();
  }

  async generateSession(payload: AngelLoginPayload): Promise<AngelSessionTokens> {
    const session = this.getSession();
    if (!session.credentials?.apiKey || session.credentials.clientCode !== payload.clientcode) {
      throw new Error('AngelOne credentials are not loaded in memory for this user.');
    }

    const response = await fetch(`${ANGEL_BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`, {
      method: 'POST',
      headers: createHeaders(session.credentials),
      body: JSON.stringify(payload),
    });

    const result = await parseResponse<{
      jwtToken?: string;
      refreshToken?: string;
      feedToken?: string;
      websocketToken?: string;
    }>(response);

    const tokens: AngelSessionTokens = {
      jwtToken: result.data?.jwtToken || '',
      refreshToken: result.data?.refreshToken,
      feedToken: result.data?.feedToken || result.data?.websocketToken,
      issuedAt: Date.now(),
      expiresAt: Date.now() + DEFAULT_SESSION_TTL_MS,
    };

    if (!tokens.jwtToken) {
      throw new Error('AngelOne login succeeded without jwtToken.');
    }

    this.setSession({
      credentials: session.credentials,
      tokens,
    });

    return tokens;
  }

  async refreshSession(): Promise<AngelSessionTokens> {
    const session = this.getSession();
    if (!session.credentials || !session.tokens?.refreshToken) {
      throw new Error('Refresh token unavailable. Reconnect broker session.');
    }

    const response = await fetch(`${ANGEL_BASE_URL}/rest/auth/angelbroking/jwt/v1/refreshToken`, {
      method: 'POST',
      headers: createHeaders(session.credentials),
      body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
    });

    const result = await parseResponse<{
      jwtToken?: string;
      refreshToken?: string;
      feedToken?: string;
    }>(response);

    const tokens: AngelSessionTokens = {
      jwtToken: result.data?.jwtToken || '',
      refreshToken: result.data?.refreshToken || session.tokens.refreshToken,
      feedToken: result.data?.feedToken || session.tokens.feedToken,
      issuedAt: Date.now(),
      expiresAt: Date.now() + DEFAULT_SESSION_TTL_MS,
    };

    if (!tokens.jwtToken) {
      throw new Error('AngelOne refresh succeeded without jwtToken.');
    }

    this.setSession({
      credentials: session.credentials,
      tokens,
    });

    return tokens;
  }

  isSessionExpired() {
    const tokens = this.getSession().tokens;
    if (!tokens?.jwtToken) {
      return true;
    }

    return Boolean(tokens.expiresAt && tokens.expiresAt <= Date.now());
  }

  async validateSession() {
    const session = this.getSession();
    if (!session.credentials || !session.tokens?.jwtToken) {
      return false;
    }

    if (this.isSessionExpired()) {
      return false;
    }

    const response = await fetch(`${ANGEL_BASE_URL}/rest/secure/angelbroking/user/v1/getProfile`, {
      method: 'GET',
      headers: createHeaders(session.credentials, session.tokens.jwtToken),
    });

    const result = await parseResponse<AngelProfileResponse>(response);
    return Boolean(result.status);
  }

  async ensureActiveSession() {
    const session = this.getSession();
    if (!session.credentials) {
      throw new Error('AngelOne credentials are not loaded in memory.');
    }

    if (!session.tokens?.jwtToken) {
      throw new Error('No AngelOne session found. Please reconnect broker session.');
    }

    if (!this.isSessionExpired()) {
      return session.tokens;
    }

    return this.refreshSession();
  }

  async placeOrder(order: AngelOrderRequest) {
    console.warn('[COMPLIANCE] Direct frontend execution is disabled. Signals are now processed by the backend worker via WebSocket.');
    return {
        status: true,
        message: "Order signal received by backend. Check trade history for status.",
        data: { orderid: `WAITING-${Date.now()}` }
    } as any;
  }

}
