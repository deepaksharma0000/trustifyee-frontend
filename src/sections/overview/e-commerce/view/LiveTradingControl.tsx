import React, { useState, useEffect } from 'react';
import {
    Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, TextField, MenuItem, Button, Box, Chip, Alert,
    IconButton, Stack, alpha, Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { paths } from 'src/routes/paths';
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import { HOST_API } from 'src/config-global';
import axios from 'src/utils/axios';
import { useSnackbar } from 'src/components/snackbar';

interface TradingRow {
    id: string;
    symbol: 'BankNifty' | 'FINNIFTY' | 'NIFTY' | 'SENSEX';
    lotSize: number;
    maxQty: number;
    noOfLots: number;
    quantity: number;
    strategy: string;
    orderType: string;
    productType: string;
    isActive: boolean;
}

const SYMBOL_LOT_SIZES = {
    BankNifty: 30,
    FINNIFTY: 60,
    NIFTY: 65,
    SENSEX: 10
};

const SYMBOL_COLORS: Record<string, string> = {
    BankNifty: '#6366f1',
    FINNIFTY: '#3b82f6',
    NIFTY: '#10b981',
    SENSEX: '#f59e0b',
};

export default function LiveTradingControl({ user }: { user: any }) {
    const theme = useTheme();
    const isAdminRole = user?.role === 'admin' || user?.role === 'sub-admin' || user?.role === 'subadmin';
    const [rows, setRows] = useState<TradingRow[]>([]);
    const [signals, setSignals] = useState<any[]>([]);
    const [brokerResponse, setBrokerResponse] = useState<any>(null);
    const [executionStatuses, setExecutionStatuses] = useState<Record<string, string>>({});
    const [runtimeConnected, setRuntimeConnected] = useState<boolean>(() => !!(window as any).runtimeConnected);

    useEffect(() => {
        const handleStatusChange = (e: Event) => {
            setRuntimeConnected((e as CustomEvent).detail);
        };
        window.addEventListener("runtime-status-change", handleStatusChange);
        return () => window.removeEventListener("runtime-status-change", handleStatusChange);
    }, []);

    const fetchSignals = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${HOST_API}/api/signals/active`, {
                headers: { 'x-access-token': token || '' }
            });
            const data = await res.json();
            if (data.ok) setSignals(data.data);
        } catch (err) {
            console.error("Signal fetch failed", err);
        }
    };

    useEffect(() => {
        fetchSignals();
        const interval = setInterval(fetchSignals, 5000);

        const initialRows: TradingRow[] = (['BankNifty', 'FINNIFTY', 'NIFTY', 'SENSEX'] as const).map((sym, idx) => {
            // ✅ Load saved multiplier from user data if it exists
            const savedMultiplier = (user.lot_multipliers && user.lot_multipliers[sym]) || 1;
            
            return {
                id: idx.toString(),
                symbol: sym,
                lotSize: SYMBOL_LOT_SIZES[sym],
                maxQty: SYMBOL_LOT_SIZES[sym] * 40,
                noOfLots: savedMultiplier,
                quantity: savedMultiplier * SYMBOL_LOT_SIZES[sym],
                strategy: user.strategies && user.strategies.length > 0 ? user.strategies[0] : 'None',
                orderType: 'Market',
                productType: 'MIS',
                isActive: true
            };
        });
        setRows(initialRows);

        return () => clearInterval(interval);
    }, [user]);

    const handleUpdateMultipliers = async () => {
        setBrokerResponse(null);
        try {
            const token = localStorage.getItem('authToken');
            
            // Map current rows to a multiplier object
            const multipliers: Record<string, number> = {};
            rows.forEach(row => {
                multipliers[row.symbol] = row.noOfLots;
            });

            const response = await fetch(`${HOST_API}/api/user/lot-multipliers/${user._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': token || ''
                },
                body: JSON.stringify({ lot_multipliers: multipliers })
            });

            const data = await response.json();
            if (data.status) {
                setBrokerResponse({
                    status: 'success',
                    message: 'Lot Multipliers updated successfully! All future Admin signals will use these lots.',
                    time: new Date().toLocaleTimeString()
                });
                
                // Update local user data in localStorage to keep it in sync
                const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
                authUser.lot_multipliers = multipliers;
                localStorage.setItem('authUser', JSON.stringify(authUser));

                // 🔄 Force reload to sync with AuthContext and avoid stale data
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } else {
                throw new Error(data.error || 'Failed to update multipliers');
            }
        } catch (err: any) {
            setBrokerResponse({ status: 'error', message: err.message, time: new Date().toLocaleTimeString() });
        }
    };

    const { enqueueSnackbar } = useSnackbar();

    const pollStatus = (signalId: string) => {
        let attempts = 0;
        const MAX_ATTEMPTS = 24; // 2 minutes max (24 x 5s)

        const interval = setInterval(async () => {
            attempts += 1;
            try {
                const res = await axios.get(`/api/signals/execution-status/${signalId}`);
                const { data } = res.data;

                if (data.status === 'SUCCESS') {
                    clearInterval(interval);
                    setExecutionStatuses(prev => ({ ...prev, [signalId]: 'SUCCESS' }));
                    enqueueSnackbar('Trade executed successfully!', { variant: 'success' });
                    setBrokerResponse({
                        status: 'success',
                        message: `Order executed successfully! ID: ${data.orderId}`,
                        time: new Date().toLocaleTimeString()
                    });
                } else if (data.status === 'FAILED') {
                    clearInterval(interval);
                    setExecutionStatuses(prev => ({ ...prev, [signalId]: 'FAILED' }));
                    enqueueSnackbar(`Trade failed: ${data.errorMessage || 'Unknown error'}`, { variant: 'error' });
                    setBrokerResponse({
                        status: 'error',
                        message: `Execution failed: ${data.errorMessage}`,
                        time: new Date().toLocaleTimeString()
                    });
                } else if (attempts >= MAX_ATTEMPTS) {
                    clearInterval(interval);
                    setExecutionStatuses(prev => ({ ...prev, [signalId]: 'TIMEOUT' }));
                    enqueueSnackbar('Execution timed out. Check order history.', { variant: 'warning' });
                }
            } catch (err) {
                console.error("Status poll failed", err);
                clearInterval(interval);
                setExecutionStatuses(prev => ({ ...prev, [signalId]: 'ERROR' }));
            }
        }, 5000);
    };

    const handleExecuteSignal = async (signalId: string, lots: number) => {
        setBrokerResponse(null);
        setExecutionStatuses(prev => ({ ...prev, [signalId]: 'PENDING' }));
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${HOST_API}/api/signals/queue-execution`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': token || ''
                },
                body: JSON.stringify({ signalId, lots })
            });

            const data = await response.json();
            if (data.status) {
                setBrokerResponse({
                    status: 'success',
                    message: data.message,
                    time: new Date().toLocaleTimeString()
                });
                pollStatus(signalId);
                fetchSignals();
            } else {
                throw new Error(data.error || 'Failed to queue signal');
            }
        } catch (err: any) {
            setExecutionStatuses(prev => ({ ...prev, [signalId]: 'FAILED' }));
            setBrokerResponse({ status: 'error', message: err.message, time: new Date().toLocaleTimeString() });
        }
    };

    const handleLotChange = (id: string, value: number) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                return {
                    ...row,
                    noOfLots: value,
                    quantity: value * row.lotSize
                };
            }
            return row;
        }));
    };

    const handleExecute = async (row: TradingRow, optionType: 'CE' | 'PE') => {
        setBrokerResponse(null);
        try {
            const token = localStorage.getItem('authToken');
            const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

            const symbolMap: any = {
                'BankNifty': 'BANKNIFTY',
                'NIFTY': 'NIFTY',
                'FINNIFTY': 'FINNIFTY',
                'SENSEX': 'SENSEX'
            };

            const response = await fetch(`${API_BASE}/api/orders/place-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    symbol: symbolMap[row.symbol] || row.symbol,
                    optiontype: optionType,
                    side: 'BUY',
                    quantity: row.noOfLots, // Backend handles expansion to units
                    strategy: row.strategy,
                    producttype: row.productType === 'MIS' ? 'INTRADAY' : 'DELIVERY'
                })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                setBrokerResponse({
                    status: 'error',
                    message: data.error || data.message || 'Broker execution failed',
                    time: new Date().toLocaleTimeString()
                });
            } else {
                setBrokerResponse({
                    status: 'success',
                    message: `Order placed successfully! ID: ${data.orderid}`,
                    time: new Date().toLocaleTimeString()
                });
            }
        } catch (error: any) {
            setBrokerResponse({
                status: 'error',
                message: error.message || 'Connection error',
                time: new Date().toLocaleTimeString()
            });
        }
    };

    const isConnected = user.licence === 'Demo' || !!user.broker_connected || localStorage.getItem('angel_jwt') !== null;

    if (!isConnected) {
        return (
            <Card sx={{
                p: 5, textAlign: 'center', borderRadius: 3,
                border: `2px dashed ${alpha(theme.palette.warning.main, 0.5)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.dark, 0.08)} 100%)`,
            }}>
                <Box sx={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                    background: `radial-gradient(circle, ${alpha(theme.palette.warning.main, 0.2)} 0%, transparent 70%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`
                }}>
                    <Iconify icon="eva:alert-triangle-fill" width={40} sx={{ color: 'warning.main' }} />
                </Box>
                <Typography variant="h5" fontWeight={800} gutterBottom>Connect Your Broker</Typography>
                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', maxWidth: 500, mx: 'auto', lineHeight: 1.8 }}>
                    Your broker session is not active. Please go to the Broker Connect page to re-authenticate and start live trading.
                </Typography>
                <Button
                    variant="contained"
                    color="warning"
                    size="large"
                    component={RouterLink}
                    to={paths.dashboard.brokerConnect}
                    startIcon={<Iconify icon="eva:link-fill" />}
                    sx={{ borderRadius: 2, fontWeight: 700, px: 4, py: 1.5, boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.4)}` }}
                >
                    Go to Broker Connect
                </Button>
            </Card>
        );
    }

    return (
        <Box>

            {/* ── ACTIVE SIGNALS SECTION ──────────────────────── */}
            {signals.length > 0 && (
                <Card sx={{
                    mb: 3, borderRadius: 2.5,
                    border: `1.5px solid ${alpha('#22c55e', 0.4)}`,
                    background: `linear-gradient(135deg, ${alpha('#22c55e', 0.04)} 0%, ${alpha('#15803d', 0.07)} 100%)`,
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <Box sx={{
                        px: 3, py: 2,
                        borderBottom: `1px solid ${alpha('#22c55e', 0.15)}`,
                        background: `linear-gradient(90deg, ${alpha('#22c55e', 0.08)} 0%, transparent 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{
                                width: 36, height: 36, borderRadius: '50%',
                                bgcolor: alpha('#22c55e', 0.15),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `1px solid ${alpha('#22c55e', 0.3)}`
                            }}>
                                <Iconify icon="mdi:signal-cellular-3" width={20} sx={{ color: '#22c55e' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#22c55e">
                                    Live Trade Signals
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {signals.length} active signal{signals.length !== 1 ? 's' : ''} pending execution
                                </Typography>
                            </Box>
                        </Stack>
                        <Chip
                            label="LIVE"
                            size="small"
                            sx={{
                                bgcolor: alpha('#22c55e', 0.15), color: '#22c55e',
                                fontWeight: 800, fontSize: '0.65rem', letterSpacing: 1,
                                animation: 'signalpulse 2s ease-in-out infinite',
                                '@keyframes signalpulse': {
                                    '0%,100%': { boxShadow: `0 0 0 0 ${alpha('#22c55e', 0.4)}` },
                                    '50%': { boxShadow: `0 0 0 6px ${alpha('#22c55e', 0)}` }
                                }
                            }}
                        />
                    </Box>

                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha('#22c55e', 0.04) }}>
                                    {['Time', 'Symbol', 'Side', 'Status', 'Execute Lots', 'Action'].map((h) => (
                                         <TableCell key={h} align={['Execute Lots', 'Action'].includes(h) ? 'center' : 'left'} sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.disabled', letterSpacing: 0.8, py: 1.5 }}>
                                             {h.toUpperCase()}
                                         </TableCell>
                                     ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {signals.map((sig) => (
                                    <TableRow key={sig._id} sx={{ '&:hover': { bgcolor: alpha('#22c55e', 0.04) } }}>
                                        <TableCell>
                                            <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                {new Date(sig.createdAt).toLocaleTimeString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight={800}>{sig.tradingsymbol}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Label color={sig.side === 'BUY' ? 'success' : 'error'}>{sig.side}</Label>
                                        </TableCell>
                                        <TableCell>
                                            <Label color={
                                                (() => {
                                                    if (executionStatuses[sig._id] === 'SUCCESS') return 'success';
                                                    if (executionStatuses[sig._id] === 'FAILED') return 'error';
                                                    if (executionStatuses[sig._id] === 'PENDING') return 'warning';
                                                    return 'default';
                                                })()
                                            }>
                                                {executionStatuses[sig._id] || sig.status || 'READY'}
                                            </Label>
                                        </TableCell>
                                        <TableCell align="center">
                                            <TextField
                                                id={`lots-${sig._id}`}
                                                type="number"
                                                size="small"
                                                defaultValue={1}
                                                inputProps={{ min: 1, style: { width: '40px', textAlign: 'center', padding: '4px 6px' } }}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<Iconify icon={executionStatuses[sig._id] === 'PENDING' ? 'mdi:loading' : 'mdi:flash'} width={14} />}
                                                disabled={executionStatuses[sig._id] === 'PENDING' || executionStatuses[sig._id] === 'SUCCESS'}
                                                onClick={() => {
                                                    const lotInput = document.getElementById(`lots-${sig._id}`) as HTMLInputElement;
                                                    handleExecuteSignal(sig._id, parseInt(lotInput.value, 10));
                                                }}
                                                sx={{
                                                    borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem',
                                                    background: executionStatuses[sig._id] === 'SUCCESS' ? 'grey.500' : 'linear-gradient(135deg, #22c55e, #15803d)',
                                                    boxShadow: `0 2px 8px ${alpha('#22c55e', 0.4)}`,
                                                    '&:hover': { boxShadow: `0 4px 14px ${alpha('#22c55e', 0.5)}` }
                                                }}
                                            >
                                                {(() => {
                                                    if (executionStatuses[sig._id] === 'PENDING') return 'Queued...';
                                                    if (executionStatuses[sig._id] === 'SUCCESS') return 'Done';
                                                    return 'Execute';
                                                })()}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Card>
            )}

            {/* ── MANUAL OPERATIONS SECTION ──────────────────── */}
            <Card sx={{
                borderRadius: 2.5, overflow: 'hidden',
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                background: alpha(theme.palette.background.paper, 0.9),
            }}>
                {/* Header */}
                <Box sx={{
                    px: 3, py: 2.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: alpha(theme.palette.background.neutral || theme.palette.grey[100], 0.5),
                }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 12px ${alpha('#6366f1', 0.4)}`
                        }}>
                            <Iconify icon="mdi:tune-vertical" width={20} sx={{ color: '#fff' }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800}>Manual Operations</Typography>
                            <Typography variant="caption" color="text.secondary">Place manual orders for each index symbol</Typography>
                        </Box>
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                        <Button
                            variant="contained"
                            color="info"
                            size="small"
                            onClick={handleUpdateMultipliers}
                            startIcon={<Iconify icon="mdi:content-save-cog" width={16} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                boxShadow: `0 2px 8px ${alpha('#3b82f6', 0.4)}`,
                                '&:hover': { boxShadow: `0 4px 14px ${alpha('#3b82f6', 0.5)}` }
                            }}
                        >
                            Update Multiplier
                        </Button>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Tooltip title={isConnected ? "Broker session is authenticated and active on server" : "Broker session is inactive. Please log in again!"}>
                                <Chip
                                    label={isConnected ? "BROKER: CONNECTED" : "BROKER: OFFLINE"}
                                    size="small"
                                    variant="soft"
                                    color={isConnected ? "success" : "warning"}
                                    icon={<Iconify icon={isConnected ? "eva:checkmark-circle-2-fill" : "eva:alert-circle-fill"} />}
                                    sx={{ fontWeight: 700, fontSize: '0.68rem', letterSpacing: 0.5 }}
                                />
                            </Tooltip>

                            <Tooltip title={runtimeConnected ? "Execution runtime is active and receiving trades" : "Execution runtime is offline. Keep this page open to auto-execute whitelisted trades!"}>
                                <Chip
                                    label={runtimeConnected ? "RUNTIME: ONLINE" : "RUNTIME: OFFLINE"}
                                    size="small"
                                    variant="soft"
                                    color={runtimeConnected ? "success" : "error"}
                                    icon={<Iconify icon={runtimeConnected ? "fluent:pulse-24-filled" : "eva:close-circle-fill"} />}
                                    sx={{ 
                                        fontWeight: 700, fontSize: '0.68rem', letterSpacing: 0.5,
                                        animation: runtimeConnected ? 'pulse 2s infinite' : 'none',
                                        '@keyframes pulse': {
                                            '0%': { opacity: 1 },
                                            '50%': { opacity: 0.6 },
                                            '100%': { opacity: 1 },
                                        }
                                    }}
                                />
                            </Tooltip>

                            <Chip
                                label={(isConnected && runtimeConnected) ? "TRADING READY" : "DEGRADED MODE"}
                                size="small"
                                sx={{
                                    fontWeight: 850, fontSize: '0.68rem', letterSpacing: 0.8,
                                    bgcolor: (isConnected && runtimeConnected) ? alpha('#22c55e', 0.15) : alpha('#ff9800', 0.15),
                                    color: (isConnected && runtimeConnected) ? '#22c55e' : '#ff9800',
                                    border: `1px solid ${(isConnected && runtimeConnected) ? alpha('#22c55e', 0.35) : alpha('#ff9800', 0.35)}`,
                                    boxShadow: (isConnected && runtimeConnected) ? `0 0 10px ${alpha('#22c55e', 0.3)}` : 'none',
                                }}
                            />
                        </Stack>
                    </Stack>
                </Box>

                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{
                                background: 'linear-gradient(90deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
                            }}>
                                {['S.No', 'Symbol', 'Lot Size', 'Max Qty', 'Lots', 'Quantity', 'Strategy', 'Order Type', 'Product', ...(isAdminRole ? ['Action'] : [])].map((h) => (
                                    <TableCell
                                        key={h}
                                        align={['Lot Size', 'Max Qty', 'Lots', 'Quantity', 'Action'].includes(h) ? 'center' : 'left'}
                                        sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.disabled', letterSpacing: 0.8, py: 1.5, whiteSpace: 'nowrap' }}
                                    >
                                        {h.toUpperCase()}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, idx) => {
                                const symColor = SYMBOL_COLORS[row.symbol] || '#6366f1';
                                return (
                                    <TableRow
                                        key={row.id}
                                        sx={{
                                            transition: 'background 0.15s',
                                            '&:hover': { bgcolor: alpha(symColor, 0.04) },
                                            '&:not(:last-child)': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}` }
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                bgcolor: alpha(symColor, 0.12),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: `1px solid ${alpha(symColor, 0.25)}`
                                            }}>
                                                <Typography variant="caption" fontWeight={800} sx={{ color: symColor, fontSize: '0.65rem' }}>
                                                    {idx + 1}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.symbol}
                                                size="small"
                                                sx={{
                                                    fontWeight: 800, fontSize: '0.72rem',
                                                    bgcolor: alpha(symColor, 0.12),
                                                    color: symColor,
                                                    border: `1px solid ${alpha(symColor, 0.3)}`,
                                                    height: 24,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight={700}>{row.lotSize}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="text.secondary">{row.maxQty}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={row.noOfLots}
                                                onChange={(e) => handleLotChange(row.id, parseInt(e.target.value, 10) || 1)}
                                                inputProps={{ min: 1, style: { padding: '4px 6px', width: '46px', textAlign: 'center', fontWeight: 700 } }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1.5,
                                                        '&.Mui-focused': { '& fieldset': { borderColor: symColor } }
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight={700} sx={{ color: symColor }}>{row.quantity}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.strategy}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem', height: 22 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                select size="small"
                                                value={row.orderType}
                                                sx={{
                                                    minWidth: 90,
                                                    '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                                                    '& .MuiSelect-select': { py: '4px', fontSize: '0.78rem', fontWeight: 600 }
                                                }}
                                            >
                                                {['Market', 'Limit', 'SL-L', 'SL-M'].map(opt => <MenuItem key={opt} value={opt} sx={{ fontSize: '0.78rem' }}>{opt}</MenuItem>)}
                                            </TextField>
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                select size="small"
                                                value={row.productType}
                                                sx={{
                                                    minWidth: 72,
                                                    '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                                                    '& .MuiSelect-select': { py: '4px', fontSize: '0.78rem', fontWeight: 600 }
                                                }}
                                            >
                                                {['MIS', 'CNC', 'BO', 'CO'].map(opt => <MenuItem key={opt} value={opt} sx={{ fontSize: '0.78rem' }}>{opt}</MenuItem>)}
                                            </TextField>
                                        </TableCell>
                                        {isAdminRole && (
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.75} justifyContent="center">
                                                    <Tooltip title={user.trading_status !== 'enabled' ? 'Trading disabled' : `Buy ${row.symbol} CE`}>
                                                        <span>
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                onClick={() => handleExecute(row, 'CE')}
                                                                disabled={user.trading_status !== 'enabled'}
                                                                sx={{
                                                                    minWidth: 68, fontWeight: 800, fontSize: '0.7rem',
                                                                    background: user.trading_status === 'enabled' ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
                                                                    boxShadow: user.trading_status === 'enabled' ? `0 2px 8px ${alpha('#10b981', 0.4)}` : 'none',
                                                                    borderRadius: 1.5,
                                                                    '&:hover': { boxShadow: `0 4px 14px ${alpha('#10b981', 0.5)}` }
                                                                }}
                                                            >
                                                                BUY CE
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title={user.trading_status !== 'enabled' ? 'Trading disabled' : `Buy ${row.symbol} PE`}>
                                                        <span>
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                onClick={() => handleExecute(row, 'PE')}
                                                                disabled={user.trading_status !== 'enabled'}
                                                                sx={{
                                                                    minWidth: 68, fontWeight: 800, fontSize: '0.7rem',
                                                                    background: user.trading_status === 'enabled' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined,
                                                                    boxShadow: user.trading_status === 'enabled' ? `0 2px 8px ${alpha('#ef4444', 0.4)}` : 'none',
                                                                    borderRadius: 1.5,
                                                                    '&:hover': { boxShadow: `0 4px 14px ${alpha('#ef4444', 0.5)}` }
                                                                }}
                                                            >
                                                                BUY PE
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>

                {/* Broker response */}
                {brokerResponse && (
                    <Box sx={{ px: 3, pb: 2.5, pt: 2 }}>
                        <Alert
                            severity={brokerResponse.status === 'success' ? 'success' : 'error'}
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                '&.MuiAlert-outlinedSuccess': { borderColor: alpha('#22c55e', 0.4), bgcolor: alpha('#22c55e', 0.04) },
                                '&.MuiAlert-outlinedError': { borderColor: alpha('#ef4444', 0.4), bgcolor: alpha('#ef4444', 0.04) }
                            }}
                            icon={<Iconify icon={brokerResponse.status === 'success' ? 'mdi:check-circle-outline' : 'mdi:alert-circle-outline'} width={22} />}
                            action={
                                <IconButton color="inherit" size="small" onClick={() => setBrokerResponse(null)}>
                                    <Iconify icon="mdi:close" width={16} />
                                </IconButton>
                            }
                        >
                            <Typography variant="subtitle2" fontWeight={700}>
                                {brokerResponse.status === 'success' ? '✅ Order Placed Successfully' : '❌ Execution Failed'}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.25 }}>{brokerResponse.message}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.6 }}>At {brokerResponse.time}</Typography>
                        </Alert>
                    </Box>
                )}
            </Card>
        </Box>
    );
}
