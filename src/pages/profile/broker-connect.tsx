import * as React from 'react';
import { useState } from 'react';
import { Alert, Card, Typography, Box, TextField, Divider, Stack } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useAuthUser } from 'src/hooks/use-auth-user';
import Iconify from 'src/components/iconify';
import axios from 'src/utils/axios';

// ----------------------------------------------------------------------

export default function BrokerConnect() {
  const { user } = useAuthUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    client_code: '',
    password: '',
    api_key: '', // [NEW] Individual API Key
    totp: '',
    totp_secret: ''
  });

  if (!user) {
    return <Alert severity="error">Session expired. Please login again.</Alert>;
  }

  const isSuperAdmin = user?.role === 'admin';
  const isSubAdmin = user?.role === 'sub-admin';
  const isAdmin = isSuperAdmin || isSubAdmin;
  const isUser = user?.role === 'user';

  if (!isAdmin && user.licence !== 'Live') {
    return (
      <Alert severity="info" sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
        Demo users cannot connect broker. Please upgrade to Live license.
      </Alert>
    );
  }

  const isConnected = user.broker_connected;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('/api/angelone/auth/generate-session', formData);

      if (res.data.status) {
        setSuccess('Broker connected successfully! Redirecting...');
        // Save clientcode locally for session checks
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
          <Typography variant="body2" color="text.secondary">Angel One SmartAPI v2 Authentication</Typography>
        </Stack>

        {isConnected && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<Iconify icon="solar:check-circle-bold" />}>
            Broker is currently active for today&apos;s session.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Client Code"
            autoComplete="username"
            placeholder="e.g. A123456"
            value={formData.client_code}
            onChange={(e) => setFormData({ ...formData, client_code: e.target.value.toUpperCase() })}
            sx={{ mb: 2 }}
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            sx={{ mb: 2.5 }}
            required
            disabled={loading}
          />
          {isSuperAdmin && (
            <TextField
              fullWidth
              label="SmartAPI Key (Required for 1.1 April Rule)"
              placeholder="e.g. iSYTk7nA"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value.trim() })}
              sx={{ mb: 2.5 }}
              disabled={loading}
              helperText="Every customer must use their own API Key registered with their Client ID."
            />
          )}

          {isSuperAdmin && (
            <Divider sx={{ mb: 2.5, borderStyle: 'dashed' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>
                TOTP Method
              </Typography>
            </Divider>
          )}

          {isSuperAdmin && (
            <>
              <TextField
                fullWidth
                label="TOTP Secret Key (Auto-Login)"
                placeholder="16-character secret from AngelOne (Recommended)"
                value={formData.totp_secret}
                onChange={(e) => setFormData({ ...formData, totp_secret: e.target.value.trim().toUpperCase() })}
                sx={{ mb: 2 }}
                disabled={loading}
                helperText="Provide this to enable one-click login without your phone."
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
          />

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
        </Box>

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
    </Box>
  );
}
