import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    Typography,
    Stack,
    Button,
    Box,
    IconButton,
    alpha,
    useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Iconify from 'src/components/iconify';
import { paths } from 'src/routes/paths';

export default function DemoUpgradePromotion() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const lastShown = localStorage.getItem('demo_promo_shown');
        const today = new Date().toDateString();

        if (lastShown !== today) {
            const timer = setTimeout(() => {
                setOpen(true);
                localStorage.setItem('demo_promo_shown', today);
            }, 5000); // Show after 5 seconds of login
            return () => clearTimeout(timer);
        }
        return undefined;
    }, []);

    const handleUpgrade = () => {
        setOpen(false);
        navigate(paths.pricing);
    };

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: `linear-gradient(135deg, ${theme.palette.primary.darker} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`,
                    color: 'white',
                    position: 'relative'
                }
            }}
        >
            <IconButton
                onClick={() => setOpen(false)}
                sx={{ position: 'absolute', top: 12, right: 12, color: 'white', zIndex: 9 }}
            >
                <Iconify icon="mdi:close" />
            </IconButton>

            <Box sx={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(theme.palette.warning.main, 0.2)} 0%, transparent 70%)` }} />

            <DialogContent sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
                <Stack spacing={4} alignItems="center">
                    <Box sx={{
                        width: 80, height: 80, borderRadius: '50%', bgcolor: alpha('#fff', 0.1),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                        <Iconify icon="solar:rocket-bold-duotone" width={48} sx={{ color: theme.palette.warning.main }} />
                    </Box>

                    <Box>
                        <Typography variant="h3" fontWeight={800} gutterBottom sx={{ letterSpacing: '-1px' }}>
                            Go Live. Trade Real.
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8, fontSize: '1.1rem', lineHeight: 1.6 }}>
                            You have seen the power of our Algo Trading in Demo mode. Now it&apos;s time to put your capital to work with
                            <strong> Real-time execution</strong> and <strong>Premium Signals</strong>.
                        </Typography>
                    </Box>

                    <Stack sx={{ width: '100%' }} spacing={2}>
                        <Button
                            variant="contained"
                            size="large"
                            color="warning"
                            fullWidth
                            onClick={handleUpgrade}
                            sx={{ py: 1.8, fontSize: '1.1rem', fontWeight: 800, borderRadius: 1.5, boxShadow: theme.customShadows.warning }}
                        >
                            Unlock Live Trading Now
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            fullWidth
                            onClick={() => setOpen(false)}
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: alpha('#fff', 0.05) } }}
                        >
                            I&apos;ll Continue with Demo
                        </Button>
                    </Stack>

                    <Typography variant="caption" sx={{ opacity: 0.5 }}>
                        * Live licence includes full broker connectivity and sub-admin support.
                    </Typography>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
