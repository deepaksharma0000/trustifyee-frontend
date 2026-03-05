import { useState, useEffect, useCallback, useMemo } from 'react';
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
  useMediaQuery,
  useTheme,
  InputAdornment,
  Chip,
  Grid,
  CircularProgress
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LoadingButton } from '@mui/lab';
import { useNavigate, useParams } from 'react-router-dom';
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

const STRATEGIES_LIST = ['All'];

const INDEX_SYMBOLS = ['All', 'Nifty', 'Bank Nifty', 'FinFifty', 'SenSex', 'MidCapFifty', 'BankEx'];

const INDEX_MAP: { [key: string]: string } = {
  'Nifty': 'NIFTY',
  'Bank Nifty': 'BANKNIFTY',
  'FinFifty': 'FINNIFTY',
  'SenSex': 'SENSEX',
  'MidCapFifty': 'MIDCPNIFTY',
  'BankEx': 'BANKEX'
};

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
  const isMobile = useMediaQuery((theme: any) => theme.breakpoints.down('sm'));
  const theme = useTheme();
  const isAdmin = user?.role === 'admin' || user?.role === 'subadmin' || user?.role === 'sub-admin';
  const isDemo = user?.licence === 'Demo';

  const [currentTab, setCurrentTab] = useState(0);
  const [tradingEnabled, setTradingEnabled] = useState(localStorage.getItem('trading_enabled') === 'true');
  const [error, setError] = useState('');

  // Language for disclaimer
  const [disclLang, setDisclLang] = useState<'en' | 'hi'>('en');

  // Signals State
  const [signals, setSignals] = useState([]);
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalFilters, setSignalFilters] = useState({ search: '', strategy: 'All' });

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [strategies, setStrategies] = useState(['All']);
  const [dynamicSymbols, setDynamicSymbols] = useState<string[]>([]);
  const [symbolLoading, setSymbolLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    fromDate: format(new Date(), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    indexSymbol: 'All',
    symbol: '',
    strategy: 'All',
    status: 'CLOSED', // Default to closed for history
    lots: '',
  });
  const [totalPnl, setTotalPnl] = useState(0);
  const [broadcastLoading, setBroadcastLoading] = useState<string | null>(null);

  // Global Kill Switch State
  const [globalTradingStatus, setGlobalTradingStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [globalStatusLoading, setGlobalStatusLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);

  const { id: reviewUserId } = useParams();
  const isReviewMode = !!reviewUserId;

  const availableTabs = useMemo(() => [
    { label: 'All Signals', icon: 'solar:bolt-bold-duotone', visible: !isReviewMode },
    { label: 'Trade History', icon: 'solar:history-bold-duotone', visible: true },
    { label: 'Order History', icon: 'solar:bill-list-bold-duotone', visible: true },
    { label: 'Broker Response', icon: 'solar:chat-line-bold-duotone', visible: isReviewMode },
    { label: 'Trading Status', icon: 'solar:shield-check-bold-duotone', visible: isAdmin && !isReviewMode },
  ].filter((t) => t.visible), [isReviewMode, isAdmin]);

  const getTabIndex = useCallback((label: string) =>
    availableTabs.findIndex((t) => t.label === label), [availableTabs]);

  useEffect(() => {
    if (isReviewMode) {
      const idx = getTabIndex('Trade History');
      if (idx !== -1) setCurrentTab(idx); // Default to Trade History in Review Mode
    }
  }, [isReviewMode, getTabIndex]);

  const fetchStrategies = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/product/list');
      if (res.data.status) {
        const names = res.data.products.map((p: any) => p.name);
        setStrategies(['All', ...names]);
      }
    } catch (err) {
      console.error('Failed to fetch strategies', err);
    }
  }, []);

  const fetchResponses = useCallback(async () => {
    try {
      setResponsesLoading(true);
      const params = isReviewMode ? { userId: reviewUserId } : {};
      const res = await axiosInstance.get('/api/orders/broker-responses', { params });
      if (res.data.status || res.data.ok) {
        setResponses(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch responses', err);
    } finally {
      setResponsesLoading(false);
    }
  }, [isReviewMode, reviewUserId]);

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
      const params: any = { ...historyFilters };

      // Map frontend labels to backend expected index values
      if (INDEX_MAP[params.indexSymbol]) {
        params.indexSymbol = INDEX_MAP[params.indexSymbol];
      }

      if (params.symbol === 'All' || !params.symbol) delete (params as any).symbol;
      if (params.indexSymbol === 'All') delete (params as any).indexSymbol;
      if (params.strategy === 'All') delete (params as any).strategy;
      if (params.status === 'All') delete (params as any).status;

      // [NEW] If in Review Mode, filter history by this client
      if (isReviewMode) {
        params.userId = reviewUserId;
      }

      const res = await axiosInstance.get('/api/orders/history-all', { params });
      setHistory(res.data.data || []);
      setTotalPnl(res.data.totalRealisedPnl || 0);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilters, isReviewMode, reviewUserId]);

  const handleBroadcastSignal = async (signalId: string) => {
    try {
      setBroadcastLoading(signalId);
      const res = await axiosInstance.post('/api/signals/broadcast', { signalId });
      alert(`Broadcast successful! Triggered for ${res.data.totalUsers} users.`);
      fetchSignals();
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
      const indexVal = INDEX_MAP[index] || index;

      const res = await axiosInstance.get('/api/orders/unique-symbols', {
        params: {
          indexSymbol: indexVal === 'All' ? undefined : indexVal,
          fromDate: from,
          toDate: to
        }
      });
      const symbols = res.data.data || [];
      setDynamicSymbols(['All', ...symbols]);
    } catch (err) {
      console.error('Failed to fetch symbols', err);
    } finally {
      setSymbolLoading(false);
    }
  }, []);

  const fetchGlobalStatus = useCallback(async () => {
    try {
      setGlobalStatusLoading(true);
      const res = await axiosInstance.get('/api/system/trading-status');
      if (res.data.status) {
        setGlobalTradingStatus(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch global status', err);
    } finally {
      setGlobalStatusLoading(false);
    }
  }, []);

  const fetchActiveUsers = useCallback(async () => {
    try {
      setActiveUsersLoading(true);
      const res = await axiosInstance.get('/api/user/active-trading');
      if (res.data.status) {
        setActiveUsers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch active users', err);
    } finally {
      setActiveUsersLoading(false);
    }
  }, []);

  const toggleGlobalStatus = async () => {
    const newValue = globalTradingStatus === 'enabled' ? 'disabled' : 'enabled';
    if (!window.confirm(`⚠️ ATTENTION: Are you sure you want to ${newValue.toUpperCase()} trading globally?`)) return;

    try {
      setGlobalStatusLoading(true);
      const res = await axiosInstance.post('/api/system/trading-status', { value: newValue });
      if (res.data.status) {
        setGlobalTradingStatus(res.data.data);
      }
    } catch (err: any) {
      alert(`Update failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setGlobalStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  useEffect(() => {
    if (isAdmin && (currentTab === 1 || currentTab === 2)) {
      fetchUniqueSymbols(historyFilters.indexSymbol, historyFilters.fromDate, historyFilters.toDate);
    }
  }, [isAdmin, currentTab, historyFilters.indexSymbol, historyFilters.fromDate, historyFilters.toDate, fetchUniqueSymbols]);

  useEffect(() => {
    if (isAdmin) {
      const activeLabel = availableTabs[currentTab]?.label;
      if (activeLabel === 'All Signals') fetchSignals();
      else if (activeLabel === 'Trade History' || activeLabel === 'Order History') fetchHistory();
      else if (activeLabel === 'Broker Response') fetchResponses();
      else if (activeLabel === 'Trading Status') {
        fetchGlobalStatus();
        fetchActiveUsers();
      }
    }
  }, [isAdmin, currentTab, fetchSignals, fetchHistory, fetchGlobalStatus, fetchActiveUsers, fetchResponses, availableTabs]);

  const handleHandleExport = async () => {
    try {
      const params = { ...historyFilters };
      if (INDEX_MAP[params.indexSymbol]) {
        params.indexSymbol = INDEX_MAP[params.indexSymbol];
      }
      if (params.symbol === 'All' || !params.symbol) delete (params as any).symbol;
      if (params.indexSymbol === 'All') delete (params as any).indexSymbol;
      if (params.strategy === 'All') delete (params as any).strategy;
      if (params.status === 'All') delete (params as any).status;

      if (isReviewMode) {
        (params as any).userId = reviewUserId;
      }

      const exportUrl = `/api/orders/export-all`;
      const res = await axiosInstance.get(exportUrl, { params, responseType: 'blob' });
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

  // if (isDemo) {
  //   return (
  //     <Container maxWidth="xl">
  //       <Typography variant="h4" sx={{ mb: 3 }}>Trade Details</Typography>
  //       <DemoTradeDetailsView />
  //     </Container>
  //   );
  // }

  return (
    <Container maxWidth="xl">
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {isReviewMode ? `Client Review: ${reviewUserId}` : 'Trade Details'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isReviewMode ? 'You are currently in read-only review mode for this client.' : 'Professional trade analysis and execution logs.'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="soft"
              color="info"
              onClick={() => navigate('/dashboard/broker-connect')}
              startIcon={<Iconify icon="solar:link-bold-duotone" />}
            >
              Broker Status
            </Button>
            {isAdmin && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleHandleExport}
                startIcon={<Iconify icon="eva:download-fill" />}
                sx={{ borderRadius: 1.5 }}
              >
                Export Excel (CSV)
              </Button>
            )}
          </Stack>
        </Stack>

        <Tabs
          value={currentTab}
          onChange={(_e, v) => setCurrentTab(v)}
          sx={{
            mb: 3,
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' }
          }}
        >
          {availableTabs.map((tab, index) => (
            <Tab
              key={tab.label}
              label={tab.label}
              icon={<Iconify icon={tab.icon} width={22} />}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* --- LIVE OPERATION TAB --- */}
        <CustomTabPanel value={currentTab} index={getTabIndex('All Signals')}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flexGrow: 1 }}
              size="small"
              placeholder="Search by Symbol or Strategy..."
              value={signalFilters.search}
              onChange={(e) => setSignalFilters({ ...signalFilters, search: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            />
            <TextField
              select
              size="small"
              label="Strategy"
              value={signalFilters.strategy}
              onChange={(e) => setSignalFilters({ ...signalFilters, strategy: e.target.value })}
              sx={{ minWidth: 160 }}
            >
              {strategies.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <Button variant="soft" onClick={fetchSignals}>Refresh</Button>
          </Box>

          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>S.No</TableCell>
                  <TableCell>Signal Time</TableCell>
                  <TableCell>Execution Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Signal Price</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell align="center">Success/Fail</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {signalLoading && (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 8 }}>Loading signals...</TableCell></TableRow>
                )}

                {!signalLoading && signals.length === 0 && (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 8 }}>No signals found.</TableCell></TableRow>
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

                  if (row.status === 'ACTIVE') { statusColor = 'info'; }
                  else if (row.status === 'EXECUTION_IN_PROGRESS') { statusColor = 'warning'; statusText = 'In Progress'; }
                  else if (row.status === 'CLOSED') { statusColor = 'success'; statusText = 'Executed'; }
                  else if (row.status === 'FAILED') { statusColor = 'error'; statusText = 'Failed'; }

                  return (
                    <TableRow key={row._id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{format(new Date(row.createdAt), 'HH:mm:ss')}</TableCell>
                      <TableCell>{row.updatedAt ? format(new Date(row.updatedAt), 'HH:mm:ss') : '-'}</TableCell>
                      <TableCell>
                        <Label color={row.side === 'BUY' ? 'success' : 'error'} variant="soft">
                          {typeLabel}
                        </Label>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.tradingsymbol}</TableCell>
                      <TableCell align="right">₹{row.price.toFixed(2)}</TableCell>
                      <TableCell><Chip label={row.strategy || 'Manual'} size="small" variant="soft" /></TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Label color="success">{row.successCount || 0}</Label>
                          <Label color="error">{row.failCount || 0}</Label>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Label variant="soft" color={statusColor}>{statusText}</Label>
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
                          >
                            Execute
                          </LoadingButton>
                        ) : (
                          <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CustomTabPanel>

        {/* --- TRADE HISTORY TAB (REINSTATED) --- */}
        <CustomTabPanel value={currentTab} index={getTabIndex('Trade History')}>
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.neutral', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:history-bold-duotone" width={28} color="info.main" />
              <Typography variant="h6">Recent Trade History</Typography>
            </Stack>
            <Button size="small" variant="soft" color="info" onClick={fetchHistory}>Refresh Status</Button>
          </Box>

          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Signal Time</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Entry Price</TableCell>
                  <TableCell align="right">Exit Price</TableCell>
                  <TableCell align="right">Realised P/L</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyLoading && (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}>Loading history...</TableCell></TableRow>
                )}
                {!historyLoading && history.length === 0 && (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}>No history records.</TableCell></TableRow>
                )}
                {!historyLoading && history.map((row: any) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{format(new Date(row.createdAt), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.tradingsymbol}</TableCell>
                    <TableCell><Chip label={row.strategy || '-'} size="small" variant="soft" /></TableCell>
                    <TableCell>
                      <Label color={row.side === 'BUY' ? 'success' : 'error'} variant="soft">
                        {row.side}
                      </Label>
                    </TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell align="right">₹{row.entryPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{(row.exitPrice || 0).toFixed(2) || '-'}</TableCell>
                    <TableCell align="right" sx={{ color: (row.pnl || 0) >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                      ₹{(row.pnl || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Label variant="soft" color={row.status === 'CLOSED' ? 'default' : 'info'}>
                        {row.status}
                      </Label>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CustomTabPanel>

        {/* --- ORDER HISTORY TAB (ADVANCED) --- */}
        <CustomTabPanel value={currentTab} index={getTabIndex('Order History')}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <TextField type="date" label="From Date" size="small" InputLabelProps={{ shrink: true }} value={historyFilters.fromDate} onChange={(e) => setHistoryFilters({ ...historyFilters, fromDate: e.target.value })} />
            <TextField type="date" label="To Date" size="small" InputLabelProps={{ shrink: true }} value={historyFilters.toDate} onChange={(e) => setHistoryFilters({ ...historyFilters, toDate: e.target.value })} />
            <TextField select label="Index Symbol" size="small" value={historyFilters.indexSymbol} onChange={(e) => setHistoryFilters({ ...historyFilters, indexSymbol: e.target.value, symbol: '' })}>
              {INDEX_SYMBOLS.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Symbol"
              size="small"
              value={historyFilters.symbol}
              onChange={(e) => setHistoryFilters({ ...historyFilters, symbol: e.target.value })}
              disabled={symbolLoading}
            >
              {dynamicSymbols.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>

            <TextField select label="Strategy" size="small" value={historyFilters.strategy} onChange={(e) => setHistoryFilters({ ...historyFilters, strategy: e.target.value })}>
              {strategies.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>

            <TextField label="Lots" size="small" type="number" value={historyFilters.lots} onChange={(e) => setHistoryFilters({ ...historyFilters, lots: e.target.value })} />

            <Stack direction="row" spacing={1} sx={{ gridColumn: 'span 2' }}>
              <Button variant="contained" color="primary" onClick={fetchHistory} sx={{ flexGrow: 1 }}>Filter History</Button>
              <Button variant="outlined" color="inherit" onClick={() => setHistoryFilters({ fromDate: format(new Date(), 'yyyy-MM-dd'), toDate: format(new Date(), 'yyyy-MM-dd'), indexSymbol: 'All', symbol: '', strategy: 'All', status: 'CLOSED', lots: '' })}>Reset</Button>
            </Stack>
          </Box>

          <Box sx={{
            mb: 3, p: 2,
            background: (t: any) => `linear-gradient(135deg, ${t.palette.background.neutral} 0%, ${t.palette.action.selected} 100%)`,
            borderRadius: 2, border: '1px solid', borderColor: 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: theme.shadows[1]
          }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Iconify icon="solar:wallet-money-bold-duotone" width={32} color="primary.main" />
              <Typography variant="subtitle1" fontWeight={700}>Total Realised P/L</Typography>
            </Stack>
            <Typography variant="h4" color={totalPnl >= 0 ? 'success.main' : 'error.main'} sx={{ fontFamily: 'monospace', fontWeight: 900 }}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'background.neutral' }}>
                <TableRow>
                  <TableCell>S.No</TableCell>
                  <TableCell>Signal Time</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell>Entry Type</TableCell>
                  <TableCell align="right">Entry Qty</TableCell>
                  <TableCell align="right">Exit Qty</TableCell>
                  <TableCell align="right">Entry Price</TableCell>
                  <TableCell align="right">Exit Price</TableCell>
                  <TableCell align="right">Total (P&L)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyLoading && (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}>Fetching history data...</TableCell></TableRow>
                )}

                {!historyLoading && history.length === 0 && (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}>No historical trades found.</TableCell></TableRow>
                )}

                {!historyLoading && history.map((row: any, idx) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{format(new Date(row.createdAt), 'dd MMM, HH:mm')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.tradingsymbol}</TableCell>
                    <TableCell><Label variant="soft" color="info">{row.strategy || 'Manual'}</Label></TableCell>
                    <TableCell>
                      <Label color={row.side === 'BUY' ? 'success' : 'error'} variant="soft">
                        {row.side}
                      </Label>
                    </TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell align="right">{row.exitQty || row.quantity}</TableCell>
                    <TableCell align="right">₹{row.entryPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{(row.exitPrice || 0).toFixed(2) || '-'}</TableCell>
                    <TableCell align="right" sx={{ color: (row.pnl || 0) >= 0 ? 'success.main' : 'error.main', fontWeight: 900 }}>
                      ₹{(row.pnl || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CustomTabPanel>

        {/* --- BROKER RESPONSE TAB --- */}
        <CustomTabPanel value={currentTab} index={getTabIndex('Broker Response')}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Broker Execution Logs</Typography>
            <Button size="small" variant="soft" color="info" onClick={fetchResponses}>Refresh Logs</Button>
          </Box>

          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {responsesLoading && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>Fetching logs...</TableCell></TableRow>
                )}
                {!responsesLoading && responses.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>No responses found.</TableCell></TableRow>
                )}
                {!responsesLoading && responses.map((row: any) => (
                  <TableRow key={row._id} hover>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{format(new Date(row.createdAt), 'dd/MM HH:mm:ss')}</TableCell>
                    <TableCell><Label variant="soft" color="info">{row.action}</Label></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.tradingsymbol}</TableCell>
                    <TableCell>
                      <Label
                        variant="filled"
                        color={
                          (row.status === 'SUCCESS' && 'success') ||
                          (row.status === 'REJECTED' && 'warning') ||
                          'error'
                        }
                      >
                        {row.status}
                      </Label>
                    </TableCell>
                    <TableCell sx={{ color: row.status !== 'SUCCESS' ? 'error.main' : 'inherit' }}>{row.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CustomTabPanel>

        {/* --- TRADING STATUS TAB (GLOBAL KILL SWITCH) --- */}
        {isAdmin && !isReviewMode && (
          <CustomTabPanel value={currentTab} index={getTabIndex('Trading Status')}>
            <Grid container spacing={3}>
              {/* Global Switch Card */}
              <Grid item xs={12} md={4}>
                <Card sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '1.5px solid',
                  borderColor: globalTradingStatus === 'enabled' ? 'success.main' : 'error.main',
                  bgcolor: globalTradingStatus === 'enabled' ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05),
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <Box sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    opacity: 0.1,
                    transform: 'rotate(15deg)'
                  }}>
                    <Iconify icon="solar:shield-warning-bold" width={120} />
                  </Box>

                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Master Control</Typography>
                  <Typography variant="h4" gutterBottom sx={{ fontWeight: 900 }}>Global Switch Kill</Typography>

                  <Box sx={{ my: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Switch
                      checked={globalTradingStatus === 'enabled'}
                      onChange={toggleGlobalStatus}
                      color="success"
                      disabled={globalStatusLoading}
                      sx={{
                        transform: 'scale(2)',
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'success.main' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { opacity: 0.5, backgroundColor: 'success.main' }
                      }}
                    />
                    <Typography variant="h6" sx={{ mt: 3, color: globalTradingStatus === 'enabled' ? 'success.main' : 'error.main', fontWeight: 800 }}>
                      SYSTEM: {globalTradingStatus.toUpperCase()}
                    </Typography>
                  </Box>

                  <Alert
                    severity={globalTradingStatus === 'enabled' ? "success" : "error"}
                    variant="outlined"
                    sx={{
                      textAlign: 'left',
                      fontWeight: 'bold',
                      bgcolor: globalTradingStatus === 'enabled' ? 'success.lighter' : 'error.lighter',
                      borderColor: (t) => alpha(t.palette[globalTradingStatus === 'enabled' ? 'success' : 'error'].main, 0.2)
                    }}
                  >
                    {globalTradingStatus === 'enabled'
                      ? "Trading is currently allowed for all users."
                      : "ALL TRADING IS STOPPED. No orders will reach the brokers."}
                  </Alert>
                </Card>
              </Grid>

              {/* Stats & Info Card */}
              <Grid item xs={12} md={8}>
                <Card sx={{ p: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Active Trading Pool</Typography>
                      <Typography variant="body2" color="text.secondary">Users with trading enabled and active status.</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="soft"
                      startIcon={<Iconify icon="eva:refresh-fill" />}
                      onClick={fetchActiveUsers}
                      disabled={activeUsersLoading}
                    >
                      Refresh List
                    </Button>
                  </Stack>

                  <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Licence</TableCell>
                          <TableCell>Broker</TableCell>
                          <TableCell align="center">Ready</TableCell>
                          <TableCell align="right">Join Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeUsersLoading && (
                          <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                        )}
                        {!activeUsersLoading && activeUsers.length === 0 && (
                          <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No active traders found.</TableCell></TableRow>
                        )}
                        {!activeUsersLoading && activeUsers.map((u) => (
                          <TableRow key={u._id}>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{u.user_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                            </TableCell>
                            <TableCell>
                              <Label color={u.licence === 'Live' ? 'success' : 'warning'}>{u.licence}</Label>
                            </TableCell>
                            <TableCell>{u.broker || '-'}</TableCell>
                            <TableCell align="center">
                              <Iconify
                                icon={u.broker_verified ? "eva:checkmark-circle-2-fill" : "eva:close-circle-fill"}
                                sx={{ color: u.broker_verified ? 'success.main' : 'error.main' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption">{format(new Date(u.created_at), 'dd MMM yy')}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.disabled">
                      *Total Active Users: {activeUsers.length}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </CustomTabPanel>
        )}
      </Card>

      {/* --- PROFESSIONAL FOOTER --- */}
      <Card sx={{ p: 4, mt: 4, bgcolor: 'background.neutral', border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="overline" color="text.secondary">Regulatory Compliance & Disclaimer</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption">Language:</Typography>
              <Button
                size="small"
                variant={disclLang === 'en' ? 'contained' : 'outlined'}
                onClick={() => setDisclLang('en')}
                sx={{ minWidth: 40, py: 0 }}
              >EN</Button>
              <Button
                size="small"
                variant={disclLang === 'hi' ? 'contained' : 'outlined'}
                onClick={() => setDisclLang('hi')}
                sx={{ minWidth: 40, py: 0 }}
              >HI</Button>
            </Stack>
          </Stack>

          <Box>
            {disclLang === 'en' ? (
              <Stack spacing={2}>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  <strong>THIS RESULTS IS VALID FOR TODAY ONLY</strong>. WE DO NOT DIRECTLY OR INDIRECTLY MAKE ANY REFERENCE TO THE PAST OR EXPECTED FUTURE RETURN/PERFORMANCE OF THE ALGORITHM.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  All securities algorithmic trading systems are subject to market risks and no assurance can be given that the user&apos;s objectives will be achieved based on today&apos;s performance. This results is intended for informational purposes and should not be construed as financial advice.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.85rem' }}>
                  <strong>यह परिणाम केवल आज के लिए मान्य है</strong>। हम प्रत्यक्ष या अप्रत्यक्ष रूप से एल्गोरिदम के पिछले या अपेक्षित भविष्य के लाभ/प्रदर्शन के बारे में कोई संदर्भ नहीं देते हैं।
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.85rem' }}>
                  सभी प्रतिभूतियां एल्गो ट्रेडिंग सिस्टम बाजार जोखिमों के अधीन हैं और इस बात का कोई आश्वासन नहीं दिया जा सकता है कि उपयोगकर्ता के उद्देश्यों को आज के प्रदर्शन के आधार पर प्राप्त किया जाएगा। यह परिणाम केवल आज के लिए मान्य है।
                </Typography>
              </Stack>
            )}
          </Box>

          <Typography variant="caption" align="center" color="text.disabled" sx={{ pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
            © 2026 Trustifye Algos. All rights reserved. Precise Trading Solutions.
          </Typography>
        </Stack>
      </Card>
    </Container >
  );
}
