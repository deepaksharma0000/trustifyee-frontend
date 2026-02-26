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
    SENSEX: 20
};

const SYMBOL_COLORS: Record<string, string> = {
    BankNifty: '#6366f1',
    FINNIFTY: '#3b82f6',
    NIFTY: '#10b981',
    SENSEX: '#f59e0b',
};

export default function LiveTradingControl({ user }: { user: any }) {
    const theme = useTheme();
    const [rows, setRows] = useState<TradingRow[]>([]);
    const [signals, setSignals] = useState<any[]>([]);
    const [brokerResponse, setBrokerResponse] = useState<any>(null);

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

        const initialRows: TradingRow[] = (['BankNifty', 'FINNIFTY', 'NIFTY', 'SENSEX'] as const).map((sym, idx) => ({
            id: idx.toString(),
            symbol: sym,
            lotSize: SYMBOL_LOT_SIZES[sym],
            maxQty: SYMBOL_LOT_SIZES[sym] * 40,
            noOfLots: 1,
            quantity: SYMBOL_LOT_SIZES[sym],
            strategy: user.strategies && user.strategies.length > 0 ? user.strategies[0] : 'None',
            orderType: 'Market',
            productType: 'MIS',
            isActive: true
        }));
        setRows(initialRows);

        return () => clearInterval(interval);
    }, [user]);

    const handleExecuteSignal = async (signalId: string, lots: number) => {
        setBrokerResponse(null);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${HOST_API}/api/signals/execute`, {
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
                fetchSignals();
            } else {
                throw new Error(data.error || 'Failed to execute signal');
            }
        } catch (err: any) {
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
                    quantity: row.noOfLots,
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

    const isConnected = !!user.broker_connected || localStorage.getItem('angel_jwt') !== null;

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
                                    {['Time', 'Symbol', 'Side', 'Strategy', 'Default Lots', 'Execute Lots', 'Action'].map((h) => (
                                        <TableCell key={h} align={['Default Lots', 'Execute Lots', 'Action'].includes(h) ? 'center' : 'left'} sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.disabled', letterSpacing: 0.8, py: 1.5 }}>
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
                                            <Chip label={sig.strategy || 'Multi'} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight={700}>1</Typography>
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
                                                startIcon={<Iconify icon="mdi:flash" width={14} />}
                                                onClick={() => {
                                                    const lotInput = document.getElementById(`lots-${sig._id}`) as HTMLInputElement;
                                                    handleExecuteSignal(sig._id, parseInt(lotInput.value, 10));
                                                }}
                                                sx={{
                                                    borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem',
                                                    background: 'linear-gradient(135deg, #22c55e, #15803d)',
                                                    boxShadow: `0 2px 8px ${alpha('#22c55e', 0.4)}`,
                                                    '&:hover': { boxShadow: `0 4px 14px ${alpha('#22c55e', 0.5)}` }
                                                }}
                                            >
                                                Execute
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

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>Trading:</Typography>
                        <Chip
                            label={user.trading_status === 'enabled' ? 'ACTIVE' : 'DISABLED'}
                            size="small"
                            sx={{
                                fontWeight: 800, fontSize: '0.65rem', letterSpacing: 0.8,
                                bgcolor: user.trading_status === 'enabled' ? alpha('#22c55e', 0.15) : alpha('#ef4444', 0.15),
                                color: user.trading_status === 'enabled' ? '#22c55e' : '#ef4444',
                                border: `1px solid ${user.trading_status === 'enabled' ? alpha('#22c55e', 0.35) : alpha('#ef4444', 0.35)}`,
                            }}
                        />
                    </Stack>
                </Box>

                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{
                                background: 'linear-gradient(90deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
                            }}>
                                {['S.No', 'Symbol', 'Lot Size', 'Max Qty', 'Lots', 'Quantity', 'Strategy', 'Order Type', 'Product', 'Action'].map((h) => (
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
