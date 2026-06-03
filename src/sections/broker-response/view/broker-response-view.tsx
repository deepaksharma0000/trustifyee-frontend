import { useState, useEffect, useCallback } from 'react';
// @mui
import {
    Card,
    Table,
    Stack,
    TableRow,
    TableBody,
    TableCell,
    Container,
    Typography,
    TableContainer,
    TableHead,
    Alert,
    IconButton,
    Button,
    Box,
    Tooltip,
    Tabs,
    Tab,
    TextField,
} from '@mui/material';
// components
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import EmptyContent from 'src/components/empty-content';
import { useSettingsContext } from 'src/components/settings';
import { LoadingScreen } from 'src/components/loading-screen';
import Label from 'src/components/label';
import ExecutionRouteBanner from 'src/components/execution-route-banner/ExecutionRouteBanner';
import { useAuthUser } from 'src/hooks/use-auth-user';
// utils
import axios, { endpoints } from 'src/utils/axios';
import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

type AngelOrderRow = {
    orderid: string;
    tradingsymbol: string;
    exchange: string;
    transactiontype: string;
    ordertype: string;
    producttype: string;
    quantity: number;
    price: number;
    orderstatus: string;
    statusmessage: string;
    updatetime: string;
    fillshares: number;
    averageprice: number;
};

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const s = String(status || '').toUpperCase();
    if (s === 'COMPLETE' || s === 'SUCCESS') return 'success';
    if (s === 'OPEN' || s === 'PENDING' || s === 'TRIGGER PENDING' || s === 'PARTIALLY FILLED') return 'info';
    if (s === 'REJECTED' || s === 'CANCELLED' || s === 'CANCELED' || s === 'FAILED') return 'error';
    return 'warning';
};

