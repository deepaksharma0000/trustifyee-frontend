import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Table,
    Button,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
    Stack,
    alpha,
} from '@mui/material';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { HOST_API } from 'src/config-global';
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

export default function SubscriptionRequestListView() {
    const { enqueueSnackbar } = useSnackbar();
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [remarks, setRemarks] = useState('');
    const [openProcess, setOpenProcess] = useState(false);
    const [processType, setProcessType] = useState<'APPROVE' | 'REJECT'>('APPROVE');

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${HOST_API}/api/subscriptions/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.ok) {
                setTableData(response.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleOpenProcess = (request: any, type: 'APPROVE' | 'REJECT') => {
        setSelectedRequest(request);
        setProcessType(type);
        setOpenProcess(true);
    };

    const handleProcess = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(`${HOST_API}/api/subscriptions/admin/process`, {
                requestId: selectedRequest._id,
                action: processType,
                remarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.ok) {
                enqueueSnackbar(`Request ${processType === 'APPROVE' ? 'Approved' : 'Rejected'} successfully`, { variant: 'success' });
                setOpenProcess(false);
                setRemarks('');
                fetchRequests();
            }
        } catch (error: any) {
            enqueueSnackbar(error.response?.data?.message || 'Process failed', { variant: 'error' });
        }
    };

    return (
        <>
            <Card>
                <Scrollbar>
                    <TableContainer sx={{ minWidth: 800, position: 'relative' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Transaction ID</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {tableData.map((row: any) => (
                                    <TableRow key={row._id}>
                                        <TableCell>
                                            <Typography variant="subtitle2">{row.userName}</Typography>
                                        </TableCell>
                                        <TableCell>{row.planName} ({row.durationMonths}m)</TableCell>
                                        <TableCell>₹{row.amount}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="body2">{row.transactionId}</Typography>
                                                <IconButton size="small" onClick={() => { navigator.clipboard.writeText(row.transactionId); enqueueSnackbar('Copied!'); }}>
                                                    <Iconify icon="eva:copy-fill" width={14} />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{new Date(row.requestedAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Label
                                                variant="soft"
                                                color={
                                                    (row.status === 'APPROVED' && 'success') ||
                                                    (row.status === 'PENDING' && 'warning') ||
                                                    'error'
                                                }
                                            >
                                                {row.status}
                                            </Label>
                                        </TableCell>
                                        <TableCell align="right">
                                            {row.status === 'PENDING' && (
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Tooltip title="Approve">
                                                        <IconButton color="success" onClick={() => handleOpenProcess(row, 'APPROVE')}>
                                                            <Iconify icon="eva:checkmark-circle-2-fill" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reject">
                                                        <IconButton color="error" onClick={() => handleOpenProcess(row, 'REJECT')}>
                                                            <Iconify icon="eva:close-circle-fill" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>
            </Card>

            <Dialog open={openProcess} onClose={() => setOpenProcess(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{processType === 'APPROVE' ? 'Approve Subscription' : 'Reject Subscription'}</DialogTitle>
                <DialogContent sx={{ py: 2 }}>
                    <Stack spacing={3}>
                        <Typography variant="body2">
                            User: <strong>{selectedRequest?.userName}</strong><br />
                            Transaction ID: <strong>{selectedRequest?.transactionId}</strong>
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Admin Remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenProcess(false)}>Cancel</Button>
                    <Button variant="contained" color={processType === 'APPROVE' ? 'success' : 'error'} onClick={handleProcess}>
                        Confirm {processType === 'APPROVE' ? 'Approval' : 'Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
