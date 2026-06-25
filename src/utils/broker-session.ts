/**
 * Server-side broker readiness uses User.broker_connected in MongoDB (SignalBroadcastService).
 * Do NOT treat localStorage.angel_jwt as connected — it survives migration resets.
 */
export function isServerBrokerConnected(user?: { broker_connected?: boolean } | null): boolean {
  return user?.broker_connected === true;
}

export function clearStaleBrokerLocalCache(): void {
  try {
    localStorage.removeItem('angel_jwt');
    localStorage.removeItem('angel_clientcode');
  } catch {
    /* ignore */
  }
}

export function syncAuthUserBrokerFlags(partial: {
  broker_connected?: boolean;
  broker_verified?: boolean;
  requiresReconnect?: boolean;
}): void {
  try {
    const raw = localStorage.getItem('authUser');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    localStorage.setItem(
      'authUser',
      JSON.stringify({
        ...parsed,
        ...partial,
      })
    );
  } catch {
    /* ignore */
  }
}
