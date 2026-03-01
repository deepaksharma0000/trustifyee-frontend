import { useState, useEffect, useCallback } from 'react';
// @mui
import {
  Box,
  Card,
  Table,
  Stack,
  Button,
  TableRow,
  TableBody,
  TableCell,
  Container,
  Typography,
  TableContainer,
  TextField,
  InputAdornment,
  TableHead,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Avatar,
  LinearProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
// components
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
// routes
import { paths } from 'src/routes/paths';
import { HOST_API } from 'src/config-global';
import { useAuthUser } from 'src/hooks/use-auth-user';

// ----------------------------------------------------------------------


interface OpenPositionViewProps {
  embed?: boolean;
}

export default function OpenPositionView({ embed = false }: OpenPositionViewProps) {
  const settings = useSettingsContext();
  const theme = useTheme();
  const { user } = useAuthUser();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchQuery, setSearchQuery] = useState('');
  const [positions, setPositions] = useState<any[]>([]);
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

  const OPEN_POSITIONS_DATA = positions;

  const [angelClientcode, setAngelClientcode] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'sub-admin') {
      setAngelClientcode('ADMIN_ALL');
    } else if (user?.licence === 'Demo') {
      setAngelClientcode('ADMIN_DEMO');
    } else {
      const code = localStorage.getItem('angel_clientcode');
      setAngelClientcode(code);
    }
  }, [user]);

  const fetchOpenPositions = useCallback(async () => {
    if (!angelClientcode) return;

    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      const res = await fetch(
        `${API_BASE}/api/positions/open/${angelClientcode}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      const json = await res.json();
      if (json.ok) setPositions(json.data);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  }, [API_BASE, angelClientcode]);

  // 🔥 Fetch positions on mount and when angelClientcode changes
  useEffect(() => {
    if (angelClientcode) {
      fetchOpenPositions();
    }
  }, [angelClientcode, fetchOpenPositions]);

  // 🔥 Auto-refresh positions every 5 seconds
  useEffect(() => {
    let interval: any;

    if (angelClientcode) {
      interval = setInterval(() => {
        fetchOpenPositions();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [angelClientcode, fetchOpenPositions]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleUpdatePrice = async () => {
    enqueueSnackbar('Refreshing positions...', { variant: 'info' });
    await fetchOpenPositions();
    enqueueSnackbar('Positions updated successfully', { variant: 'success' });
  };

  const handleSquareOff = async (orderid: string) => {
    if (!angelClientcode) {
      alert("Broker not connected");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/positions/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({
          clientcode: angelClientcode,
          orderid,
        }),
      });

      const json = await res.json();

      if (json.ok) {
        enqueueSnackbar('Position exited successfully', { variant: 'success' });
        fetchOpenPositions();
      } else {
        enqueueSnackbar(json.message || "Exit failed", { variant: 'error' });
      }
    } catch {
      enqueueSnackbar("Exit failed", { variant: 'error' });
    }
  };

  // Calculate total P&L for each position
  const calculateTotal = (position: any) => {
    if (position.exitPrice) {
      const priceDifference = position.side === 'BUY'
        ? position.exitPrice - position.entryPrice
        : position.entryPrice - position.exitPrice;
      return (priceDifference * position.quantity).toFixed(2);
    }

    const priceDifference = position.side === 'BUY'
      ? (position.ltp || position.livePrice || 0) - position.entryPrice
      : position.entryPrice - (position.ltp || position.livePrice || 0);
    return (priceDifference * position.quantity).toFixed(2);
  };

  // Calculate progress towards target
  const calculateProgress = (position: any) => {
    // If no target/SL, return 0 progress
    if (!position.targetPrice || !position.stopLossPrice) return 0;

    if (position.side === 'BUY') {
      const totalRange = position.targetPrice - position.stopLossPrice;
      if (totalRange === 0) return 0;
      const currentProgress = (position.ltp || position.livePrice || position.entryPrice) - position.stopLossPrice;
      return Math.min(100, Math.max(0, (currentProgress / totalRange) * 100));
    }

    const totalRange = position.stopLossPrice - position.targetPrice;
    if (totalRange === 0) return 0;
    const currentProgress = position.stopLossPrice - (position.ltp || position.livePrice || position.entryPrice);
    return Math.min(100, Math.max(0, (currentProgress / totalRange) * 100));
  };

  const fetchOrderStatus = async (
    clientcode: string,
    orderid: string
  ) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/orders/status/${clientcode}/${orderid}`
      );
      const json = await res.json();
      return json === true;
    } catch (err) {
      return false;
    }
  };

  const filteredPositions = positions.filter((pos) => {
    const searchStr = searchQuery.toLowerCase();
    return (
      pos.tradingsymbol?.toLowerCase().includes(searchStr) ||
      pos.strategy?.toLowerCase().includes(searchStr) ||
      pos.tradeType?.toLowerCase().includes(searchStr) ||
      pos.side?.toLowerCase().includes(searchStr) ||
      pos.orderid?.toLowerCase().includes(searchStr)
    );
  });

  // Mobile card view for positions
  const renderMobileCard = (row: any) => {
    const total = calculateTotal(row);
    const isProfit = parseFloat(total) >= 0;
    const progress = calculateProgress(row);

    return (
      <Paper key={row.id} sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: theme.shadows[3] }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar
                sx={{
                  bgcolor: row.side === 'BUY' ? 'success.main' : 'error.main',
                  width: 32,
                  height: 32
                }}
              >
                <Iconify
                  icon={row.side === 'BUY' ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
                  width={18}
                />
              </Avatar>
              <Box>
                <Typography variant="subtitle2">{row.tradingsymbol}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Qty: {row.quantity}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={row.side}
              size="small"
              variant="soft"
              color={row.side === 'BUY' ? 'success' : 'error'}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Entry Price
            </Typography>
            <Typography variant="body2">{row.entryPrice}</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Live Price
            </Typography>
            <Typography variant="body2" fontWeight="bold" color={row.ltp || row.livePrice ? 'info.main' : 'text.disabled'}>
              {(row.ltp || row.livePrice) ? `₹${Number(row.ltp || row.livePrice).toFixed(2)}` : '—'}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="error.main">
                SL: {row.stopLossPrice || '-'}
              </Typography>
              <Typography variant="caption" color="success.main">
                Target: {row.targetPrice || '-'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={progress > 50 ? 'success' : 'primary'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              P&L
            </Typography>
            <Typography
              variant="subtitle2"
              color={isProfit ? 'success.main' : 'error.main'}
              fontWeight="bold"
            >
              {isProfit ? '+' : ''}{total}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Target Exit Time
            </Typography>
            <TextField
              type="datetime-local"
              size="small"
              defaultValue={row.autoSquareOffTime ? new Date(row.autoSquareOffTime).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) : ''}
              inputProps={{ style: { fontSize: '11px', padding: '4px 8px' } }}
              onBlur={(e) => {
                const val = e.target.value;
                const currentVal = row.autoSquareOffTime ? new Date(row.autoSquareOffTime).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) : '';
                if (val && val !== currentVal) {
                  handleUpdateAutoExit(row.orderid, val, true);
                }
              }}
              sx={{ width: 160 }}
              disabled={user?.role !== 'admin' && user?.role !== 'subadmin'}
            />
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label={row.tradeType || 'Manual'} size="small" variant="soft" color="info" />
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              {(row.signalTime || row.createdAt) ? new Date(row.signalTime || row.createdAt).toLocaleString() : '-'}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {user?.licence !== 'Demo' && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => handleUpdatePrice()}
                  startIcon={<Iconify icon="eva:refresh-fill" width={16} />}
                >
                  Update
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  onClick={() => handleSquareOff(row.orderid)}
                  startIcon={<Iconify icon="eva:close-fill" width={16} />}
                  color={isProfit ? 'success' : 'error'}
                >
                  Square Off
                </Button>
              </>
            )}
            {user?.licence === 'Demo' && (
              <Button variant="outlined" size="small" fullWidth disabled>
                View Only (Demo)
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    );
  };

  const handleUpdateAutoExit = async (orderid: string, time: string, enabled: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/update-auto-exit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          orderid,
          autoSquareOffTime: time,
          autoSquareOffEnabled: enabled
        }),
      });

      const json = await res.json();
      if (json.ok) {
        enqueueSnackbar('Target Exit Time saved!', { variant: 'success' });
        fetchOpenPositions();
      } else {
        enqueueSnackbar(json.message || "Failed to update auto exit", { variant: 'error' });
      }
    } catch (err: any) {
      enqueueSnackbar("Failed to update auto exit. Check if Redis is running.", { variant: 'error' });
    }
  };

  // Desktop table view for positions
  const renderDesktopTable = () => (
    <TableContainer sx={{ position: 'relative', overflow: 'auto' }}>
      <Scrollbar>
        <Table size="small" sx={{ minWidth: 1500 }}>
          <TableHead>
            <TableRow>
              <TableCell>Trade Type</TableCell>
              <TableCell>Signals Time</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell>Strategy</TableCell>
              <TableCell align="right">Entry Qty</TableCell>
              <TableCell align="right">Exit Qty</TableCell>
              <TableCell align="right">Live Price</TableCell>
              <TableCell align="right">Entry Price</TableCell>
              <TableCell align="right">Exit Price</TableCell>
              <TableCell>Exit Time</TableCell>
              <TableCell align="right">Stop Loss Price</TableCell>
              <TableCell align="right">Target Price</TableCell>
              <TableCell align="right">Total P&L</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Target Exit Time</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPositions.length > 0 ? (
              filteredPositions.map((row) => {
                const total = calculateTotal(row);
                const isProfit = parseFloat(total) >= 0;

                return (
                  <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Chip
                        label={row.tradeType || 'Manual'}
                        size="small"
                        color="info"
                        variant="soft"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                        {(row.signalTime || row.createdAt) ? new Date(row.signalTime || row.createdAt).toLocaleDateString() : '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(row.signalTime || row.createdAt) ? new Date(row.signalTime || row.createdAt).toLocaleTimeString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.side}
                        size="small"
                        variant="soft"
                        color={row.side === 'BUY' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{row.tradingsymbol}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        {row.strategy || 'Manual'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {row.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={(row.exitQty || 0) > 0 ? 'error.main' : 'text.disabled'}>
                        {row.exitQty || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {(row.ltp || row.livePrice) ? (
                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                          <Box sx={{
                            width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e',
                            boxShadow: '0 0 0 2px rgba(34,197,94,0.25)',
                            animation: 'ltpPulse 2s ease-in-out infinite',
                            '@keyframes ltpPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                            flexShrink: 0,
                          }} />
                          <Typography variant="body2" fontWeight={700} sx={{ color: 'info.main', fontFamily: 'monospace' }}>
                            ₹{Number(row.ltp || row.livePrice).toFixed(2)}
                          </Typography>
                        </Stack>
                      ) : (
                        <Tooltip title="Market closed or broker session inactive" arrow>
                          <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                            —
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">{row.entryPrice}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {row.exitPrice || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {row.exitAt ? new Date(row.exitAt).toLocaleDateString() : '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.exitAt ? new Date(row.exitAt).toLocaleTimeString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error.main">
                        {row.stopLossPrice || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        {row.targetPrice || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        color={isProfit ? 'success.main' : 'error.main'}
                      >
                        {isProfit ? '+' : ''}{total}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          type="datetime-local"
                          size="small"
                          defaultValue={row.autoSquareOffTime ? new Date(row.autoSquareOffTime).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) : ''}
                          inputProps={{ style: { fontSize: '12px' } }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            const currentVal = row.autoSquareOffTime ? new Date(row.autoSquareOffTime).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) : '';
                            if (val && val !== currentVal) {
                              handleUpdateAutoExit(row.orderid, val, true);
                            }
                          }}
                          disabled={user?.role !== 'admin' && user?.role !== 'subadmin'}
                        />
                        {(user?.role === 'admin' || user?.role === 'subadmin') && row.autoSquareOffEnabled && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleUpdateAutoExit(row.orderid, '', false)}
                          >
                            <Iconify icon="eva:close-circle-fill" width={16} />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      {user?.licence !== 'Demo' ? (
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Update Price" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleUpdatePrice()}
                              sx={{
                                border: `1px solid ${theme.palette.primary.main}`,
                                borderRadius: 1,
                                color: theme.palette.primary.main
                              }}
                            >
                              <Iconify icon="eva:refresh-fill" width={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Square Off" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleSquareOff(row.orderid)}
                              sx={{
                                bgcolor: isProfit ? theme.palette.success.main : theme.palette.error.main,
                                color: 'white',
                                '&:hover': {
                                  bgcolor: isProfit ? theme.palette.success.dark : theme.palette.error.dark,
                                }
                              }}
                            >
                              <Iconify icon="eva:close-fill" width={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        <Chip label="Read Only" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={16} align="center" sx={{ py: 3 }}>
                  <Box sx={{ py: 3 }}>
                    <Iconify icon="eva:search-outline" width={40} color="text.secondary" />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      No open positions found matching your search
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>
    </TableContainer>
  );

  const content = (
    <Card sx={{
      borderRadius: 2,
      boxShadow: theme.shadows[5],
      overflow: 'visible',
      mt: embed ? 3 : 0
    }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems="center"
        spacing={2}
        sx={{ p: 2.5 }}
      >
        <TextField
          fullWidth
          placeholder="Search positions..."
          value={searchQuery}
          onChange={handleSearch}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />

        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchOpenPositions}
            disabled={loading}
            startIcon={<Iconify icon="eva:refresh-fill" />}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant={isMobile ? "contained" : "outlined"}
            size="small"
            startIcon={<Iconify icon="eva:filter-fill" />}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="eva:download-fill" />}
          >
            Export
          </Button>
        </Stack>
      </Stack>

      {loading && positions.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Loading positions...
          </Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {isMobile ? (
        <Box sx={{ p: 2 }}>
          {positions.map(renderMobileCard)}
        </Box>
      ) : (
        renderDesktopTable()
      )}
    </Card>
  );

  if (embed) return content;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Open Positions"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Open Positions' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />
      {content}
    </Container>
  );
}
