import * as React from 'react';
import { useState } from 'react';
import { Alert, Card, Typography, Box, TextField, Divider, Stack } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useAuthUser } from 'src/hooks/use-auth-user';
import { useBoolean } from 'src/hooks/use-boolean';
import Iconify from 'src/components/iconify';
import axios from 'src/utils/axios';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { Button } from '@mui/material';

// ----------------------------------------------------------------------

export default function BrokerConnect() {
  const { user } = useAuthUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const confirm = useBoolean();
  const [broker, setBroker] = useState<'AngelOne' | 'AliceBlue'>(user?.broker as any || 'AngelOne');
  
  const [formData, setFormData] = useState({
    client_code: '',
    password: '',
    api_key: '', 
    totp: '',
    totp_secret: ''
  });

  React.useEffect(() => {
    if (user) {
      if (user.broker) setBroker(user.broker as any);
      setFormData((prev) => ({
        ...prev,
        client_code: user.client_code === '********' ? '********' : (user.client_key || ''),
        password: user.broker_password === '********' ? '********' : '',
        api_key: user.api_key === '********' ? '********' : '',
        totp_secret: user.broker_totp_secret === '********' ? '********' : '',
      }));
    }
  }, [user]);

  if (!user) {
    return <Alert severity="error">Session expired. Please login again.</Alert>;
  }

  const isSuperAdmin = user?.role === 'admin';
  const isSubAdmin = user?.role === 'sub-admin';
  const isAdmin = isSuperAdmin || isSubAdmin;
  
  if (!isAdmin && user.licence !== 'Live') {
    return (
      <Alert severity="info" sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
        Demo users cannot connect broker. Please upgrade to Live license.
      </Alert>
    );
  }

  const isConnected = user.broker_connected;

  const handleAliceConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const clientCodeToUse = formData.client_code === '********' ? user.client_key : formData.client_code;
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

  const handleAngelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      ...formData,
      client_code: formData.client_code === '********' ? '' : formData.client_code,
      password: formData.password === '********' ? '' : formData.password,
      api_key: formData.api_key === '********' ? '' : formData.api_key,
      totp_secret: formData.totp_secret === '********' ? '' : formData.totp_secret,
    };

    try {
      const res = await axios.post('/api/angelone/auth/generate-session', payload);

      if (res.data.status) {
        setSuccess('Broker connected successfully! Redirecting...');
        localStorage.setItem('angel_clientcode', res.data.clientcode);
        localStorage.setItem('angel_jwt', 'connected_manually');

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

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, px: 2 }}>
      <Card sx={{ p: 4, boxShadow: (theme) => theme.customShadows.z20 }}>
        <Stack spacing={0.5} sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Connect Broker</Typography>
          <Typography variant="body2" color="text.secondary">
            {broker === 'AngelOne' ? 'Angel One SmartAPI v2 Authentication' : 'Alice Blue ANT API Authentication'}
          </Typography>
        </Stack>

        <Box sx={{ mb: 3 }}>
           <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 700, mb: 1, display: 'block' }}>
             SELECT BROKER
           </Typography>
           <Stack direction="row" spacing={1}>
              <Box 
                onClick={() => setBroker('AngelOne')}
                sx={{ 
                  flex: 1, p: 1.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                  border: '2px solid', borderColor: broker === 'AngelOne' ? 'primary.main' : 'divider',
                  bgcolor: broker === 'AngelOne' ? 'primary.lighter' : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                <Typography variant="subtitle2" sx={{ color: broker === 'AngelOne' ? 'primary.dark' : 'text.secondary' }}>Angel One</Typography>
              </Box>
              <Box 
                onClick={() => setBroker('AliceBlue')}
                sx={{ 
                  flex: 1, p: 1.5, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                  border: '2px solid', borderColor: broker === 'AliceBlue' ? 'primary.main' : 'divider',
                  bgcolor: broker === 'AliceBlue' ? 'primary.lighter' : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                <Typography variant="subtitle2" sx={{ color: broker === 'AliceBlue' ? 'primary.dark' : 'text.secondary' }}>Alice Blue</Typography>
              </Box>
           </Stack>
        </Box>

        {isConnected && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<Iconify icon="solar:check-circle-bold" />}>
            Broker is currently active for today&apos;s session.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {broker === 'AliceBlue' ? (
          <Box>
             <TextField
              fullWidth
              label="Alice Blue Client ID"
              placeholder="e.g. 123456"
              value={formData.client_code}
              onChange={(e) => setFormData({ ...formData, client_code: e.target.value.toUpperCase() })}
              sx={{ mb: 3 }}
              disabled={loading}
              helperText={formData.client_code === '********' ? "Using saved Client ID" : "Your Alice Blue login ID"}
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
        ) : (
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
              helperText={formData.client_code === '********' ? "Using saved Client ID" : ""}
            />
            <TextField
              fullWidth
              label="Password"
              type={formData.password === '********' ? "text" : "password"}
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              sx={{ mb: 2.5 }}
              disabled={loading}
              helperText={formData.password === '********' ? "Using saved Password" : ""}
            />
            {isAdmin && (
              <TextField
                fullWidth
                label="SmartAPI Key"
                placeholder="e.g. iSYTk7nA"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value.trim() })}
                sx={{ mb: 2.5 }}
                disabled={loading}
                helperText={formData.api_key === '********' ? "Using saved API Key" : "Required for 1.1 April Rule"}
              />
            )}

            {isAdmin && (
              <Divider sx={{ mb: 2.5, borderStyle: 'dashed' }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>
                  TOTP Method
                </Typography>
              </Divider>
            )}

            {isAdmin && (
              <>
                <TextField
                  fullWidth
                  label="TOTP Secret Key (Auto-Login)"
                  placeholder="16-character secret from AngelOne"
                  value={formData.totp_secret}
                  onChange={(e) => setFormData({ ...formData, totp_secret: e.target.value.trim().toUpperCase() })}
                  sx={{ mb: 2 }}
                  disabled={loading}
                  helperText={formData.totp_secret === '********' ? "Using saved TOTP Secret" : "Provide this to enable one-click login"}
                />

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>— OR —</Typography>
                </Box>
              </>
            )}

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
        )}
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
                const clientToDisconnect = user.client_key || "";
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
