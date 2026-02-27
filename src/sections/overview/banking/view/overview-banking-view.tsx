import { useState, useEffect, useCallback } from 'react';
import {
  Tab,
  Tabs,
  Paper,
  Stack,
  Alert,
  Table,
  Button,
  Switch,
  Dialog,
  MenuItem,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  Card,
  Container,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  FormControlLabel,
  Box,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
// routes
import { paths } from 'src/routes/paths';
// config
import { HOST_API } from 'src/config-global';
// utils
import axiosInstance from 'src/utils/axios';
// components
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
// sections
import DemoTradeDetailsView from 'src/sections/overview/app/view/demo-trade-details-view';
// hooks
import { useAuthUser } from 'src/hooks/use-auth-user';

// ----------------------------------------------------------------------

const STRATEGIES = ['All', 'ALPHA', 'BETA', 'GAMMA', 'DELTA', 'ZETA', 'SIGMA'];

const INDEX_SYMBOLS = ['All', 'BANKNIFTY', 'NIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY', 'BANKEX'];

const OPEN_CLOSE_OPTIONS = ['All', 'OPEN', 'CLOSED'];

// ----------------------------------------------------------------------

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// ----------------------------------------------------------------------

export default function OverviewBankingView() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isDemo = user?.licence === 'Demo';

  const [currentTab, setCurrentTab] = useState(0);
  const [tradingEnabled, setTradingEnabled] = useState(localStorage.getItem('trading_enabled') === 'true');
  const [error, setError] = useState('');

  // Signals State
  const [signals, setSignals] = useState([]);
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalFilters, setSignalFilters] = useState({ search: '', strategy: 'All' });

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dynamicSymbols, setDynamicSymbols] = useState<string[]>([]);
  const [symbolLoading, setSymbolLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    fromDate: format(new Date(), 'yyyy-MM-01'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    indexSymbol: 'All',
    symbol: '',
    strategy: 'All',
    status: 'All',
    lots: '',
  });
  const [totalPnl, setTotalPnl] = useState(0);
  const [broadcastLoading, setBroadcastLoading] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setSignalLoading(true);
      const params: any = {};
      if (signalFilters.strategy !== 'All') params.strategy = signalFilters.strategy;
      if (signalFilters.search) params.search = signalFilters.search;

      const res = await axiosInstance.get('/api/signals/all', { params });
      setSignals(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch signals', err);
    } finally {
      setSignalLoading(false);
    }
  }, [signalFilters.strategy, signalFilters.search]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const params = { ...historyFilters };
      if (params.symbol === 'All') delete (params as any).symbol;
      if (params.indexSymbol === 'All') delete (params as any).indexSymbol;
      if (params.strategy === 'All') delete (params as any).strategy;
      if (params.status === 'All') delete (params as any).status;

      const res = await axiosInstance.get('/api/orders/history-all', { params });
      setHistory(res.data.data || []);
      setTotalPnl(res.data.totalRealisedPnl || 0);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilters]);

  const handleBroadcastSignal = async (signalId: string) => {
    try {
      setBroadcastLoading(signalId);
      const res = await axiosInstance.post('/api/signals/broadcast', { signalId });
      alert(`Broadcast successful! Triggered for ${res.data.totalUsers} users.`);
      fetchSignals(); // Refresh list to show as CLOSED
    } catch (err) {
      console.error('Broadcast failed', err);
      alert(`Broadcast failed: ${err.message || 'Unknown error'}`);
    } finally {
      setBroadcastLoading(null);
    }
  };



  const fetchUniqueSymbols = useCallback(async (index: string, from: string, to: string) => {
    try {
      setSymbolLoading(true);
      const res = await axiosInstance.get('/api/orders/unique-symbols', {
        params: {
          indexSymbol: index,
          fromDate: from,
          toDate: to
        }
      });
      const symbols = res.data.data || [];
      setDynamicSymbols(symbols);

      // Auto-select first symbol for realistic market flow
      if (symbols.length > 0) {
        setHistoryFilters(prev => ({ ...prev, symbol: symbols[0] }));
      } else {
        setHistoryFilters(prev => ({ ...prev, symbol: '' }));
      }
    } catch (err) {
      console.error('Failed to fetch symbols', err);
    } finally {
      setSymbolLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && currentTab === 1) {
      fetchUniqueSymbols(historyFilters.indexSymbol, historyFilters.fromDate, historyFilters.toDate);
    }
  }, [isAdmin, currentTab, historyFilters.indexSymbol, historyFilters.fromDate, historyFilters.toDate, fetchUniqueSymbols]);

  useEffect(() => {
    if (isAdmin) {
      if (currentTab === 0) fetchSignals();
      else fetchHistory();
    }
  }, [isAdmin, currentTab, fetchSignals, fetchHistory]);

  // Debounced search for signals
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentTab === 0 && isAdmin) fetchSignals();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentTab, isAdmin, fetchSignals]);

  const handleHandleExport = async () => {
    try {
      const exportUrl = `/api/orders/export-all`;
      const res = await axiosInstance.get(exportUrl, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

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
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>Trading Details</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your live signals and track historical performance.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {!isDemo && (
              <Button
                variant="soft"
                color="info"
                onClick={() => navigate('/dashboard/broker-connect')}
                startIcon={<Iconify icon="solar:link-bold-duotone" />}
              >
                Connect AngelOne
              </Button>
            )}
            {isAdmin && (
              <Button variant="contained" color="primary" onClick={handleHandleExport} startIcon={<Iconify icon="eva:download-fill" />}>
                Export Trades CSV
              </Button>
            )}
          </Stack>
        </Stack>

        <Tabs value={currentTab} onChange={(_e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
          <Tab label="All Signals" icon={<Iconify icon="solar:chart-square-bold-duotone" width={20} />} iconPosition="start" />
          <Tab label="Trade History" icon={<Iconify icon="solar:history-bold-duotone" width={20} />} iconPosition="start" />
        </Tabs>

        {/* --- ALL SIGNALS TAB --- */}
        <CustomTabPanel value={currentTab} index={0}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flexGrow: 1 }}
              label="Search Something Here (Symbol, Strategy...)"
              value={signalFilters.search}
              onChange={(e) => setSignalFilters({ ...signalFilters, search: e.target.value })}
              InputProps={{ startAdornment: <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', mr: 1 }} /> }}
            />
            <TextField
              select
              label="Select Strategy"
              value={signalFilters.strategy}
              onChange={(e) => setSignalFilters({ ...signalFilters, strategy: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              {STRATEGIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>

          </Box>

          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>S.No</TableCell>
                  <TableCell>Signal Time</TableCell>
                  <TableCell>Last Update</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Success</TableCell>
                  <TableCell align="center">Failures</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {signalLoading && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5 }}>Loading signals...</TableCell></TableRow>
                )}

                {!signalLoading && signals.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5 }}>No signals found.</TableCell></TableRow>
                )}

                {!signalLoading && signals.map((row: any, index) => {
                  let typeLabel = '';
                  if (row.signalType === 'ENTRY') {
                    typeLabel = row.side === 'BUY' ? 'LE' : 'SE';
                  } else {
                    typeLabel = row.side === 'BUY' ? 'SX' : 'LX';
                  }

                  let statusColor: 'info' | 'success' | 'warning' | 'error' | 'default' = 'default';
                  let statusText = row.status;

                  if (row.status === 'ACTIVE') {
                    statusColor = 'info';
                  } else if (row.status === 'EXECUTION_IN_PROGRESS') {
                    statusColor = 'warning';
                    statusText = 'In Progress';
                  } else if (row.status === 'CLOSED') {
                    statusColor = 'success';
                    statusText = 'Executed';
                  } else if (row.status === 'PARTIAL') {
                    statusColor = 'warning';
                    statusText = 'Partial Success';
                  } else if (row.status === 'FAILED') {
                    statusColor = 'error';
                    statusText = 'Failed';
                  }

                  return (
                    <TableRow key={row._id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{format(new Date(row.createdAt), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell>{row.updatedAt ? format(new Date(row.updatedAt), 'dd/MM/yy HH:mm') : '-'}</TableCell>
                      <TableCell>
                        <Label color={row.side === 'BUY' ? 'success' : 'error'} variant="soft">
                          {typeLabel}
                        </Label>
                      </TableCell>
                      <TableCell>{row.tradingsymbol}</TableCell>
                      <TableCell>{row.price.toFixed(2)}</TableCell>
                      <TableCell>{row.strategy || '-'}</TableCell>

                      <TableCell align="center">
                        <Label variant="outlined" color="info">{row.totalExecutions || 0}</Label>
                      </TableCell>

                      <TableCell align="center">
                        <Label variant="soft" color="success">{row.successCount || 0}</Label>
                      </TableCell>

                      <TableCell align="center">
                        <Label variant="soft" color="error">{row.failCount || 0}</Label>
                      </TableCell>

                      <TableCell>
                        <Label variant="soft" color={statusColor}>
                          {statusText}
                        </Label>
                      </TableCell>
                      <TableCell align="right">
                        {row.status === 'ACTIVE' ? (
                          <LoadingButton
                            size="small"
                            variant="contained"
                            color="warning"
                            loading={broadcastLoading === row._id}
                            onClick={() => handleBroadcastSignal(row._id)}
                            startIcon={<Iconify icon="solar:bolt-bold" />}
                            sx={{ boxShadow: (theme) => (theme as any).customShadows.warning }}
                          >
                            Execute
                          </LoadingButton>
                        ) : (
                          <Button size="small" disabled variant="soft" startIcon={<Iconify icon="solar:check-read-bold" />}>
                            Executed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CustomTabPanel>

        {/* --- TRADE HISTORY TAB --- */}
        <CustomTabPanel value={currentTab} index={1}>
          <Typography variant="h6" sx={{ mb: 3 }}>Trade History</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <TextField type="date" label="From Date" InputLabelProps={{ shrink: true }} value={historyFilters.fromDate} onChange={(e) => setHistoryFilters({ ...historyFilters, fromDate: e.target.value })} />
            <TextField type="date" label="To Date" InputLabelProps={{ shrink: true }} value={historyFilters.toDate} onChange={(e) => setHistoryFilters({ ...historyFilters, toDate: e.target.value })} />
            <TextField select label="Index Symbol" value={historyFilters.indexSymbol} onChange={(e) => setHistoryFilters({ ...historyFilters, indexSymbol: e.target.value, symbol: '' })}>
              {INDEX_SYMBOLS.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Symbol"
              value={historyFilters.symbol}
              onChange={(e) => setHistoryFilters({ ...historyFilters, symbol: e.target.value })}
              disabled={symbolLoading || dynamicSymbols.length === 0}
              placeholder="Select Contract"
            >
              {dynamicSymbols.length === 0 && (
                <MenuItem disabled value="">No symbols found for criteria</MenuItem>
              )}
              {dynamicSymbols.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>

            <TextField select label="Strategy" value={historyFilters.strategy} onChange={(e) => setHistoryFilters({ ...historyFilters, strategy: e.target.value })}>
              {STRATEGIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField select label="Open/Close" value={historyFilters.status} onChange={(e) => setHistoryFilters({ ...historyFilters, status: e.target.value })}>
              {OPEN_CLOSE_OPTIONS.map((o) => {
                let label = o;
                if (o === 'CLOSED') label = 'Close';
                if (o === 'OPEN') label = 'Open';
                return (
                  <MenuItem key={o} value={o}>
                    {label}
                  </MenuItem>
                );
              })}
            </TextField>
            <TextField label="Lots" type="number" value={historyFilters.lots} onChange={(e) => setHistoryFilters({ ...historyFilters, lots: e.target.value })} />

            <Stack direction="row" spacing={1} sx={{ gridColumn: '1 / -1' }}>
              <Button variant="contained" color="primary" onClick={fetchHistory} disabled={historyLoading} sx={{ minWidth: 120 }}>
                {historyLoading ? 'Loading...' : 'Apply Filters'}
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => setHistoryFilters({ fromDate: format(new Date(), 'yyyy-MM-01'), toDate: format(new Date(), 'yyyy-MM-dd'), indexSymbol: 'All', symbol: '', strategy: 'All', status: 'All', lots: '' })}>
                Reset
              </Button>
            </Stack>
          </Box>

          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.neutral', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1">Total Realised P/L</Typography>
            <Typography variant="h5" color={totalPnl >= 0 ? 'success.main' : 'error.main'}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Signal Time</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Entry Price</TableCell>
                  <TableCell>Exit Price</TableCell>
                  <TableCell>Realised P/L</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyLoading && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3 }}>Loading...</TableCell></TableRow>
                )}

                {!historyLoading && history.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3 }}>No history found.</TableCell></TableRow>
                )}

                {!historyLoading && history.map((row: any) => (
                  <TableRow key={row._id}>
                    <TableCell>{format(new Date(row.createdAt), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                    <TableCell>{row.tradingsymbol}</TableCell>
                    <TableCell>{row.strategy || '-'}</TableCell>
                    <TableCell>
                      <Label color={row.side === 'BUY' ? 'success' : 'error'} variant="soft">
                        {row.side}
                      </Label>
                    </TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.entryPrice.toFixed(2)}</TableCell>
                    <TableCell>{row.exitPrice?.toFixed(2) || '-'}</TableCell>
                    <TableCell sx={{ color: (row.pnl || 0) >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                      {(row.pnl || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Label variant="soft" color={row.status === 'CLOSED' ? 'default' : 'info'}>
                        {row.status === 'CLOSED' ? 'Closed' : row.status}
                      </Label>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CustomTabPanel>
      </Card>
    </Container >
  );
}
