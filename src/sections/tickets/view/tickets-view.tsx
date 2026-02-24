import { useState, useCallback, useEffect } from 'react';
// @mui
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
// routes
import { paths } from 'src/routes/paths';
// components
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Scrollbar from 'src/components/scrollbar';
import Label from 'src/components/label';
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

type Ticket = {
    _id: string;
    username: string;
    fullName: string;
    mobile: string;
    email: string;
    message: string;
    status: 'Open' | 'Closed' | 'Pending';
    created_at: string;
};

export default function TicketsView() {
    const settings = useSettingsContext();
    const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

    const [tickets, setMessages] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [openModal, setOpenModal] = useState(false);

    const fetchTickets = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/api/tickets/admin/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                setMessages(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    }, [API_BASE]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/api/tickets/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.status) {
                fetchTickets();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this ticket?")) return;
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                fetchTickets();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleView = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setOpenModal(true);
    };

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            <CustomBreadcrumbs
                heading="Support Tickets"
                links={[
                    { name: 'Dashboard', href: paths.dashboard.root },
                    { name: 'Tickets' },
                ]}
                sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
                <TableContainer component={Scrollbar}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>S.No</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Email / Mobile</TableCell>
                                <TableCell>Subject (Message Preview)</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tickets.map((row, index) => (
                                <TableRow key={row._id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Typography variant="subtitle2">{row.fullName}</Typography>
                                        <Typography variant="caption" color="text.secondary">@{row.username}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{row.email}</Typography>
                                        <Typography variant="caption">{row.mobile}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 250 }}>
                                        <Typography variant="body2" sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: 'vertical'
                                        }}>
                                            {row.message}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            size="small"
                                            value={row.status}
                                            onChange={(e) => handleUpdateStatus(row._id, e.target.value)}
                                            sx={{
                                                minWidth: 100,
                                                '& .MuiSelect-select': { py: 0.5, fontSize: '0.875rem' }
                                            }}
                                        >
                                            <MenuItem value="Open">Open</MenuItem>
                                            <MenuItem value="Pending">Pending</MenuItem>
                                            <MenuItem value="Closed">Closed</MenuItem>
                                        </Select>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <IconButton color="info" onClick={() => handleView(row)}>
                                                <Iconify icon="solar:eye-bold" />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => handleDelete(row._id)}>
                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {tickets.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                        No tickets found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Ticket Details</DialogTitle>
                <DialogContent dividers>
                    {selectedTicket && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="overline" color="text.secondary">User Information</Typography>
                                <Typography variant="h6">{selectedTicket.fullName} (@{selectedTicket.username})</Typography>
                                <Typography variant="body2">{selectedTicket.email} | {selectedTicket.mobile}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="overline" color="text.secondary">Status</Typography>
                                <div>
                                    <Label color={
                                        (selectedTicket.status === 'Open' && 'error') ||
                                        (selectedTicket.status === 'Pending' && 'warning') ||
                                        'success'
                                    }>
                                        {selectedTicket.status}
                                    </Label>
                                </div>
                            </Box>
                            <Box>
                                <Typography variant="overline" color="text.secondary">Message</Typography>
                                <Typography variant="body1" sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                                    {selectedTicket.message}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.disabled">
                                    Received at: {new Date(selectedTicket.created_at).toLocaleString()}
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)} variant="outlined">Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
