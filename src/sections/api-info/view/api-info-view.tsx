import { useState, useEffect, useCallback, useRef } from 'react';
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
    Tooltip,
    Container,
    Paper,
    alpha,
    useTheme,
    TextField,
    InputAdornment,
    useMediaQuery,
} from '@mui/material';
// components
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';

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
    {
        name: 'Groww',
        icon: 'simple-icons:groww',
        color: '#00d09c',
        officialUrl: 'https://groww.in/',
        redirectUrl: 'https://trustifye.co.in/dashboard/banking',
        steps: [
            { title: 'Open Groww', description: 'Navigate to Groww for Business page.' },
            { title: 'Request API', description: 'Apply for API access if not enabled.' },
            { title: 'Integration', description: 'Configure redirect settings.' },
            { title: 'Credentials', description: 'Access API keys from dashboard.' },
        ]
    },
    {
        name: '5paisa',
        icon: 'solar:hand-money-bold-duotone',
        color: '#2e3d48',
        officialUrl: 'https://www.5paisa.com/developer-api',
        redirectUrl: 'https://trustifye.co.in/dashboard/banking',
        steps: [
            { title: 'API Portal', description: 'Visit 5paisa Developer APIs portal.' },
            { title: 'Key Generation', description: 'Enter your User ID and generate keys.' },
            { title: 'App Config', description: 'Define your app name and callback URL.' },
            { title: 'Active Keys', description: 'Copy your App Key and Secret Key.' },
        ]
    },
    {
        name: 'Paytm',
        icon: 'simple-icons:paytm',
        color: '#00baf2',
        officialUrl: 'https://developer.paytm.com/',
        redirectUrl: 'https://trustifye.co.in/dashboard/banking',
        steps: [
            { title: 'Paytm Developer', description: 'Login to Paytm Developer Dashboard.' },
            { title: 'Test Keys', description: 'Get your test environment keys first.' },
            { title: 'Production', description: 'Apply for production API keys.' },
            { title: 'Integration', description: 'Set Webhook and Redirect URLs.' },
        ]
    },
];

const modalStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '95%', md: 800 },
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
            }, 3000);
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add snackbar here
    };

    const speak = useCallback((text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.15;

            // Prioritize Indian Female voices for Hinglish feel
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v =>
                v.name.includes('Indian') ||
                v.name.includes('Hi-IN') ||
                v.name.includes('Google US English') ||
                v.name.includes('Female')
            );
            if (preferredVoice) utterance.voice = preferredVoice;

            window.speechSynthesis.speak(utterance);
        }
    }, []);

    useEffect(() => {
        if (isPlaying && selectedBroker) {
            // Hinglish logic for speech
            const descriptions: Record<string, string> = {
                'AngelOne': 'Ab AngelOne portal par login karein aur apna credentials fill karein.',
                'Upstox': 'Upstox Developer Hub par jayein aur sign in karein.',
                'Kotak Neo': 'Kotak Neo developer portal open karke login karein.',
                'Groww': 'Groww Business page par move karein.',
                '5paisa': '5paisa Developer API portal ko open karein.',
                'Paytm': 'Paytm Developer Dashboard par login karke check karein.'
            };

            const hingeText = currentStep < selectedBroker.steps.length
                ? `${selectedBroker.steps[currentStep].title}. ${descriptions[selectedBroker.name] || selectedBroker.steps[currentStep].description}. Bahut easy hai!`
                : `Shabash! Aapka setup complete ho gaya hai. Ab bas ye keys copy karke Admin dashboard par share karein aur trading start karein!`;

            speak(hingeText);
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, [currentStep, isPlaying, selectedBroker, speak]);

    return (
        <Container maxWidth={settings.themeStretch ? false : 'xl'}>
            <Typography
                variant="h3"
                sx={{
                    mb: 4,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontSize: { xs: '1.8rem', md: '2.5rem' }
                }}
            >
                API <span style={{ color: theme.palette.primary.main }}>Info Center</span>
            </Typography>

            <Grid container spacing={3}>
                {BROKERS.map((broker) => (
                    <Grid key={broker.name} item xs={12} sm={6} md={4}>
                        <Card
                            sx={{
                                p: { xs: 3, md: 4 },
                                textAlign: 'center',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: `1px solid ${alpha(broker.color, 0.1)}`,
                                '&:hover': {
                                    transform: 'translateY(-12px)',
                                    boxShadow: `0 20px 40px -12px ${alpha(broker.color, 0.3)}`,
                                    bgcolor: alpha(broker.color, 0.03),
                                    '& .broker-icon': { transform: 'scale(1.1) rotate(5deg)' }
                                },
                            }}
                            onClick={() => handleOpen(broker)}
                        >
                            <Box
                                className="broker-icon"
                                sx={{
                                    width: { xs: 80, md: 100 },
                                    height: { xs: 80, md: 100 },
                                    borderRadius: '24px',
                                    bgcolor: alpha(broker.color, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    mb: 3,
                                    transition: 'transform 0.3s ease'
                                }}
                            >
                                <Iconify icon={broker.icon} width={56} sx={{ color: broker.color }} />
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ mb: 1, fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
                                {broker.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Professional API Integration
                            </Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Modal
                open={!!selectedBroker}
                onClose={handleClose}
                closeAfterTransition
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Box sx={{
                    ...modalStyle,
                    width: { xs: '95%', sm: '90%', md: 1000 },
                    maxHeight: '95vh',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transform: 'none',
                    top: 'auto',
                    left: 'auto'
                }}>
                    {selectedBroker && (
                        <>
                            {/* Premium Header */}
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{
                                    px: { xs: 2, md: 4 },
                                    py: { xs: 2, md: 3 },
                                    background: `linear-gradient(90deg, ${alpha(selectedBroker.color, 0.12)}, ${alpha(selectedBroker.color, 0.05)})`,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    flexShrink: 0
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box sx={{ p: 1, bgcolor: selectedBroker.color, borderRadius: 1.5, display: 'flex' }}>
                                        <Iconify icon={selectedBroker.icon} width={28} sx={{ color: 'white' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight={900} sx={{ fontSize: { xs: '1.1rem', md: '1.5rem' } }}>{selectedBroker.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: { xs: 'none', sm: 'block' } }}>SECURE API INTEGRATION ENGINE</Typography>
                                    </Box>
                                </Stack>
                                <IconButton onClick={handleClose} sx={{ bgcolor: 'action.hover' }}>
                                    <Iconify icon="solar:close-circle-bold" />
                                </IconButton>
                            </Stack>

                            {/* Main Content Area - Scrollable */}
                            <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default', overflowY: 'auto', flexGrow: 1 }}>
                                <Grid container spacing={4}>
                                    <Grid item xs={12} md={7}>
                                        {/* Realistic Simulation Frame */}
                                        <Box sx={{ position: 'relative' }}>
                                            <AnimatePresence mode="wait">
                                                <m.div
                                                    key={currentStep}
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.4 }}
                                                >
                                                    <Box sx={{
                                                        width: '100%',
                                                        height: { xs: 300, md: 420 },
                                                        bgcolor: '#1a1c1e',
                                                        borderRadius: 3,
                                                        boxShadow: `0 30px 60px -12px ${alpha(selectedBroker.color, 0.2)}`,
                                                        overflow: 'hidden',
                                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                        position: 'relative'
                                                    }}>
                                                        {/* Browser OS Top Bar */}
                                                        <Box sx={{ height: 48, bgcolor: '#2b2d30', display: 'flex', alignItems: 'center', px: 2, gap: 2 }}>
                                                            <Stack direction="row" spacing={1}>
                                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27c93f' }} />
                                                            </Stack>
                                                            <Box sx={{ flexGrow: 1, height: 32, bgcolor: '#1a1c1e', borderRadius: 2, px: 2, display: 'flex', alignItems: 'center', border: '1px solid #3c3f41' }}>
                                                                <Iconify icon="solar:shield-check-bold" width={14} sx={{ color: '#27c93f', mr: 1 }} />
                                                                <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 700, fontSize: { xs: 10, sm: 12 } }}>
                                                                    secure-portal.{selectedBroker.name.toLowerCase()}.in
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        {/* Simulation Content */}
                                                        <Box sx={{ height: 'calc(100% - 48px)', bgcolor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
                                                            <Box sx={{
                                                                p: { xs: 2, md: 4 }, height: '100%',
                                                                backgroundImage: `radial-gradient(${alpha(selectedBroker.color, 0.05)} 1px, transparent 1px)`,
                                                                backgroundSize: '20px 20px'
                                                            }}>
                                                                {currentStep === 0 && (
                                                                    <Box sx={{ textAlign: 'center', maxWidth: 300, mx: 'auto', mt: { xs: 2, md: 4 } }}>
                                                                        <Typography variant="h5" fontWeight={900} mb={3} color="text.primary" sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' } }}>Broker Login</Typography>
                                                                        <TextField fullWidth disabled label="Client ID" sx={{ mb: 2 }} size="small" />
                                                                        <TextField fullWidth disabled label="Password" type="password" sx={{ mb: 3 }} size="small" />
                                                                        <Button variant="contained" fullWidth size="large" sx={{ bgcolor: selectedBroker.color, height: { xs: 40, md: 48 }, fontWeight: 900 }}>AUTHENTICATE</Button>
                                                                    </Box>
                                                                )}
                                                                {currentStep === 1 && (
                                                                    <Box>
                                                                        <Typography variant="h6" fontWeight={900} mb={3}>Developer Console</Typography>
                                                                        <Stack spacing={2}>
                                                                            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <Typography variant="subtitle2" fontWeight={800}>Create New API App</Typography>
                                                                                <Button variant="contained" size="small" sx={{ bgcolor: selectedBroker.color }}>INITIATE</Button>
                                                                            </Box>
                                                                            <Box sx={{ height: { xs: 80, md: 120 }, border: '2px dashed #eee', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <Typography variant="caption" color="text.disabled">No Apps Found</Typography>
                                                                            </Box>
                                                                        </Stack>
                                                                    </Box>
                                                                )}
                                                                {(currentStep === 2 || currentStep === 3) && (
                                                                    <Box>
                                                                        <Typography variant="h6" fontWeight={900} mb={3}>App Configuration</Typography>
                                                                        <Stack spacing={2}>
                                                                            <Box sx={{ p: 2, bgcolor: alpha(selectedBroker.color, 0.05), border: `1px solid ${alpha(selectedBroker.color, 0.1)}`, borderRadius: 2 }}>
                                                                                <Typography variant="caption" color="text.secondary" fontWeight={800}>REDIRECT URL (OAUTH)</Typography>
                                                                                <Typography variant="body2" sx={{ color: selectedBroker.color, fontWeight: 900, mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.85rem' }, overflowWrap: 'break-word' }}>{selectedBroker.redirectUrl}</Typography>
                                                                            </Box>
                                                                            <Button fullWidth variant="contained" sx={{ bgcolor: selectedBroker.color, height: { xs: 40, md: 48 }, fontWeight: 900 }}>GENERATE MASTER KEYS</Button>
                                                                        </Stack>
                                                                    </Box>
                                                                )}
                                                                {currentStep >= selectedBroker.steps.length && (
                                                                    <Box sx={{ textAlign: 'center', mt: { xs: 2, md: 4 } }}>
                                                                        <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                                                            <Iconify icon="solar:verified-check-bold" sx={{ color: '#00ab55', width: { xs: 50, md: 80 }, height: { xs: 50, md: 80 }, mb: 2 }} />
                                                                        </m.div>
                                                                        <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.5rem', md: '2.1rem' } }}>SUCCESS!</Typography>
                                                                        <Typography variant="body2" color="text.secondary" mb={3}>Your API credentials are now active</Typography>
                                                                        <Box sx={{ p: 1.5, bgcolor: '#f4f6f8', borderRadius: 2, border: '1px solid #ddd', fontFamily: 'monospace', fontWeight: 900, fontSize: { xs: '0.9rem', md: '1rem' } }}>TRST-API-XXXX-7781</Box>
                                                                    </Box>
                                                                )}

                                                                {/* Advanced Human Cursor */}
                                                                <m.div
                                                                    animate={{
                                                                        x: isPlaying ? [50, isMobile ? 200 : 450, isMobile ? 180 : 430] : (isMobile ? 180 : 430),
                                                                        y: isPlaying ? [150, isMobile ? 100 : 150, isMobile ? 120 : 170] : (isMobile ? 120 : 170),
                                                                        scale: [1, 1, 0.9, 1]
                                                                    }}
                                                                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                                                    style={{ position: 'absolute', top: 0, left: 0, zIndex: 100 }}
                                                                >
                                                                    <Iconify icon="ph:cursor-fill" width={28} sx={{ color: '#000', filter: 'drop-shadow(3px 3px 5px rgba(0,0,0,0.4))' }} />
                                                                </m.div>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </m.div>
                                            </AnimatePresence>
                                        </Box>
                                    </Grid>

                                    {/* AI GUIDE SECTION - UPGRADED THEME */}
                                    <Grid item xs={12} md={5}>
                                        <Box sx={{
                                            position: 'relative',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            bgcolor: alpha(theme.palette.background.neutral, 0.4),
                                            borderRadius: 3,
                                            p: { xs: 2, md: 3 },
                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                        }}>
                                            {/* Live Status Indicator */}
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                                                <m.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff0000' }} />
                                                </m.div>
                                                <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 1, color: 'text.secondary' }}>LIVE SNEHA</Typography>
                                            </Stack>

                                            {/* Advanced Speech Bubble */}
                                            <AnimatePresence mode="wait">
                                                <m.div
                                                    key={`speech-${currentStep}`}
                                                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: -15 }}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.9)',
                                                        backdropFilter: 'blur(12px)',
                                                        padding: '20px 24px',
                                                        borderRadius: '24px',
                                                        boxShadow: `0 20px 40px rgba(0,0,0,0.1)`,
                                                        border: `1px solid ${alpha(selectedBroker.color, 0.15)}`,
                                                        position: 'relative',
                                                        marginBottom: '24px',
                                                        zIndex: 2
                                                    }}
                                                >
                                                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.4, fontSize: { xs: '0.9rem', md: '1.05rem' } }}>
                                                        {currentStep < selectedBroker.steps.length ?
                                                            `"${selectedBroker.steps[currentStep].description}. Aap fikr mat karein, main help karungi!"` :
                                                            `"Congratulations! Aapne successfully setup kar liya hai. Now share these keys and start trading!"`}
                                                    </Typography>

                                                    {/* Animated Bubble Tail */}
                                                    <Box sx={{
                                                        position: 'absolute', bottom: -12, right: '20%',
                                                        width: 20, height: 12, bgcolor: 'white',
                                                        clipPath: 'polygon(0 0, 50% 100%, 100% 0)'
                                                    }} />
                                                </m.div>
                                            </AnimatePresence>

                                            {/* High-Resolution Guide Rendering */}
                                            <Box sx={{ position: 'relative', width: '100%', height: { xs: 260, md: 340 } }}>
                                                <m.div
                                                    animate={{
                                                        y: [0, -8, 0],
                                                        rotate: [0, 0.5, 0]
                                                    }}
                                                    transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                                                    style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center' }}
                                                >
                                                    <Box
                                                        component="img"
                                                        src="/assets/illustrations/characters/character_3.png"
                                                        sx={{
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                            filter: 'drop-shadow(0 25px 40px rgba(0,0,0,0.25))'
                                                        }}
                                                    />

                                                    {/* Enhanced Lip-Sync Integration */}
                                                    <AnimatePresence>
                                                        {isPlaying && (
                                                            <m.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    bottom: '24%',
                                                                    left: '49.5%',
                                                                    transform: 'translateX(-50%)',
                                                                    zIndex: 5
                                                                }}
                                                            >
                                                                <m.div
                                                                    animate={{
                                                                        height: [8, 16, 8, 22, 8],
                                                                        width: [26, 32, 26, 28, 26],
                                                                        borderRadius: ['15px', '50%', '15px']
                                                                    }}
                                                                    transition={{
                                                                        repeat: Infinity,
                                                                        duration: 0.12,
                                                                        ease: "easeInOut"
                                                                    }}
                                                                    style={{
                                                                        backgroundColor: '#4a0808',
                                                                        border: '1.5px solid rgba(255,255,255,0.2)',
                                                                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                                                                    }}
                                                                />
                                                            </m.div>
                                                        )}
                                                    </AnimatePresence>
                                                </m.div>

                                                {/* Premium Badge Overlay */}
                                                <Box sx={{
                                                    position: 'absolute', bottom: { xs: 0, md: 10 }, left: '50%', transform: 'translateX(-50%)',
                                                    bgcolor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', color: 'white',
                                                    px: 2, py: 0.5, borderRadius: 1.5,
                                                    display: 'flex', alignItems: 'center', gap: 1,
                                                    boxShadow: theme.customShadows.z12,
                                                    zIndex: 6,
                                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`
                                                }}>
                                                    <Iconify icon="solar:crown-minimalistic-bold-duotone" width={16} sx={{ color: theme.palette.warning.main }} />
                                                    <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 1, fontSize: { xs: 10, md: 12 } }}>PREMIUM GUIDE</Typography>
                                                </Box>
                                            </Box>

                                            <Typography variant="h5" align="center" sx={{ mt: { xs: 2, md: 3 }, fontWeight: 900, color: 'text.primary', fontSize: { xs: '1.1rem', md: '1.5rem' } }}>
                                                Sneha <span style={{ color: selectedBroker.color, fontSize: '0.85rem', marginLeft: '4px' }}>Expert Consultant</span>
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                {/* Upgraded Premium Controls */}
                                <Stack
                                    direction="row"
                                    spacing={{ xs: 1.5, md: 3 }}
                                    sx={{
                                        mt: { xs: 4, md: 6 },
                                        width: '100%',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    <IconButton
                                        onClick={handlePrev}
                                        size="large"
                                        sx={{
                                            width: { xs: 50, md: 70 }, height: { xs: 50, md: 70 },
                                            bgcolor: 'white',
                                            border: '1px solid #eee',
                                            boxShadow: theme.customShadows.z8,
                                            '&:hover': { bgcolor: '#f8f8f8' }
                                        }}
                                    >
                                        <Iconify icon="solar:double-alt-arrow-left-bold-duotone" width={24} />
                                    </IconButton>

                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<Iconify icon={isPlaying ? "solar:stop-circle-bold-duotone" : "solar:play-circle-bold-duotone"} width={24} />}
                                        onClick={() => isPlaying ? stopAnimation() : startAnimation()}
                                        sx={{
                                            px: { xs: 4, sm: 8, md: 12 },
                                            borderRadius: 4,
                                            height: { xs: 50, md: 74 },
                                            fontSize: { xs: '0.9rem', md: '1.2rem' },
                                            fontWeight: 950,
                                            background: isPlaying ? '#ff4842' : `linear-gradient(135deg, ${selectedBroker.color} 0%, ${alpha(selectedBroker.color, 0.8)} 100%)`,
                                            boxShadow: `0 15px 30px ${alpha(selectedBroker.color, 0.4)}`,
                                            '&:hover': { transform: 'scale(1.02) translateY(-2px)', boxShadow: `0 20px 40px ${alpha(selectedBroker.color, 0.5)}` },
                                            transition: 'all 0.3s ease',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {isPlaying ? 'PAUSE' : 'START TOUR'}
                                    </Button>

                                    <IconButton
                                        onClick={handleNext}
                                        size="large"
                                        sx={{
                                            width: { xs: 50, md: 70 }, height: { xs: 50, md: 70 },
                                            bgcolor: 'white',
                                            border: '1px solid #eee',
                                            boxShadow: theme.customShadows.z8,
                                            '&:hover': { bgcolor: '#f8f8f8' }
                                        }}
                                    >
                                        <Iconify icon="solar:double-alt-arrow-right-bold-duotone" width={24} />
                                    </IconButton>
                                </Stack>
                            </Box>
                        </>
                    )}
                </Box>
            </Modal>
        </Container>
    );
}
