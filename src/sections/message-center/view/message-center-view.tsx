import { useState, useCallback, useEffect } from 'react';
// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import TableHead from '@mui/material/TableHead';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
// routes
import { paths } from 'src/routes/paths';
// components
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Scrollbar from 'src/components/scrollbar';
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

type Message = {
    _id: string;
    subject: string;
    message: string;
    target: string;
    created_at: string;
};

export default function MessageCenterView() {
    const settings = useSettingsContext();
    const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        target: 'All'
    });
    const [editId, setEditId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/api/messages/admin/list`, {
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
        fetchMessages();
    }, [fetchMessages]);

    const handleDispatch = async () => {
        if (!formData.subject || !formData.message) {
            setError("Subject and message are required");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('authToken');
            const url = editId
                ? `${API_BASE}/api/messages/${editId}`
                : `${API_BASE}/api/messages/dispatch`;

            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.status) {
                setSuccess(editId ? "Message updated!" : "Message dispatched!");
                setFormData({ subject: '', message: '', target: 'All' });
                setEditId(null);
                fetchMessages();
            } else {
                setError(data.error || "Failed to dispatch message");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/api/messages/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                fetchMessages();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (msg: Message) => {
        setFormData({
            subject: msg.subject,
            message: msg.message,
            target: msg.target
        });
        setEditId(msg._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            <CustomBreadcrumbs
                heading="Message Center"
                links={[
                    { name: 'Dashboard', href: paths.dashboard.root },
                    { name: 'Message Center' },
                ]}
                sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Stack spacing={3}>
                <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        {editId ? 'Edit Message' : 'Dispatch New Message'}
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Stack spacing={3}>
                        <TextField
                            select
                            fullWidth
                            label="Please Select Broker"
                            value={formData.target}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                        >
                            <MenuItem value="All">All Users (Live, Demo and all of them)</MenuItem>
                            <MenuItem value="Demo">Demo</MenuItem>
                        </TextField>

                        <TextField
                            fullWidth
                            label="Enter your subject"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Enter Your Message"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        />

                        <LoadingButton
                            variant="contained"
                            color="primary"
                            size="large"
                            loading={loading}
                            onClick={handleDispatch}
                            startIcon={<Iconify icon="solar:paper-plane-bold" />}
                        >
                            {editId ? 'Update Message' : 'Dispatch Message'}
                        </LoadingButton>

                        {editId && (
                            <Button color="inherit" onClick={() => {
                                setEditId(null);
                                setFormData({ subject: '', message: '', target: 'All' });
                            }}>
                                Cancel Edit
                            </Button>
                        )}
                    </Stack>
                </Card>

                <Card>
                    <TableContainer component={Scrollbar}>
                        <Table sx={{ minWidth: 650 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>S.No</TableCell>
                                    <TableCell>Subject</TableCell>
                                    <TableCell>Message</TableCell>
                                    <TableCell>Target</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {messages.map((row, index) => (
                                    <TableRow key={row._id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{row.subject}</TableCell>
                                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {row.message}
                                        </TableCell>
                                        <TableCell>{row.target}</TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => handleEdit(row)} color="primary">
                                                <Iconify icon="solar:pen-bold" />
                                            </IconButton>
                                            <IconButton onClick={() => handleDelete(row._id)} color="error">
                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {messages.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            No messages found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Stack>
        </Container>
    );
}
