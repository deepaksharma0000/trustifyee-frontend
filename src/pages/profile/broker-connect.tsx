import * as React from 'react';
import { useState } from 'react';
import { Alert, Card, Typography, Box, TextField, Divider, Stack, Button, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, IconButton, Chip } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useAuthUser } from 'src/hooks/use-auth-user';
import { useBoolean } from 'src/hooks/use-boolean';
import Iconify from 'src/components/iconify';
import axios from 'src/utils/axios';
import { syncAuthUserBrokerFlags } from 'src/utils/broker-session';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const MASKED_CREDENTIAL = '********';

const isMaskedCredential = (value?: string | null) => {
  const clean = String(value || '').trim();
  return clean === MASKED_CREDENTIAL || clean.endsWith('...') || clean.startsWith('enc::');
};

const savedOrEmpty = (value?: string | null) => (value && isMaskedCredential(value) ? MASKED_CREDENTIAL : value || '');

type BrokerOption = 'AngelOne' | 'AliceBlue' | 'Zerodha' | 'Upstox';

function getBrokerDisplayLabel(item: BrokerOption): string {
  if (item === 'AngelOne') return 'Angel One';
  if (item === 'AliceBlue') return 'Alice Blue';
  return item;
}

function resolveIsConnected(
  selectedBroker: BrokerOption,
  user: { broker?: string; broker_connected?: boolean },
  zerodhaStatus: 'connected' | 'disconnected' | 'expired' | null
): boolean {
  if (selectedBroker === 'Zerodha') {
    return zerodhaStatus === 'connected' || (user.broker === 'Zerodha' && !!user.broker_connected);
  }
  if (selectedBroker === 'Upstox') {
    return user.broker === 'Upstox' && !!user.broker_connected;
  }
  return !!user.broker_connected;
}

