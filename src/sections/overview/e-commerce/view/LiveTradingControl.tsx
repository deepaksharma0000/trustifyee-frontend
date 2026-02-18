import React, { useState, useEffect } from 'react';
import {
    Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, TextField, MenuItem, Button, Box, Chip, Alert,
    Divider, IconButton, Stack
} from '@mui/material';
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

export default function LiveTradingControl({ user }: { user: any }) {
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

    // Initialize rows based on symbols
    useEffect(() => {
        fetchSignals();
        const interval = setInterval(fetchSignals, 5000); // Poll signals every 5s

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

            // Map frontend symbol names to backend expected names
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
                    quantity: row.noOfLots, // Backend handles Lot -> Quantity conversion
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
            <Box sx={{ mt: 3 }}>
                <Card sx={{ p: 5, textAlign: 'center', border: '2px dashed', borderColor: 'warning.main', bgcolor: 'warning.lighter' }}>
                    <Iconify icon="eva:alert-triangle-fill" width={60} sx={{ color: 'warning.main', mb: 2 }} />
                    <Typography variant="h4" gutterBottom>Connect Your Broker</Typography>
                    <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', maxWidth: 500, mx: 'auto' }}>
                        Your broker session is not active or not connected. Please go to the Broker Connect page to re-authenticate.
                    </Typography>
                    <Button
                        variant="contained"
                        color="warning"
                        size="large"
                        component={RouterLink}
                        to={paths.dashboard.brokerConnect}
                        startIcon={<Iconify icon="eva:link-fill" />}
                    >
                        Go to Broker Connect
                    </Button>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 3 }}>

            {/* 🔧 TASK 3: Signal Confirmation Layer */}
            {
                signals.length > 0 && (
                    <Card sx={{ p: 3, mb: 3, border: '2px solid #22c55e', bgcolor: 'rgba(34, 197, 94, 0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Iconify icon="eva:activity-fill" sx={{ color: 'success.main', animation: 'pulse 1.5s infinite' }} />
                            <Typography variant="h6" color="success.main">Incoming Trade Signals</Typography>
                        </Box>

                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Time</TableCell>
                                        <TableCell>Symbol</TableCell>
                                        <TableCell>Side</TableCell>
                                        <TableCell align="center">Strategy</TableCell>
                                        <TableCell align="center">Default Lots</TableCell>
                                        <TableCell align="center">Execute Lots</TableCell>
                                        <TableCell align="center">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {signals.map((sig) => (
                                        <TableRow key={sig._id}>
                                            <TableCell>{new Date(sig.createdAt).toLocaleTimeString()}</TableCell>
                                            <TableCell><strong>{sig.tradingsymbol}</strong></TableCell>
                                            <TableCell>
                                                <Label color={sig.side === 'BUY' ? 'success' : 'error'}>{sig.side}</Label>
                                            </TableCell>
                                            <TableCell align="center">{sig.strategy || 'Multi'}</TableCell>
                                            <TableCell align="center">1</TableCell>
                                            <TableCell align="center">
                                                <TextField
                                                    id={`lots-${sig._id}`}
                                                    type="number"
                                                    size="small"
                                                    defaultValue={1}
                                                    inputProps={{ min: 1, style: { width: '40px' } }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    size="small"
                                                    startIcon={<Iconify icon="eva:flash-fill" />}
                                                    onClick={() => {
                                                        const lotInput = document.getElementById(`lots-${sig._id}`) as HTMLInputElement;
                                                        handleExecuteSignal(sig._id, parseInt(lotInput.value, 10));
                                                    }}
                                                >
                                                    Execute
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                )
            }

            <Card sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Manual Operations</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">Platform Trading Status:</Typography>
                        <Chip
                            label={user.trading_status === 'enabled' ? "ACTIVE" : "DISABLED"}
                            color={user.trading_status === 'enabled' ? "success" : "error"}
                            size="small"
                        />
                    </Box>
                </Box>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>S.No</TableCell>
                                <TableCell>Symbol</TableCell>
                                <TableCell align="center">Lot Size</TableCell>
                                <TableCell align="center">Max Qty</TableCell>
                                <TableCell align="center">No. Of Lot</TableCell>
                                <TableCell align="center">Quantity</TableCell>
                                <TableCell>Strategy</TableCell>
                                <TableCell>Order Type</TableCell>
                                <TableCell>Product Type</TableCell>
                                <TableCell align="center">Manual Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, idx) => (
                                <TableRow key={row.id}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell><strong>{row.symbol}</strong></TableCell>
                                    <TableCell align="center">{row.lotSize}</TableCell>
                                    <TableCell align="center">{row.maxQty}</TableCell>
                                    <TableCell align="center">
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={row.noOfLots}
                                            onChange={(e) => handleLotChange(row.id, parseInt(e.target.value, 10) || 1)}
                                            inputProps={{ min: 1, style: { padding: '4px 8px', width: '50px' } }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">{row.quantity}</TableCell>
                                    <TableCell>
                                        <Chip label={row.strategy} size="small" variant="soft" />
                                    </TableCell>
                                    <TableCell>
                                        <TextField select size="small" value={row.orderType} sx={{ minWidth: 100 }}>
                                            {['Market', 'Limit', 'SL-L', 'SL-M'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                        </TextField>
                                    </TableCell>
                                    <TableCell>
                                        <TextField select size="small" value={row.productType} sx={{ minWidth: 80 }}>
                                            {['MIS', 'CNC', 'BO', 'CO'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                        </TextField>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="success"
                                                onClick={() => handleExecute(row, 'CE')}
                                                disabled={user.trading_status !== 'enabled'}
                                                sx={{ minWidth: 70 }}
                                            >
                                                BUY CE
                                            </Button>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="error"
                                                onClick={() => handleExecute(row, 'PE')}
                                                disabled={user.trading_status !== 'enabled'}
                                                sx={{ minWidth: 70 }}
                                            >
                                                BUY PE
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {brokerResponse && (
                    <Box sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }}>Broker Response Window</Divider>
                        <Alert
                            severity={brokerResponse.status === 'success' ? 'success' : 'error'}
                            icon={<Iconify icon={brokerResponse.status === 'success' ? 'eva:activity-fill' : 'eva:alert-triangle-fill'} />}
                            action={
                                <IconButton color="inherit" size="small" onClick={() => setBrokerResponse(null)}>
                                    <Iconify icon="eva:close-fill" />
                                </IconButton>
                            }
                        >
                            <Typography variant="subtitle2">
                                {brokerResponse.status === 'success' ? 'Execution Success' : 'Execution Failed'}
                            </Typography>
                            <Typography variant="body2">{brokerResponse.message}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>At: {brokerResponse.time}</Typography>
                        </Alert>
                    </Box>
                )}
            </Card>
        </Box >
    );
}
