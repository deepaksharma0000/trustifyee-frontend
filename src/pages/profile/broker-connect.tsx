/* eslint-disable import/no-cycle */
import { useState } from 'react';
import {
  Card,
  TextField,
  Button,
  Alert,
  Typography,
  Box,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';
import { useAuthUser } from 'src/hooks/use-auth-user';
import { BACKEND_API, BROKER_API } from 'src/config-global';

export default function BrokerConnect() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    clientcode: '',
    password: '',
    totp: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return <Alert severity="error">Session expired. Please login again.</Alert>;
  }

  if (user.licence !== 'Live') {
    return <Alert severity="info">Demo users cannot connect broker.</Alert>;
  }

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${BROKER_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (!result.ok) {
        throw new Error('AngelOne login failed');
      }

      localStorage.setItem('angel_jwt', result.data.jwtToken);
      localStorage.setItem('angel_refresh', result.data.refreshToken);
      localStorage.setItem('angel_feed', result.data.feedToken);

      const accessToken =
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken');

      await fetch(`${BACKEND_API}/api/instruments/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const updatedUser = {
        ...user,
        broker_connected: true,
        broker: 'AngelOne',
      };

      localStorage.setItem('authUser', JSON.stringify(updatedUser));

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to connect AngelOne');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 3, maxWidth: 500 }}>
      <Typography variant="h6" gutterBottom>
        Connect AngelOne Account
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Enter your AngelOne credentials to connect your live trading account.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Client Code"
        margin="normal"
        value={form.clientcode}
        onChange={(e) =>
          setForm({ ...form, clientcode: e.target.value })
        }
      />

      <TextField
        fullWidth
        label="Password"
        type="password"
        margin="normal"
        value={form.password}
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
      />

      <TextField
        fullWidth
        label="TOTP"
        margin="normal"
        value={form.totp}
        onChange={(e) =>
          setForm({ ...form, totp: e.target.value })
        }
      />

      <Box mt={2}>
        <Button
          fullWidth
          variant="contained"
          disabled={loading}
          onClick={handleConnect}
        >
          {loading ? 'Connecting...' : 'Connect AngelOne'}
        </Button>
      </Box>
    </Card>
  );
}
