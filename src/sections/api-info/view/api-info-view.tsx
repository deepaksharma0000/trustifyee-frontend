import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
// @mui
import {
    Box,
    Card,
    Grid,
    Modal,
    Stack,
    Button,
    Typography,
    IconButton,
    Container,
    alpha,
    useTheme,
    TextField,
    useMediaQuery,
    Paper,
} from '@mui/material';
// components
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import Label from 'src/components/label';

// ----------------------------------------------------------------------

const BROKERS = [
    {
        name: 'AngelOne',
        icon: 'simple-icons:angelone',
        color: '#0052cc',
        officialUrl: 'https://smartapi.angelbroking.com/',
        redirectUrl: 'https://trustifye.co.in/dashboard/banking',
        steps: [
            { title: 'Login to SmartAPI', description: 'Go to AngelOne SmartAPI portal and login with your credentials.' },
            { title: 'Create New App', description: 'Click on "Create App" button to start the process.' },
            { title: 'Enter Details', description: 'Fill the App Name and use our Redirect URL.' },
            { title: 'Get API Key', description: 'Once created, you will see your API Key and Secret.' },
        ],
    },
    {
        name: 'Upstox',
        icon: 'simple-icons:upstox',
        color: '#340f4b',
        officialUrl: 'https://developer.upstox.com/',
        redirectUrl: 'https://trustifye.co.in/dashboard/banking',
        steps: [
            { title: 'Visit Developer Hub', description: 'Open Upstox Developer Hub and sign in.' },
            { title: 'App Management', description: 'Go to "My Apps" section.' },
            { title: 'Create App', description: 'Fill required fields and set Redirect URL.' },
            { title: 'Copy Credentials', description: 'Securely copy your Client ID and Secret.' },
        ],
    },
    {
        name: 'Kotak Neo',
        icon: 'solar:bank-bold-duotone',
        color: '#e31a2c',
        officialUrl: 'https://neo.kotak.com/',
        redirectUrl: 'https://trustifye.co.in/dashboard/banking',
        steps: [
            { title: 'Login Neo Portal', description: 'Go to Kotak Neo developer portal.' },
            { title: 'API Management', description: 'Navigate to API Management tab.' },
            { title: 'Setup Keys', description: 'Generate your Consumer Key and Secret.' },
            { title: 'Finish', description: 'Copy the credentials to our platform.' },
        ]
    },
];

const modalStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 2,
    outline: 'none',
    overflow: 'hidden',
};

// ----------------------------------------------------------------------

