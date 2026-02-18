// @mui
import { useState, useEffect } from 'react';
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
import { paths } from 'src/routes/paths';
import { HOST_API } from 'src/config-global';
import DemoTradeDetailsView from 'src/sections/overview/app/view/demo-trade-details-view';

// hooks
import { useAuthUser } from 'src/hooks/use-auth-user';

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
  const { user } = useAuthUser();
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
  const authToken = localStorage.getItem('authToken');

  const handleEnable = () => {
    navigate(paths.dashboard.brokerConnect);
  };

  const handleDisable = () => {
    localStorage.setItem('trading_enabled', 'false');
    setTradingEnabled(false);
  };

  // ✅ Check Broker Session Validity on Mount
  useEffect(() => {
    const checkSession = async () => {
      const isBrokerConnected = localStorage.getItem('angel_jwt') !== null;
      const clientCode = localStorage.getItem('angel_clientcode');

      if (tradingEnabled && isBrokerConnected && clientCode) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/validate-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientcode: clientCode }),
          });
          const json = await res.json();

          if (!json.ok) {
            handleDisable();
            setError('Your broker session has expired. Please connect again.');
          }
        } catch (err) {
          console.error('Session check failed', err);
        }
      }
    };

    checkSession();
  }, [tradingEnabled, API_BASE]);

  // handleBrokerLogin removed as we use OAuth redirect now

  const isDemo = user?.licence === 'Demo';

  // ✅ Render Demo View if User is Demo
  if (isDemo) {
    return (
      <Container maxWidth="xl">
        <Typography variant="h4" sx={{ mb: 3 }}>Trade Details</Typography>
        <DemoTradeDetailsView />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Trading Details
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Manual session generation (SmartAPI Login) is required to enable trading.
        </Typography>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color={tradingEnabled ? "success" : "primary"}
            onClick={handleEnable}
            disabled={tradingEnabled}
          >
            {tradingEnabled ? "Trading Active" : "Connect AngelOne"}
          </Button>

          {tradingEnabled && (
            <Button variant="outlined" color="error" onClick={handleDisable}>
              Disconnect
            </Button>
          )}
        </Stack>
      </Card>

      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">All Signals</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            const exportUrl = `${API_BASE}/api/algo/trades/export`;
            const link = document.createElement('a');
            link.href = exportUrl;
            link.download = 'algo-trades.csv';
            link.target = '_blank';
            if (authToken) {
              fetch(exportUrl, {
                headers: { Authorization: `Bearer ${authToken}` },
              })
                .then((r) => r.blob())
                .then((blob) => {
                  const objectUrl = window.URL.createObjectURL(blob);
                  link.href = objectUrl;
                  link.click();
                  window.URL.revokeObjectURL(objectUrl);
                })
                .catch(() => { });
            } else {
              link.click();
            }
          }}
        >
          Export Trades CSV
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
    </Container>
  );
}
