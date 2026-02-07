// @mui
import { useState } from 'react';
import {
  Container,
  Stack,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Paper,
  Card,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useNavigate } from 'react-router-dom';
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

const strategies = [
  'All',
  'Beta',
  'Alpha',
  'Gama',
  'Delta',
  'DELTA',
  'GAMA',
  'ALPHA',
  'BETA',
  'zeta',
  'ZETA',
  'SIGMA',
  'sigma',
];

const tableData = [
  {
    sno: 1,
    time: '11/09/2025 01:03:43',
    type: 'LX',
    symbol: 'BANKNIFTY30SEP2554400CE',
    price: 807.85,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
  {
    sno: 2,
    time: '11/09/2025 12:13:20',
    type: 'LE',
    symbol: 'BANKNIFTY30SEP2554400CE',
    price: 814.45,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: '-',
  },
  {
    sno: 3,
    time: '11/09/2025 12:10:45',
    type: 'LX',
    symbol: 'SENSEX11SEP2581300CE',
    price: 261.5,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
  {
    sno: 4,
    time: '11/09/2025 12:10:45',
    type: 'LX',
    symbol: 'BANKNIFTY30SEP2554500CE',
    price: 740.9,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
  {
    sno: 5,
    time: '11/09/2025 12:07:43',
    type: 'LX',
    symbol: 'BANKNIFTY30SEP2554400PE',
    price: 322.75,
    strategy: 'Gama',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
];

// ----------------------------------------------------------------------

export default function AllSignalsView() {
  const navigate = useNavigate();
  const [tradingEnabled, setTradingEnabled] = useState(
    localStorage.getItem('trading_enabled') === 'true'
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    clientcode: '',
    password: '',
    totp: '',
  });

  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';
  const accessToken =
    localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

  const handleEnable = () => {
    const isBrokerConnected = localStorage.getItem('angel_jwt') !== null;
    if (!isBrokerConnected) {
      setLoginOpen(true);
      return;
    }

    localStorage.setItem('trading_enabled', 'true');
    setTradingEnabled(true);
    navigate('/dashboard/order');
  };

  const handleDisable = () => {
    localStorage.setItem('trading_enabled', 'false');
    setTradingEnabled(false);
  };

  const handleBrokerLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!result.ok) throw new Error('AngelOne login failed');

      localStorage.setItem('angel_jwt', result.data.jwtToken);
      localStorage.setItem('angel_refresh', result.data.refreshToken);
      localStorage.setItem('angel_feed', result.data.feedToken);

      if (accessToken) {
        await fetch(`${API_BASE}/api/instruments/sync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      localStorage.setItem('trading_enabled', 'true');
      setTradingEnabled(true);
      setLoginOpen(false);
      navigate('/dashboard/order');
    } catch (err: any) {
      setError(err.message || 'Failed to connect AngelOne');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Trading Details
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Enable trading to open Option Chain. If token expired, login again.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={tradingEnabled}
              onChange={(_, checked) => (checked ? handleEnable() : handleDisable())}
              color="success"
            />
          }
          label={tradingEnabled ? 'Enabled' : 'Disabled'}
        />
      </Card>

      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">All Signals</Typography>
        <Button variant="contained" color="primary">
          Export Excel
        </Button>
      </Stack>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} md={6}>
          <TextField fullWidth label="Search Something Here" variant="outlined" />
        </Grid>
        <Grid xs={12} md={6}>
          <TextField select fullWidth label="Select Strategy" defaultValue="All">
            {strategies.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>S.No</TableCell>
              <TableCell>Signals Time</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Strategy</TableCell>
              <TableCell>Trade Type</TableCell>
              <TableCell>Entry/Exit Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.sno}>
                <TableCell>{row.sno}</TableCell>
                <TableCell>{row.time}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.symbol}</TableCell>
                <TableCell>{row.price}</TableCell>
                <TableCell>{row.strategy}</TableCell>
                <TableCell>{row.tradeType}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>AngelOne Login</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Client Code"
              margin="normal"
              value={form.clientcode}
              onChange={(e) => setForm({ ...form, clientcode: e.target.value })}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <TextField
              fullWidth
              label="TOTP"
              margin="normal"
              value={form.totp}
              onChange={(e) => setForm({ ...form, totp: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleBrokerLogin} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