export default function ApiInfoView() {
    const settings = useSettingsContext();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // ✅ Get User Data from LocalStorage (Consistent with Navigation)
    const userData = useMemo(() => {
        try {
            const data = localStorage.getItem('authUser');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }, []);

    const role = userData?.role || 'user';
    const licence = userData?.licence || '';
    const connectedBroker = userData?.broker || userData?.vendor || '';

    // ✅ Filter BROKERS based on role and licence
    const filteredBrokers = useMemo(() => {
        if (role === 'admin' || role === 'subadmin') {
            return BROKERS;
        }
        if (licence === 'Demo') {
            return BROKERS; // Show all for demo if needed, or specific ones. 
            // User said "Demo se hai to usko demo show hona chahiye"
        }
        // For Live users, show only their connected broker
        if (licence === 'Live' && connectedBroker) {
            return BROKERS.filter(b => b.name.toLowerCase() === connectedBroker.toLowerCase());
        }
        return BROKERS;
    }, [role, licence, connectedBroker]);

    // ✅ Dynamic Heading
    const pageHeading = useMemo(() => {
        if (role === 'admin' || role === 'subadmin') return "Broker Integration";
        if (licence === 'Demo') return "Demo Account Info";
        return connectedBroker ? `${connectedBroker} Integration` : "Broker Integration";
    }, [role, licence, connectedBroker]);

    const [selectedBroker, setSelectedBroker] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const timerRef = useRef<any>(null);

    const startAnimation = useCallback(() => {
        setIsPlaying(true);
    }, []);

    const stopAnimation = useCallback(() => {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (isPlaying && selectedBroker) {
            timerRef.current = setInterval(() => {
                setCurrentStep((prev) => (prev + 1) % (selectedBroker.steps.length + 1));
            }, 4000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, selectedBroker]);

    const handleOpen = (broker: any) => {
        setSelectedBroker(broker);
        setCurrentStep(0);
        setIsPlaying(true);
    };

    const handleClose = () => {
        setSelectedBroker(null);
        setIsPlaying(false);
    };

    const handleNext = () => {
        setIsPlaying(false);
        setCurrentStep((prev) => (prev + 1) % (selectedBroker.steps.length + 1));
    };

    const handlePrev = () => {
        setIsPlaying(false);
        setCurrentStep((prev) => (prev - 1 + (selectedBroker.steps.length + 1)) % (selectedBroker.steps.length + 1));
    };

    const speak = useCallback((text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.15;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    useEffect(() => {
        if (isPlaying && selectedBroker) {
            const hingeText = currentStep < selectedBroker.steps.length
                ? `${selectedBroker.steps[currentStep].title}. ${selectedBroker.steps[currentStep].description}`
                : `Setup complete ho gaya hai!`;
            speak(hingeText);
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, [currentStep, isPlaying, selectedBroker, speak]);

    const cursorPosition = useMemo(() => {
        if (isPlaying) {
            if (isMobile) {
                return { x: [40, 180, 160], y: [120, 80, 100] };
            }
            return { x: [50, 450, 430], y: [150, 150, 170] };
        }
        if (isMobile) {
            return { x: 160, y: 100 };
        }
        return { x: 430, y: 170 };
    }, [isPlaying, isMobile]);

    return (
        <Container maxWidth={settings.themeStretch ? false : 'xl'}>
            <Box sx={{ mb: { xs: 5, md: 8 }, textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 900, mb: 1 }}>{pageHeading}</Typography>
                <Typography variant="body1" color="text.secondary">
                    {licence === 'Demo' ? 'Explore our features in demo mode' : 'Securely connect your broker account in simple steps'}
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {filteredBrokers.map((broker) => (
                    <Grid key={broker.name} item xs={12} sm={6} md={4}>
                        <Card
                            sx={{
                                p: 4, textAlign: 'center', cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': { transform: 'translateY(-8px)', boxShadow: theme.customShadows.z24 }
                            }}
                            onClick={() => handleOpen(broker)}
                        >
                            <Box sx={{ width: 80, height: 80, borderRadius: '24px', bgcolor: alpha(broker.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                                <Iconify icon={broker.icon} width={40} sx={{ color: broker.color }} />
                            </Box>
                            <Typography variant="h5" fontWeight={800} mb={1}>{broker.name}</Typography>
                            <Label color="info" variant="soft">Professional Integration</Label>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Modal open={!!selectedBroker} onClose={handleClose} closeAfterTransition>
                <Box sx={{ ...modalStyle, width: { xs: '98%', md: 1000 }, maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
                    {selectedBroker && (
                        <>
                            <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h5" fontWeight={800}>{selectedBroker.name} Guide</Typography>
                                <IconButton onClick={handleClose}><Iconify icon="solar:close-circle-bold" /></IconButton>
                            </Box>

                            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={7}>
                                        <Box sx={{ bgcolor: '#000', borderRadius: 2, p: 0.5 }}>
                                            <Box sx={{ height: 400, bgcolor: 'white', borderRadius: 1, position: 'relative', overflow: 'hidden', p: 4 }}>
                                                <AnimatePresence mode="wait">
                                                    <m.div key={currentStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%' }}>
                                                        {currentStep === 0 && (
                                                            <Stack spacing={2} sx={{ maxWidth: 280, mx: 'auto', textAlign: 'center', mt: 4 }}>
                                                                <Typography variant="h6" fontWeight={800}>Broker Login</Typography>
                                                                <TextField fullWidth disabled label="Client ID" size="small" />
                                                                <TextField fullWidth disabled label="Password" type="password" size="small" />
                                                                <Button fullWidth variant="contained" sx={{ bgcolor: selectedBroker.color }}>LOGIN</Button>
                                                            </Stack>
                                                        )}
                                                        {currentStep >= 1 && currentStep < selectedBroker.steps.length && (
                                                            <Box sx={{ mt: 4 }}>
                                                                <Typography variant="h6" fontWeight={800} mb={2}>Developer Engine</Typography>
                                                                <Paper sx={{ p: 2, bgcolor: '#f4f6f8', border: '1px dashed #ddd', textAlign: 'center' }}>
                                                                    <Typography variant="body2" color="text.secondary">Step {currentStep}: {selectedBroker.steps[currentStep].title}</Typography>
                                                                </Paper>
                                                            </Box>
                                                        )}
                                                        {currentStep >= selectedBroker.steps.length && (
                                                            <Box sx={{ textAlign: 'center', mt: 6 }}>
                                                                <Iconify icon="solar:verified-check-bold" width={80} color="success.main" />
                                                                <Typography variant="h4" fontWeight={800}>DONE!</Typography>
                                                            </Box>
                                                        )}
                                                    </m.div>
                                                </AnimatePresence>
                                                <m.div animate={cursorPosition} transition={{ duration: 2.5, repeat: isPlaying ? Infinity : 0 }} style={{ position: 'absolute' }}>
                                                    <Iconify icon="ph:cursor-fill" width={24} />
                                                </m.div>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={5}>
                                        <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 3, borderRadius: 2, height: '100%' }}>
                                            <Label color="success" sx={{ mb: 2 }}>Sneha (Assistance)</Label>
                                            <Typography variant="body1" fontWeight={600} mb={3}>
                                                {currentStep < selectedBroker.steps.length
                                                    ? selectedBroker.steps[currentStep].description
                                                    : "Aapka setup complete ho gaya hai!"}
                                            </Typography>
                                            <Box component="img" src="/assets/illustrations/characters/character_3.png" sx={{ height: 200, mx: 'auto', display: 'block' }} />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
                                <Stack direction="row" spacing={2} justifyContent="center">
                                    <IconButton onClick={handlePrev} sx={{ border: '1px solid #ddd' }}><Iconify icon="solar:alt-arrow-left-bold" /></IconButton>
                                    <Button
                                        variant="contained"
                                        onClick={() => isPlaying ? stopAnimation() : startAnimation()}
                                        sx={{ px: 6, bgcolor: isPlaying ? 'error.main' : selectedBroker.color }}
                                    >
                                        {isPlaying ? 'PAUSE' : 'PLAY TOUR'}
                                    </Button>
                                    <IconButton onClick={handleNext} sx={{ border: '1px solid #ddd' }}><Iconify icon="solar:alt-arrow-right-bold" /></IconButton>
                                </Stack>
                            </Box>
                        </>
                    )}
                </Box>
            </Modal>
        </Container>
    );
}
