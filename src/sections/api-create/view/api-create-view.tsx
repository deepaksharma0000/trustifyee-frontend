import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Iconify from 'src/components/iconify';

export default function ApiCreateView() {
    const theme = useTheme();

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" sx={{ mb: 5 }}>
                API Creation Info
            </Typography>

            <Card sx={{ p: 5, textAlign: 'center' }}>
                <Box
                    sx={{
                        display: 'inline-flex',
                        p: 3,
                        mb: 3,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        color: 'success.main',
                    }}
                >
                    <Iconify icon="eva:checkmark-circle-2-fill" width={80} />
                </Box>

                <Typography variant="h3" sx={{ mb: 2 }}>
                    Your Demo Account is Active
                </Typography>

                <Typography color="text.secondary">
                    You are currently exploring the platform in Demo mode.
                    <br />
                    API creation is not required for demo accounts.
                </Typography>
            </Card>
        </Container>
    );
}
