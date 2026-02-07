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
  const API_BASE = process.env.REACT_APP_HOST_API || process.env.REACT_APP_API_BASE_URL || '';

  if (!user) {
    return <Alert severity="error">Session expired. Please login again.</Alert>;
  }

  if (user.licence !== 'Live') {
    return <Alert severity="info">Demo users cannot connect broker.</Alert>;
  }

  // const handleConnect = async () => {
  //   try {
  //     setLoading(true);
  //     setError('');

  //     const res = await fetch('http://localhost:4000/api/auth/login', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(form),
  //     });

  //     const result = await res.json();

  //     if (!result.ok) {
  //       throw new Error('AngelOne login failed');
  //     }

  //     // ✅ MARK BROKER AS CONNECTED (FRONTEND STATE)
  //     const updatedUser = {
  //       ...user,
  //       broker_connected: true,
  //       broker: 'AngelOne',
  //     };

  //     localStorage.setItem('authUser', JSON.stringify(updatedUser));

  //     // 👉 Dashboard unlock
  //     navigate('/dashboard');
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to connect AngelOne');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleConnect = async () => {
  try {
    setLoading(true);
    setError('');

    // 1️⃣ ANGEL LOGIN
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const result = await res.json();

    if (!result.ok) {
      throw new Error('AngelOne login failed');
    }

    /**
     * result.data se aata hai:
     * - jwtToken
     * - refreshToken
     * - feedToken
     */

    // 2️⃣ SAVE ANGEL SESSION (🔥 MOST IMPORTANT)
    localStorage.setItem('angel_jwt', result.data.jwtToken);
    localStorage.setItem('angel_refresh', result.data.refreshToken);
    localStorage.setItem('angel_feed', result.data.feedToken);

    // 3️⃣ INSTRUMENT SYNC (🔥 REQUIRED BEFORE OPTION CHAIN)
    const accessToken =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');

    await fetch(`${API_BASE}/api/instruments/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 4️⃣ UPDATE AUTH USER (UI PURPOSE)
    const updatedUser = {
      ...user,
      broker_connected: true,
      broker: 'AngelOne',
    };

    localStorage.setItem('authUser', JSON.stringify(updatedUser));

    // 5️⃣ REDIRECT → DASHBOARD
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