export default function BrokerConnect() {
  const { user } = useAuthUser();

  const isSuperAdmin = user?.role === 'admin';
  const isSubAdmin = user?.role === 'sub-admin';
  const isAdmin = isSuperAdmin || isSubAdmin;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const confirm = useBoolean();
  const [broker, setBroker] = useState<'AngelOne' | 'AliceBlue' | 'Zerodha' | 'Upstox'>(user?.broker as any || 'AngelOne');
  
  const [formData, setFormData] = useState({
    client_code: '',
    password: '',
    api_key: '', 
    api_secret: '',
    totp: '',
    totp_secret: ''
  });

  const [agentData, setAgentData] = useState<any>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const fetchAgentStatus = React.useCallback(async () => {
    if (broker !== 'AngelOne') return;
    setAgentLoading(true);
    try {
      const res = await axios.get('/api/angelone/auth/agent-status');
      if (res.data.status) {
        setAgentData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch agent status", err);
    } finally {
      setAgentLoading(false);
    }
  }, [broker]);

  const fetchRouteStatus = React.useCallback(async () => {
    if (broker !== 'AngelOne') return;
    setRouteLoading(true);
    try {
      const res = await axios.get('/api/execution/route-status');
      if (res.data?.status === 'success') {
        setRouteData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch route status', err);
    } finally {
      setRouteLoading(false);
    }
  }, [broker]);

  React.useEffect(() => {
    fetchAgentStatus();
    fetchRouteStatus();
    const interval = setInterval(() => {
      fetchAgentStatus();
      fetchRouteStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAgentStatus, fetchRouteStatus]);

  React.useEffect(() => {
    if (user) {
      if (user.broker) setBroker(user.broker as any);
      const savedClientCode = user.client_code || user.client_key;
      setFormData((prev) => ({
        ...prev,
        client_code: savedOrEmpty(savedClientCode),
        password: isMaskedCredential(user.broker_password) ? MASKED_CREDENTIAL : '',
        api_key: isMaskedCredential(user.api_key) ? MASKED_CREDENTIAL : '',
        api_secret: '',
        totp_secret: isMaskedCredential(user.broker_totp_secret) ? MASKED_CREDENTIAL : '',
      }));
    }
  }, [user]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const zerodhaResult = params.get('zerodha');
    if (zerodhaResult === 'connected') {
      setSuccess('Zerodha connected successfully! Refreshing...');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => window.location.reload(), 1200);
    } else if (zerodhaResult === 'error') {
      setError(decodeURIComponent(params.get('message') || 'Zerodha connection failed'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const [zerodhaStatus, setZerodhaStatus] = React.useState<'connected' | 'disconnected' | 'expired' | null>(null);

  React.useEffect(() => {
    if (broker !== 'Zerodha' || !user || isAdmin) return;
    axios.get('/api/zerodha/status')
      .then((res) => setZerodhaStatus(res.data?.status || 'disconnected'))
      .catch(() => setZerodhaStatus('disconnected'));
  }, [broker, user, isAdmin]);

  if (!user) {
    return <Alert severity="error">Session expired. Please login again.</Alert>;
  }
  
  if (!isAdmin && user.licence !== 'Live') {
    return (
      <Alert severity="info" sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
        Demo users cannot connect broker. Please upgrade to Live license.
      </Alert>
    );
  }

  const isConnected = resolveIsConnected(broker, user, zerodhaStatus);

  const handleAliceConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const clientCodeToUse = formData.client_code === MASKED_CREDENTIAL ? user.client_code || user.client_key : formData.client_code;
      if (!clientCodeToUse) throw new Error("Please enter your Alice Blue Client Code first");
      
      const res = await axios.get(`/api/alice/auth/login-url?clientcode=${clientCodeToUse}`);
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("Could not generate login URL");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpstoxConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/upstox/auth/url');
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('Could not generate Upstox login URL');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleZerodhaConnect = async () => {
    if (isAdmin) {
      setError('Zerodha connect is for client accounts. Please login as a Live client user.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, string> = {};
      const clientCode = formData.client_code === MASKED_CREDENTIAL ? '' : formData.client_code.trim();
      if (clientCode) payload.client_key = clientCode.toUpperCase();
      if (formData.api_key && formData.api_key !== MASKED_CREDENTIAL) payload.api_key = formData.api_key;
      if (formData.api_secret) payload.api_secret = formData.api_secret;

      const res = await axios.post('/api/zerodha/connect', payload);
      if (res.data.auth_url) {
        window.location.href = res.data.auth_url;
      } else {
        throw new Error(res.data.message || 'Could not generate Zerodha login URL');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleZerodhaDisconnect = async () => {
    setLoading(true);
    try {
      await axios.post('/api/zerodha/disconnect');
      setSuccess('Disconnected from Zerodha. Refreshing...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAngelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const clientCode = formData.client_code === MASKED_CREDENTIAL ? '' : formData.client_code.trim().toUpperCase();
    const password = formData.password === MASKED_CREDENTIAL ? '' : formData.password;
    const apiKey = formData.api_key === MASKED_CREDENTIAL ? '' : formData.api_key.trim();
    const totpSecret = formData.totp_secret === MASKED_CREDENTIAL ? '' : formData.totp_secret.trim().toUpperCase();
    const manualTotp = formData.totp.trim();

    const hasSavedClientCode = isMaskedCredential(user.client_code || user.client_key);
    const hasSavedPassword = isMaskedCredential(user.broker_password);
    const hasSavedApiKey = isMaskedCredential(user.api_key);
    const hasSavedTotpSecret = isMaskedCredential(user.broker_totp_secret);

    if (!clientCode && !hasSavedClientCode) {
      setLoading(false);
      setError('Client Code is required.');
      return;
    }
    if (!password && !hasSavedPassword) {
      setLoading(false);
      setError('Password is required.');
      return;
    }
    if (!apiKey && !hasSavedApiKey) {
      setLoading(false);
      setError('SmartAPI Key is required.');
      return;
    }
    if (!totpSecret && !hasSavedTotpSecret) {
      setLoading(false);
      setError('TOTP Secret Key is required for automated live trade execution.');
      return;
    }

    const payload = {
      broker: 'AngelOne',
      client_code: clientCode,
      client_key: clientCode,
      password,
      api_key: apiKey,
      totp: manualTotp,
      totp_secret: totpSecret,
    };

    try {
      const res = await axios.post('/api/angelone/auth/generate-session', payload);

      if (res.data.status) {
        setSuccess('Broker connected successfully! Redirecting...');
        localStorage.setItem('angel_clientcode', res.data.clientcode);
        localStorage.setItem('angel_jwt', 'connected_manually');
        syncAuthUserBrokerFlags({
          broker_connected: true,
          broker_verified: true,
          requiresReconnect: false,
        });

        setTimeout(() => {
          window.location.href = '/dashboard/banking';
        }, 1500);
      } else {
        throw new Error(res.data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const currentVpsIp = routeData?.detectedOutboundIp || routeData?.configuredPublicIp || '';
  const routeVerificationRegistered = Boolean(routeData?.brokerWhitelistMatch && (user as any)?.api_key_ip_pair_verified);
  const routeVerificationLabel = routeVerificationRegistered ? 'IP Registered' : 'IP Not Registered';
  const routeVerificationColor = routeVerificationRegistered ? 'success' : 'warning';

  const renderBrokerConnectPanel = () => {
    if (broker === 'AliceBlue') {
      return (
        <Box>
          <TextField
            fullWidth
            label="Alice Blue Client ID"
            placeholder="e.g. 123456"
            value={formData.client_code}
            onChange={(e) => setFormData({ ...formData, client_code: e.target.value.toUpperCase() })}
            sx={{ mb: 3 }}
            disabled={loading}
            helperText={formData.client_code === MASKED_CREDENTIAL ? "Using saved Client ID" : "Your Alice Blue login ID"}
          />
          <LoadingButton
            fullWidth
            variant="contained"
            onClick={handleAliceConnect}
            loading={loading}
            color="primary"
            size="large"
            sx={{ py: 1.5, fontWeight: 800, fontSize: 16 }}
            startIcon={<Iconify icon="solar:link-bold" />}
          >
            Connect Alice Blue
          </LoadingButton>
          <Typography variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
            You will be redirected to Alice Blue for secure login
          </Typography>
        </Box>
      );
    }

    if (broker === 'Upstox') {
      return (
        <Box>
          <LoadingButton
            fullWidth
            variant="contained"
            onClick={handleUpstoxConnect}
            loading={loading}
            color="primary"
            size="large"
            sx={{ py: 1.5, fontWeight: 800, fontSize: 16 }}
            startIcon={<Iconify icon="simple-icons:upstox" />}
          >
            {isConnected ? 'Re-Connect Upstox' : 'Connect Upstox'}
          </LoadingButton>
          <Typography variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
            You will be redirected to Upstox for secure OAuth login
          </Typography>
        </Box>
      );
    }

    if (broker === 'Zerodha') {
      return (
        <Box>
          {isAdmin && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Zerodha OAuth is configured for Live client users. Admins manage client broker connections from the client panel.
            </Alert>
          )}
          <TextField
            fullWidth
            label="Client Code (optional)"
            placeholder="Your Kite user ID"
            value={formData.client_code}
            onChange={(e) => setFormData({ ...formData, client_code: e.target.value.toUpperCase() })}
            sx={{ mb: 2 }}
            disabled={loading}
            helperText="Auto-filled from Kite after login if left empty"
          />
          <TextField
            fullWidth
            label="Kite API Key (optional)"
            placeholder="Your SmartAPI Private Key (required)"
            value={formData.api_key}
            onChange={(e) => setFormData({ ...formData, api_key: e.target.value.trim() })}
            sx={{ mb: 2 }}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Kite API Secret (optional)"
            type="password"
            value={formData.api_secret}
            onChange={(e) => setFormData({ ...formData, api_secret: e.target.value.trim() })}
            sx={{ mb: 3 }}
            disabled={loading}
          />
          <Stack spacing={2}>
            <LoadingButton
              fullWidth
              variant="contained"
              onClick={handleZerodhaConnect}
              loading={loading}
              color="primary"
              size="large"
              disabled={isAdmin}
              sx={{ py: 1.5, fontWeight: 800, fontSize: 16 }}
              startIcon={<Iconify icon="simple-icons:zerodha" />}
            >
              {isConnected ? 'Re-Connect Zerodha' : 'Connect Zerodha'}
            </LoadingButton>
            {zerodhaStatus === 'expired' && (
              <Alert severity="warning">Zerodha session expired. Please reconnect.</Alert>
            )}
            {isConnected && (
              <LoadingButton
                fullWidth
                variant="outlined"
                color="error"
                loading={loading}
                onClick={handleZerodhaDisconnect}
                startIcon={<Iconify icon="solar:link-break-bold" />}
              >
                Disconnect Zerodha
              </LoadingButton>
            )}
          </Stack>
          <Typography variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
            You will be redirected to Kite for secure login. Session expires daily.
          </Typography>
        </Box>
      );
    }

    return (
      <Box component="form" onSubmit={handleAngelSubmit}>
        <TextField
          fullWidth
          label="Client Code"
          autoComplete="username"
          placeholder="e.g. A123456"
          value={formData.client_code}
          onChange={(e) => setFormData({ ...formData, client_code: e.target.value.toUpperCase() })}
          sx={{ mb: 2 }}
          disabled={loading}
          helperText={formData.client_code === MASKED_CREDENTIAL ? "Using saved Client ID" : ""}
        />
        <TextField
          fullWidth
          label="Password"
          type={formData.password === MASKED_CREDENTIAL ? "text" : "password"}
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          sx={{ mb: 2.5 }}
          disabled={loading}
          helperText={formData.password === MASKED_CREDENTIAL ? "Using saved Password" : ""}
        />
        <TextField
          fullWidth
          label="SmartAPI Key"
          placeholder="e.g. iSYTk7nA"
          value={formData.api_key}
          onChange={(e) => setFormData({ ...formData, api_key: e.target.value.trim() })}
          sx={{ mb: 2.5 }}
          disabled={loading}
          helperText={formData.api_key === MASKED_CREDENTIAL ? "Using saved API Key" : "Required for SmartAPI Authentication"}
        />

        <Divider sx={{ mb: 2.5, borderStyle: 'dashed' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>
            TOTP Method
          </Typography>
        </Divider>

        <TextField
          fullWidth
          label="TOTP Secret Key (Auto-Login)"
          placeholder="16-character secret from AngelOne"
          value={formData.totp_secret}
          onChange={(e) => setFormData({ ...formData, totp_secret: e.target.value.trim().toUpperCase() })}
          sx={{ mb: 2 }}
          disabled={loading}
          required={!isMaskedCredential(user.broker_totp_secret)}
          helperText={formData.totp_secret === MASKED_CREDENTIAL ? "Using saved TOTP Secret" : "Required for automated live trade execution"}
        />

        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>— OR —</Typography>
        </Box>

        <TextField
          fullWidth
          label="Manual 6-Digit TOTP"
          placeholder="Enter code from Google Authenticator"
          value={formData.totp}
          onChange={(e) => setFormData({ ...formData, totp: e.target.value })}
          sx={{ mb: 4 }}
          disabled={loading}
          inputProps={{ maxLength: 6 }}
          helperText="Leave empty if using TOTP Secret Key"
        />

        <Stack spacing={2}>
          <LoadingButton
            fullWidth
            variant="contained"
            type="submit"
            loading={loading}
            color="primary"
            size="large"
            sx={{ py: 1.5, fontWeight: 800, fontSize: 16 }}
            startIcon={<Iconify icon="solar:bolt-bold" />}
          >
            {isConnected ? 'Re-Sync Session' : 'Login & Connect'}
          </LoadingButton>

          {isConnected && (
            <LoadingButton
              fullWidth
              variant="outlined"
              color="error"
              loading={loading}
              onClick={confirm.onTrue}
              sx={{ py: 1.2, fontWeight: 700, borderStyle: 'dashed' }}
              startIcon={<Iconify icon="solar:link-break-bold" />}
            >
              Disconnect Broker
            </LoadingButton>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: broker === 'AngelOne' ? 1200 : 500, mx: 'auto', mt: 4, px: 2 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={broker === 'AngelOne' ? 5 : 12}>
          <Card sx={{ p: 4, boxShadow: (theme) => theme.customShadows.z20 }}>
            <Stack spacing={0.5} sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>Connect Broker</Typography>
              <Typography variant="body2" color="text.secondary">
                {broker === 'AngelOne' && 'Angel One SmartAPI v2 Authentication'}
                {broker === 'AliceBlue' && 'Alice Blue ANT API Authentication'}
                {broker === 'Zerodha' && 'Zerodha Kite Connect OAuth'}
                {broker === 'Upstox' && 'Upstox Pro OAuth Authentication'}
              </Typography>
            </Stack>

            <Box sx={{ mb: 3 }}>
               <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 700, mb: 1, display: 'block' }}>
                 SELECT BROKER
               </Typography>
               <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(['AngelOne', 'Zerodha', 'Upstox', 'AliceBlue'] as const).map((item) => (
                  <Box 
                    key={item}
                    onClick={() => setBroker(item)}
                    sx={{ 
                      flex: '1 1 45%', p: 1.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                      border: '2px solid', borderColor: broker === item ? 'primary.main' : 'divider',
                      bgcolor: broker === item ? 'primary.lighter' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: broker === item ? 'primary.dark' : 'text.secondary' }}>
                      {getBrokerDisplayLabel(item)}
                    </Typography>
                  </Box>
                  ))}
               </Stack>
            </Box>

            {isConnected && (
              <Alert severity="success" sx={{ mb: 3 }} icon={<Iconify icon="solar:check-circle-bold" />}>
                Broker is currently active for today&apos;s session.
              </Alert>
            )}

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            {renderBrokerConnectPanel()}
            <Stack spacing={1.5} sx={{ mt: 4, p: 2, bgcolor: 'background.neutral', borderRadius: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:info-circle-bold" sx={{ color: 'info.main' }} width={18} />
                <Typography variant="subtitle2">Security Guide</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                • <b>TOTP Secret:</b> Stored encrypted. Used for automated login at trade start.<br />
                • <b>Auth Tokens:</b> We only save session tokens to execute trades on your behalf.<br />
                • <b>Session:</b> Broker sessions expire daily at midnight.
              </Typography>
            </Stack>
          </Card>
        </Grid>

        {broker === 'AngelOne' && (
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 4, height: '100%', boxShadow: (theme) => theme.customShadows.z20 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
                Decentralized Execution Agent
              </Typography>

              {agentData ? (
                <Stack spacing={3}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral', border: '1px solid', borderColor: 'divider' }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                        CURRENT VPS PUBLIC IP
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                          {routeLoading && !currentVpsIp ? 'Loading...' : currentVpsIp || 'Unavailable'}
                        </Typography>
                        {currentVpsIp && (
                          <Tooltip title="Copy IP">
                            <IconButton size="small" onClick={() => handleCopy(currentVpsIp)}>
                              <Iconify icon="solar:copy-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                        WHITELIST STATUS
                      </Typography>
                      <Chip label={routeVerificationLabel} color={routeVerificationColor as any} size="small" sx={{ fontWeight: 700 }} />
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Angel One does not expose a portal API to read the broker developer-dashboard whitelist directly.
                    This screen verifies the saved API key/IP pair we store after a successful connection and shows the current VPS egress IP used by the server.
                  </Typography>

                  {agentData.justCreated && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      <b>CRITICAL:</b> Copy your Agent Secret Key now! For security reasons, this token will not be displayed in full again.
                    </Alert>
                  )}

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>STATUS</Typography>
                        <Chip
                          label={agentData.agentStatus}
                          color={agentData.agentStatus === 'ONLINE' ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>CONNECTED IP</Typography>
                        <Tooltip title="Outbound public IP reported by the local running agent. Register this IP inside your Angel One API whitelist setting.">
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', cursor: 'help' }}>
                            {agentData.connectedIp}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>HEARTBEAT</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {agentData.lastHeartbeat ? new Date(agentData.lastHeartbeat).toLocaleTimeString() : 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>VERSION</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          v{agentData.version}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Stack spacing={2} sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Agent Credentials</Typography>
                      <Chip label="Config Required" size="small" variant="outlined" color="warning" sx={{ height: 20 }} />
                    </Stack>
                    
                    <TextField
                      fullWidth
                      label="Agent ID"
                      value={agentData.agentId}
                      size="small"
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <IconButton onClick={() => handleCopy(agentData.agentId)}>
                            <Iconify icon="solar:clippy-bold" width={16} />
                          </IconButton>
                        )
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Agent Secret Token"
                      value={agentData.agentSecret}
                      size="small"
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <IconButton onClick={() => handleCopy(agentData.agentSecret)}>
                            <Iconify icon="solar:clippy-bold" width={16} />
                          </IconButton>
                        )
                      }}
                    />
                  </Stack>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Setup & Installation</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.6 }}>
                      • Ensure Node.js (LTS) is installed on your execution PC/VPS.<br />
                      • Download the precompiled agent ZIP archive below.<br />
                      • Copy and define `AGENT_ID` and `AGENT_SECRET` inside local `.env` configuration file.<br />
                      • Start the service by running `node index.js`.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Iconify icon="solar:download-bold" />}
                      size="small"
                      href="/uploads/agent.zip"
                      download="agent.zip"
                    >
                      Download Agent ZIP
                    </Button>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed' }} />

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Order Execution Logs (Edge Agent)</Typography>
                    {agentData.logs && agentData.logs.length > 0 ? (
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ bgcolor: 'background.neutral' }}>Time</TableCell>
                              <TableCell sx={{ bgcolor: 'background.neutral' }}>Symbol</TableCell>
                              <TableCell sx={{ bgcolor: 'background.neutral' }}>Action</TableCell>
                              <TableCell sx={{ bgcolor: 'background.neutral' }}>Status</TableCell>
                              <TableCell sx={{ bgcolor: 'background.neutral' }}>IP Used</TableCell>
                              <TableCell sx={{ bgcolor: 'background.neutral' }}>Route</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {agentData.logs.map((logItem: any, idx: number) => (
                              <TableRow key={idx} hover>
                                <TableCell sx={{ fontSize: 11 }}>{new Date(logItem.timestamp).toLocaleTimeString()}</TableCell>
                                <TableCell sx={{ fontSize: 11, fontWeight: 'bold' }}>{logItem.tradingsymbol}</TableCell>
                                <TableCell sx={{ fontSize: 11 }}>{logItem.action}</TableCell>
                                <TableCell sx={{ fontSize: 11 }}>
                                  <Chip
                                    label={logItem.status}
                                    color={logItem.status === 'SUCCESS' ? 'success' : 'error'}
                                    size="small"
                                    sx={{ height: 16, fontSize: 9, fontWeight: 'bold' }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: 11 }}>{logItem.usedIp}</TableCell>
                                <TableCell sx={{ fontSize: 11 }}>{logItem.networkRoute}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 2, textAlign: 'center' }}>
                        No execution logs registered on this agent.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ) : (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Loading agent diagnostics data...</Typography>
                </Box>
              )}
            </Card>
          </Grid>
        )}
      </Grid>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Terminate Broker Session?"
        content="This will immediately log you out from the broker API. Your active strategies will stop executing until you reconnect."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                const clientToDisconnect = user.client_code || user.client_key || "";
                await axios.post('/api/auth/logout', { clientcode: clientToDisconnect });
                setSuccess('Disconnected successfully. Refreshing...');
                confirm.onFalse();
                setTimeout(() => window.location.reload(), 1500);
              } catch (err: any) {
                setError(err.response?.data?.error || "Disconnect failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            Disconnect Now
          </Button>
        }
      />
    </Box>
  );
}
