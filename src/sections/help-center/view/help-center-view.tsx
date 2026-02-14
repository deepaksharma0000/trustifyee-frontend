import { useState } from 'react';
// @mui
import {
    Container,
    Typography,
    Stack,
    TextField,
    Button,
    Card,
    CardHeader,
    CardContent,
    Alert,
    Snackbar,
    Box,
    CircularProgress,
} from '@mui/material';
// components
import Iconify from 'src/components/iconify';
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

export default function HelpCenterView() {
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        mobile: '',
        email: '',
        message: '',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${HOST_API}/api/help/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Something went wrong');
            }

            setSuccess(true);
            setFormData({
                username: '',
                fullName: '',
                mobile: '',
                email: '',
                message: '',
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h4" sx={{ mb: 3 }}>
                Help Center
            </Typography>

            <Card sx={{ boxShadow: (theme) => theme.customShadows.z20 }}>
                <CardHeader
                    title="Submit Help Request"
                    subheader="Please fill in the details below and we will get back to you shortly."
                    sx={{ mb: 2 }}
                />

                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <Box
                                display="grid"
                                gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}
                                gap={3}
                            >
                                <TextField
                                    fullWidth
                                    name="username"
                                    label="Username"
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    name="fullName"
                                    label="Full Name"
                                    placeholder="Enter your full name"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    name="mobile"
                                    label="Mobile Number"
                                    placeholder="Enter your mobile number"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    name="email"
                                    label="Email Address"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </Box>

                            <TextField
                                fullWidth
                                name="message"
                                label="Your Message"
                                placeholder="Describe the issue you are facing..."
                                multiline
                                rows={4}
                                value={formData.message}
                                onChange={handleChange}
                                required
                            />

                            <Button
                                fullWidth
                                size="large"
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : <Iconify icon="solar:ticket-bold" />}
                                sx={{
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {loading ? 'Registering Issue...' : 'Generate Ticket'}
                            </Button>
                        </Stack>
                    </form>
                </CardContent>
            </Card>

            <Snackbar
                open={success}
                autoHideDuration={6000}
                onClose={() => setSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
                    Issue registered successfully! Our team will contact you soon.
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        </Container>
    );
}