export default function BrokerResponseView() {
    const settings = useSettingsContext();
    const { user: authUser } = useAuthUser();
    const isAdmin = authUser?.role === 'admin' || authUser?.role === 'sub-admin' || authUser?.role === 'subadmin';

    const [currentTab, setCurrentTab] = useState(0);
    const [platformData, setPlatformData] = useState<any[]>([]);
    const [angelOrders, setAngelOrders] = useState<AngelOrderRow[]>([]);
    const [platformExecutions, setPlatformExecutions] = useState<any[]>([]);
    const [clientcode, setClientcode] = useState('');
    const [clientcodeInput, setClientcodeInput] = useState('');
    const [fetchedAt, setFetchedAt] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [angelOrdersError, setAngelOrdersError] = useState<string | null>(null);

    useEffect(() => {
        if (isAdmin) {
            setClientcode('');
            setClientcodeInput('');
            return;
        }

        const savedClientCode = localStorage.getItem('angel_clientcode') || '';
        setClientcode(savedClientCode);
        setClientcodeInput(savedClientCode);
    }, [isAdmin]);

    const fetchAll = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setLoading(true);
        }
        setError(null);
        setAngelOrdersError(null);

        const scopedClientCode = String(clientcode || '').trim();
        const requestParams = scopedClientCode ? { clientcode: scopedClientCode } : undefined;

        // 1. Fetch Broker Responses (API Responses)
        try {
            const responsesRes = await axios.get(endpoints.orders.brokerResponses, { params: requestParams });
            setPlatformData(responsesRes.data?.data || []);
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || 'Failed to fetch broker responses');
        }

        // 2. Fetch Angel One Order Book & Platform Executions
        try {
            const angelRes = await axios.get(endpoints.orders.angelOrderBook, { params: requestParams });
            setPlatformExecutions(angelRes.data?.platformExecutions || []);
            const returnedClientCode = String(angelRes.data?.clientcode || '').trim().toUpperCase();
            if (returnedClientCode && returnedClientCode !== 'ALL') {
                setClientcode(returnedClientCode);
                setClientcodeInput(returnedClientCode);
            }
            
            if (angelRes.data?.angelOneError) {
                setAngelOrdersError(angelRes.data.angelOneError);
                setAngelOrders([]);
                setFetchedAt('');
            } else {
                setAngelOrders(angelRes.data?.angelOne?.orders || []);
                setFetchedAt(angelRes.data?.angelOne?.fetchedAt || '');
            }
        } catch (err: any) {
            setAngelOrdersError(err?.response?.data?.message || err.message || 'Failed to fetch Angel One order book');
            setAngelOrders([]);
            setFetchedAt('');
        } finally {
            if (!options?.silent) {
                setLoading(false);
            }
        }
    }, [clientcode]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchAll({ silent: true });
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchAll]);

    useEffect(() => {
        const handleWsMessage = (event: CustomEvent) => {
            const msg = event.detail;
            if (msg?.type === 'TRADE_EXECUTION_UPDATE') {
                console.log('[BrokerResponseView] Real-time execution update received, refreshing data...', msg.data);
                fetchAll({ silent: true });
            }
        };

        window.addEventListener('ws-signal-message' as any, handleWsMessage);
        return () => {
            window.removeEventListener('ws-signal-message' as any, handleWsMessage);
        };
    }, [fetchAll]);

    let renderAngelOrdersContent;
    if (loading) {
        renderAngelOrdersContent = (
            <TableRow>
                <TableCell colSpan={8}><LoadingScreen /></TableCell>
            </TableRow>
        );
    } else if (angelOrders.length === 0) {
        renderAngelOrdersContent = (
            <TableRow>
                <TableCell colSpan={8} sx={{ py: 8 }}>
                    <EmptyContent
                        title="No orders in Angel One book"
                        description="Orders placed successfully will appear here with live broker status."
                    />
                </TableCell>
            </TableRow>
        );
    } else {
        renderAngelOrdersContent = angelOrders.map((row) => (
            <TableRow key={row.orderid || `${row.tradingsymbol}-${row.updatetime}`} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.updatetime || '—'}</TableCell>
                <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {row.orderid || '—'}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="subtitle2">{row.tradingsymbol}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.exchange}</Typography>
                </TableCell>
                <TableCell>{row.transactiontype}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.price}</TableCell>
                <TableCell>
                    <Label variant="filled" color={statusColor(row.orderstatus)}>
                        {row.orderstatus || 'UNKNOWN'}
                    </Label>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {row.statusmessage || '—'}
                    </Typography>
                </TableCell>
            </TableRow>
        ));
    }

    let renderPlatformExecutionsContent;
    if (loading) {
        renderPlatformExecutionsContent = (
            <TableRow>
                <TableCell colSpan={6}><LoadingScreen /></TableCell>
            </TableRow>
        );
    } else if (platformExecutions.length === 0) {
        renderPlatformExecutionsContent = (
            <TableRow>
                <TableCell colSpan={6} sx={{ py: 8 }}>
                    <EmptyContent title="No platform executions yet" />
                </TableCell>
            </TableRow>
        );
    } else {
        renderPlatformExecutionsContent = platformExecutions.map((row: any) => (
            <TableRow key={String(row._id)} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {fDateTime(row.updatedAt || row.executedAt)}
                </TableCell>
                <TableCell>
                    <Label variant="filled" color={statusColor(row.status)}>
                        {row.status}
                    </Label>
                </TableCell>
                <TableCell>
                    <Label variant="soft" color={statusColor(row.brokerOrderStatus || '')}>
                        {row.brokerOrderStatus || '—'}
                    </Label>
                </TableCell>
                <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {row.orderId || row.clientOrderId || '—'}
                    </Typography>
                </TableCell>
                <TableCell>{row.source || '—'}</TableCell>
                <TableCell>
                    <Typography variant="body2" color={row.status === 'FAILED' ? 'error.main' : 'text.secondary'}>
                        {row.brokerRejectReason || row.errorMessage || '—'}
                    </Typography>
                </TableCell>
            </TableRow>
        ));
    }

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            <ExecutionRouteBanner />

            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} mt={2}>
                <Box>
                    <Typography variant="h4">Order Status</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Live Angel One order book + Trustifye execution history
                        {clientcode ? ` · Client ${clientcode}` : ''}
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <TextField
                        size="small"
                        label="Client Code"
                        value={clientcodeInput}
                        onChange={(event) => setClientcodeInput(event.target.value.toUpperCase())}
                        placeholder={isAdmin ? 'Leave blank for global history' : 'Angel client code'}
                        helperText={isAdmin ? 'Leave blank to view global execution history' : 'Loaded from your saved broker session'}
                        sx={{ minWidth: { xs: '100%', sm: 280 } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="eva:refresh-fill" />}
                        onClick={() => setClientcode(String(clientcodeInput || '').trim().toUpperCase())}
                    >
                        Refresh
                    </Button>
                </Stack>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
                <Tab label={`Angel One Orders (${angelOrders.length})`} />
                <Tab label={`Platform Executions (${platformExecutions.length})`} />
                <Tab label={`API Responses (${platformData.length})`} />
            </Tabs>

            {currentTab === 0 && (
                <Card>
                    {angelOrdersError && (
                        <Alert severity="warning" sx={{ m: 2 }}>
                            Broker Sync Alert: {angelOrdersError}. Please reconnect your broker if session is expired.
                        </Alert>
                    )}
                    {!clientcode && (
                        <Alert severity="info" sx={{ m: 2 }}>
                            Global mode is active. Enter a client code to inspect one Angel One account.
                        </Alert>
                    )}
                    {fetchedAt && (
                        <Box sx={{ px: 2, pt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                Last synced from Angel One: {fDateTime(fetchedAt)}
                            </Typography>
                        </Box>
                    )}
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                        <Scrollbar>
                            <Table size="medium" sx={{ minWidth: 960 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Updated</TableCell>
                                        <TableCell>Order ID</TableCell>
                                        <TableCell>Symbol</TableCell>
                                        <TableCell>Side</TableCell>
                                        <TableCell>Qty</TableCell>
                                        <TableCell>Price</TableCell>
                                        <TableCell>Angel Status</TableCell>
                                        <TableCell>Message</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {renderAngelOrdersContent}
                                </TableBody>
                            </Table>
                        </Scrollbar>
                    </TableContainer>
                </Card>
            )}

            {currentTab === 1 && (
                <Card>
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                        <Scrollbar>
                            <Table size="medium" sx={{ minWidth: 900 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Time</TableCell>
                                        <TableCell>Platform Status</TableCell>
                                        <TableCell>Angel Status</TableCell>
                                        <TableCell>Order ID</TableCell>
                                        <TableCell>Source</TableCell>
                                        <TableCell>Message</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {renderPlatformExecutionsContent}
                                </TableBody>
                            </Table>
                        </Scrollbar>
                    </TableContainer>
                </Card>
            )}

            {currentTab === 2 && (
                <Card>
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                        <Scrollbar>
                            <Table size="medium" sx={{ minWidth: 800 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Time</TableCell>
                                        <TableCell>Action</TableCell>
                                        <TableCell>Symbol</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Message / Reason</TableCell>
                                        <TableCell align="right">Info</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6}><LoadingScreen /></TableCell>
                                        </TableRow>
                                    ) : (
                                        platformData.map((row: any) => (
                                            <TableRow key={row._id} hover>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                    <Typography variant="subtitle2">{fDateTime(row.createdAt)}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Label variant="soft" color="info">
                                                        {String(row.action || '').replace('_', ' ')}
                                                    </Label>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                        {row.tradingsymbol || 'N/A'}
                                                    </Typography>
                                                </TableCell>
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
                                                <TableCell>
                                                    <Typography variant="body2" sx={{
                                                        color: row.status !== 'SUCCESS' ? 'error.main' : 'text.primary',
                                                    }}>
                                                        {row.message}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {row.brokerError && (
                                                        <Tooltip title={JSON.stringify(row.brokerError, null, 2)}>
                                                            <IconButton color="primary">
                                                                <Iconify icon="eva:info-fill" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {!loading && platformData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ py: 10 }}>
                                                <EmptyContent title="No API responses found" />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Scrollbar>
                    </TableContainer>
                </Card>
            )}
        </Container>
    );
}
