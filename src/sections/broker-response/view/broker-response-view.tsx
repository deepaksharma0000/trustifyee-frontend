import { useState, useEffect, useCallback } from 'react';
// @mui
import {
    Card,
    Table,
    Stack,
    Avatar,
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
} from '@mui/material';
// components
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import EmptyContent from 'src/components/empty-content';
import { useSettingsContext } from 'src/components/settings';
import { LoadingScreen } from 'src/components/loading-screen';
import Label from 'src/components/label';
// utils
import axios, { endpoints } from 'src/utils/axios';
import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export default function BrokerResponseView() {
    const settings = useSettingsContext();

    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getResponses = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(endpoints.orders.brokerResponses);
            setTableData(response.data.data);
        } catch (err) {
            setError(err.message || 'Failed to fetch broker responses');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getResponses();
    }, [getResponses]);

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                <Typography variant="h4">Broker Responses</Typography>
                <Button
                    variant="contained"
                    startIcon={<Iconify icon="eva:refresh-fill" />}
                    onClick={getResponses}
                >
                    Refresh
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

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
                                        <TableCell colSpan={6}>
                                            <LoadingScreen />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {tableData.map((row: any) => (
                                            <TableRow key={row._id} hover>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                    <Typography variant="subtitle2">{fDateTime(row.createdAt)}</Typography>
                                                </TableCell>

                                                <TableCell>
                                                    <Label variant="soft" color="info">
                                                        {row.action.replace('_', ' ')}
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
                                                        fontWeight: row.status !== 'SUCCESS' ? 'bold' : 'normal'
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
                                        ))}
                                    </>
                                )}

                                {!loading && tableData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ py: 10 }}>
                                            <EmptyContent
                                                title="No Responses Found"
                                                description="You haven't received any broker responses yet."
                                                imgUrl="/assets/icons/empty/ic_content.svg"
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Scrollbar>
                </TableContainer>
            </Card>
        </Container>
    );
}
