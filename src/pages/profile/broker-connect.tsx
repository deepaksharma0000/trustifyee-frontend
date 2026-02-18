import * as React from 'react';
import { useState } from 'react';
import { Alert, Card, Typography, Box, Link, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useAuthUser } from 'src/hooks/use-auth-user';
import { HOST_API } from 'src/config-global';
import Iconify from 'src/components/iconify';
import axios from 'src/utils/axios';

export default function BrokerConnect() {
  const { user } = useAuthUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    client_code: '',
    password: '',
    totp: ''
  });

  if (!user) {
    return <Alert severity="error">Session expired. Please login again.</Alert>;
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'sub-admin';

  if (!isAdmin && user.licence !== 'Live') {
    return (
      <Alert severity="info" sx={{ mt: 3 }}>
        Demo users cannot connect broker. Please upgrade to Live license.
      </Alert>
    );
  }

  // Check if broker is connected for today
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
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 5 }}>
      <Card sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 1, textAlign: 'center' }}>
          Connect AngelOne
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
          SmartAPI v2 Manual Login (Password + TOTP)
        </Typography>

        {isConnected && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<Iconify icon="eva:checkmark-circle-2-fill" />}>
            Your broker is already connected and active for today!
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Angel Client Code"
            placeholder="e.g. A123456"
            value={formData.client_code}
            onChange={(e) => setFormData({ ...formData, client_code: e.target.value })}
            sx={{ mb: 2 }}
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Trading Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            sx={{ mb: 2 }}
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            label="TOTP Code"
            placeholder="Enter code from Authenticator App"
            value={formData.totp}
            onChange={(e) => setFormData({ ...formData, totp: e.target.value })}
            sx={{ mb: 3 }}
            required
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
            sx={{ py: 1.5, fontWeight: 'bold' }}
            startIcon={<Iconify icon="eva:flash-fill" />}
          >
            {isConnected ? 'Re-Connect Session' : 'Generate Session'}
          </LoadingButton>
        </Box>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Iconify icon="eva:info-fill" sx={{ color: 'info.main' }} />
            Security Note:
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • Your Password and TOTP are used only for authentication and are <strong>NEVER</strong> stored in our database.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            • We only store the encrypted Access Token provided by the broker to execute your trades.
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}
