import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// @mui
import {
  Alert,
  Box,
  Button,
  Container,
  LinearProgress,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  alpha,
  Skeleton,
  Tooltip,
  Avatar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';
import { paths } from 'src/routes/paths';
import { HOST_API } from 'src/config-global';

// hooks
import { useSettingsContext } from 'src/components/settings';
import { useAuthUser } from 'src/hooks/use-auth-user';

// assets
import { SeoIllustration } from 'src/assets/illustrations';

// components
import Iconify from 'src/components/iconify';
import OpenPositionView from 'src/sections/account/view/user-account-view';
import LiveTradingControl from 'src/sections/overview/e-commerce/view/LiveTradingControl';
import AlgoRiskDisclaimer from 'src/components/algo-risk-disclaimer/AlgoRiskDisclaimer';
import DemoUpgradePromotion from '../demo-upgrade-promotion';

// ----------------------------------------------------------------------

type StatsResponse = {
  total: number;
  active: number;
  expired: number;
  live: number;
  demo: number;
};

const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

// ----------------------------------------------------------------------

export default function OverviewAppView() {
  const theme = useTheme();
  const settings = useSettingsContext();
  const navigate = useNavigate();
  const { user } = useAuthUser() as any;
  const isAdmin = user?.role === 'admin' || user?.role === 'sub-admin';
  const isBrokerConnected = !!user?.broker_connected || localStorage.getItem('angel_jwt') !== null;
  const canViewDashboard = isAdmin || isBrokerConnected;

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; totalSeconds: number } | null>(null);

  const token = localStorage.getItem('authToken');

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE,
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }),
    [token]
  );

  const fetchData = useCallback(async () => {
    if (!user || (user.licence !== 'Live' && user.role !== 'admin')) return;

    setLoading(true);
    try {
      const totalRes = await api.get('/api/user/total-count', {
        headers: { 'x-access-token': token ?? '' },
      });
      const usersRes = await api.get('/api/user/logged-in', {
        headers: { 'x-access-token': token ?? '' },
      });

      const users = usersRes.data?.data || [];
      const today = new Date().toISOString().split('T')[0];

      setStats({
        total: totalRes.data.total_users ?? 0,
        active: users.filter((u: any) => u.status === 'active' && u.end_date >= today).length,
        expired: users.filter((u: any) => !u.end_date || u.end_date < today).length,
        live: users.filter((u: any) => (u.licence || '').toLowerCase() === 'live' && u.status === 'active').length,
        demo: users.filter((u: any) => (u.licence || '').toLowerCase() === 'demo').length,
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [api, user, token]);

  useEffect(() => {
    if (user && (user.licence === 'Live' || user.role === 'admin')) {
      fetchData();
    }
  }, [fetchData, user]);

  // 🕒 COUNTDOWN TIMER LOGIC
  useEffect(() => {
    if (user?.licence === 'Demo' && user.end_date) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(user.end_date!).getTime();
        const distance = end - now;

        if (distance < 0) {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
          clearInterval(timer);
        } else {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft({
            hours: hours + (Math.floor(distance / (1000 * 60 * 60 * 24)) * 24),
            minutes,
            seconds,
            totalSeconds: distance / 1000
          });
        }
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [user]);

  if (!user) return null;

  // Compute days left for subscription
  const daysLeft = user.end_date
    ? Math.max(0, Math.ceil((new Date(user.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const subscriptionPercent = (() => {
    if (!user.start_date || !user.end_date) return 100;
    const total = new Date(user.end_date).getTime() - new Date(user.start_date).getTime();
    const elapsed = new Date().getTime() - new Date(user.start_date).getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  })();

  // ── DEMO USER GUARD ──────────────────────────────────────────────────
  if (user.licence === 'Demo') {
    const isExpired = timeLeft ? timeLeft.totalSeconds <= 0 : false;

    if (isExpired) {
      return (
        <Container maxWidth="xl">
          <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card sx={{
              maxWidth: 560, width: '100%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.06)} 0%, ${alpha(theme.palette.error.dark, 0.10)} 100%)`,
              border: `1.5px solid ${alpha(theme.palette.error.main, 0.25)}`,
              borderRadius: 3, boxShadow: `0 8px 32px ${alpha(theme.palette.error.main, 0.15)}`
            }}>
              <CardContent sx={{ p: 5, textAlign: 'center' }}>
                <Box sx={{
                  width: 88, height: 88, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `radial-gradient(circle, ${alpha(theme.palette.error.main, 0.18)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  margin: '0 auto', mb: 3, border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`
                }}>
                  <Iconify icon="mdi:timer-off-outline" width={48} sx={{ color: theme.palette.error.main }} />
                </Box>
                <Typography variant="h4" gutterBottom fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
                  Demo Period Ended
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                  Your free demo period has expired. Upgrade to <strong>Live Plan</strong> to unlock full algo trading features and real-time execution.
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
                  <Chip label="Expired" color="error" size="small" icon={<Iconify icon="mdi:close-circle" width={14} />} />
                  <Chip label="Demo Account" color="default" size="small" variant="outlined" />
                </Stack>
                <Button
                  variant="contained" color="error" size="large" fullWidth
                  startIcon={<Iconify icon="mdi:rocket-launch" />}
                  onClick={() => { navigate(paths.pricing); }}
                  sx={{ borderRadius: 2, py: 1.5, fontWeight: 700, fontSize: '1rem', boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.4)}` }}
                >
                  View Plans & Upgrade
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Container>
      );
    }

    // ── ACTIVE DEMO USER DASHBOARD ──────────────────────────────────────
    return (
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        {user.licence === 'Demo' && (
          <DemoUpgradePromotion />
        )}
        {/* Hero Banner */}
        <Card sx={{
          mb: 3, borderRadius: 3, overflow: 'hidden', position: 'relative',
          background: `linear-gradient(135deg, #1a1f35 0%, #0d1b2a 60%, #163052 100%)`,
          color: 'white', boxShadow: `0 12px 40px ${alpha('#000', 0.35)}`
        }}>
          {/* Decorative orbs */}
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(theme.palette.warning.main, 0.25)} 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: 100, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.2)} 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="space-between" spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b',
                    boxShadow: '0 0 0 3px rgba(245,158,11,0.3)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': { '0%,100%': { boxShadow: '0 0 0 3px rgba(245,158,11,0.3)' }, '50%': { boxShadow: '0 0 0 6px rgba(245,158,11,0.1)' } }
                  }} />
                  <Typography variant="overline" sx={{ color: '#f59e0b', letterSpacing: 2, fontSize: '0.7rem', fontWeight: 700 }}>
                    DEMO MODE ACTIVE
                  </Typography>
                </Stack>
                <Typography variant="h3" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                  Hello, {user.full_name?.split(' ')[0] || user.user_name}! 👋
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.7, mb: 2.5, maxWidth: 480 }}>
                  You&apos;re on a <strong style={{ color: '#f59e0b' }}>demo account</strong>. Explore trading signals and track performance. Upgrade to go live.
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Chip
                    label={`${daysLeft ?? '?'} Days Left`}
                    size="small"
                    sx={{ bgcolor: daysLeft && daysLeft < 3 ? alpha(theme.palette.error.main, 0.25) : alpha('#f59e0b', 0.2), color: daysLeft && daysLeft < 3 ? theme.palette.error.light : '#f59e0b', fontWeight: 700, border: `1px solid ${daysLeft && daysLeft < 3 ? alpha(theme.palette.error.main, 0.4) : alpha('#f59e0b', 0.4)}` }}
                    icon={<Iconify icon="mdi:calendar-clock" width={14} />}
                  />
                  <Chip label="Paper Trading" size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }} />
                </Stack>
              </Box>
              <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                <SeoIllustration sx={{ maxWidth: 180, opacity: 0.85 }} />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Demo Account Stats Row */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[
            {
              label: 'Subscription Ends',
              value: user.end_date ? new Date(user.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
              icon: 'mdi:calendar-check-outline',
              color: theme.palette.warning.main,
              sub: `${daysLeft ?? '?'} days remaining`
            },
            {
              label: 'Account Type',
              value: 'Demo',
              icon: 'mdi:test-tube',
              color: theme.palette.info.main,
              sub: 'Paper trading mode'
            },
            {
              label: 'Licence',
              value: user.licence || 'Demo',
              icon: 'mdi:shield-outline',
              color: theme.palette.secondary.main,
              sub: 'Simulated trades only'
            },
            {
              label: 'Upgrade Plan',
              value: 'Go Live →',
              icon: 'mdi:rocket-launch',
              color: theme.palette.success.main,
              sub: 'Real-time algo trading',
              clickable: true,
              onClick: () => { navigate(paths.pricing); }
            },
          ].map((card) => (
            <Grid key={card.label} xs={12} sm={6} md={3}>
              <Card
                onClick={card.clickable ? card.onClick : undefined}
                sx={{
                  height: '100%', borderRadius: 2.5,
                  border: `1px solid ${alpha(card.color, 0.2)}`,
                  background: `linear-gradient(145deg, ${alpha(card.color, 0.06)} 0%, ${alpha(card.color, 0.12)} 100%)`,
                  transition: 'all 0.22s ease',
                  ...(card.clickable && {
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 24px ${alpha(card.color, 0.25)}`, border: `1px solid ${alpha(card.color, 0.45)}` }
                  })
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="flex-start" spacing={2}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(card.color, 0.15), flexShrink: 0 }}>
                      <Iconify icon={card.icon} width={26} sx={{ color: card.color }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, color: card.clickable ? card.color : 'text.primary' }}>
                        {card.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{card.sub}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Subscription Progress Bar */}
        <Card sx={{ mb: 3, borderRadius: 2.5, border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}` }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="mdi:timer-sand" width={20} sx={{ color: theme.palette.warning.main }} />
                <Typography variant="subtitle2" fontWeight={700}>Demo Subscription Progress</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {subscriptionPercent}% used · {daysLeft ?? '?'} days left
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={subscriptionPercent}
              sx={{
                height: 10, borderRadius: 6,
                bgcolor: alpha(theme.palette.warning.main, 0.12),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: subscriptionPercent > 80
                    ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                    : `linear-gradient(90deg, ${theme.palette.warning.light}, ${theme.palette.warning.main})`
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Live Trading Control (Manual Orders) */}
        <Box sx={{ mb: 3 }}>
          <LiveTradingControl user={user} />
        </Box>

        {/* Open Positions */}
        <OpenPositionView embed />
        <AlgoRiskDisclaimer variant="simple" />
      </Container>
    );
  }

  // ── LIVE USER NOT CONNECTED GUARD ─────────────────────────────────────
  if (user.licence === 'Live' && !canViewDashboard) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{
            maxWidth: 560, width: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.06)} 0%, ${alpha(theme.palette.warning.dark, 0.10)} 100%)`,
            border: `1.5px solid ${alpha(theme.palette.warning.main, 0.25)}`, borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.warning.main, 0.15)}`
          }}>
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <Box sx={{
                width: 88, height: 88, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `radial-gradient(circle, ${alpha(theme.palette.warning.main, 0.18)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                margin: '0 auto', mb: 3, border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`
              }}>
                <Iconify icon="mdi:link-variant-off" width={48} sx={{ color: theme.palette.warning.main }} />
              </Box>
              <Typography variant="h4" gutterBottom fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>Connect Your Broker</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                {user.broker ? `Your broker "${user.broker}" is assigned but not yet authorized for today's session.` : 'No broker is currently assigned to your account.'}
                {' '}Connect now to start live algo trading.
              </Typography>
              <Button
                variant="contained" size="large" fullWidth
                startIcon={<Iconify icon="mdi:link-variant" />}
                onClick={() => navigate(paths.dashboard.brokerConnect)}
                sx={{
                  borderRadius: 2, py: 1.5, fontWeight: 700, fontSize: '1rem',
                  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.4)}`
                }}
              >
                Connect Broker Now
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // ── LIVE USER CONNECTED → Premium Dashboard ────────────────────────────
  if (!isAdmin && user.licence === 'Live') {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'xl'} sx={{ pt: 1 }}>
        {/* Broker Session Warning */}
        {!isBrokerConnected && (
          <Alert
            severity="warning" variant="outlined"
            sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}
            action={<Button color="inherit" size="small" onClick={() => navigate(paths.dashboard.brokerConnect)}>Connect Now</Button>}
          >
            <strong>Session Inactive:</strong> Log in to your broker account to authorize today&apos;s trading session.
          </Alert>
        )}

        {/* Hero Card */}
        <Card sx={{
          mb: 3, borderRadius: 3, overflow: 'hidden', position: 'relative',
          background: `linear-gradient(135deg, #0f1f3d 0%, #0a1628 50%, #112240 100%)`,
          color: 'white', boxShadow: `0 16px 48px ${alpha('#000', 0.4)}`
        }}>
          <Box sx={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.3)} 0%, transparent 65%)`, pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', bottom: -40, left: 60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(theme.palette.success.main, 0.2)} 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="space-between" spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e',
                    boxShadow: '0 0 0 4px rgba(34,197,94,0.25)',
                    animation: 'livepulse 1.8s ease-in-out infinite',
                    '@keyframes livepulse': { '0%,100%': { boxShadow: '0 0 0 4px rgba(34,197,94,0.25)' }, '50%': { boxShadow: '0 0 0 8px rgba(34,197,94,0.08)' } }
                  }} />
                  <Typography variant="overline" sx={{ color: '#22c55e', letterSpacing: 2, fontSize: '0.7rem', fontWeight: 700 }}>
                    LIVE TRADING ACTIVE
                  </Typography>
                </Stack>

                <Typography variant="h3" fontWeight={800} gutterBottom sx={{ letterSpacing: '-1px', lineHeight: 1.15 }}>
                  Welcome, {user.full_name?.split(' ')[0] || user.user_name}!
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.65, mb: 3, maxWidth: 460 }}>
                  Your algo trading system is live and actively monitoring markets. Real-time positions and signals are being tracked below.
                </Typography>

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Box sx={{ bgcolor: alpha('#fff', 0.08), px: 2.5, py: 1.2, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                    <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', letterSpacing: 0.5 }}>Broker</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>{user.broker || '—'}</Typography>
                  </Box>
                  <Box sx={{ bgcolor: alpha('#fff', 0.08), px: 2.5, py: 1.2, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                    <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', letterSpacing: 0.5 }}>Plan</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>Premium Live</Typography>
                  </Box>
                  <Box sx={{ bgcolor: alpha('#fff', 0.08), px: 2.5, py: 1.2, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                    <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', letterSpacing: 0.5 }}>Expires</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {user.end_date ? new Date(user.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Right side metrics */}
              <Box sx={{ flexShrink: 0, minWidth: 200 }}>
                <Stack spacing={2}>
                  <Box sx={{
                    p: 2.5, borderRadius: 2.5, textAlign: 'center',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.2)} 0%, ${alpha(theme.palette.success.dark, 0.25)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                  }}>
                    <Iconify icon="mdi:check-circle" width={32} sx={{ color: theme.palette.success.light, mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.7), display: 'block', letterSpacing: 0.8 }}>BROKER STATUS</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#4ade80' }}>
                      {isBrokerConnected ? 'Connected' : 'Pending'}
                    </Typography>
                  </Box>
                  <Box sx={{
                    p: 2, borderRadius: 2.5, textAlign: 'center',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.dark, 0.2)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`
                  }}>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), display: 'block', letterSpacing: 0.8 }}>DAYS REMAINING</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: daysLeft && daysLeft < 7 ? theme.palette.warning.light : '#93c5fd' }}>
                      {daysLeft ?? '∞'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Subscription Progress */}
        <Card sx={{ mb: 3, borderRadius: 2.5, border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="mdi:calendar-range" width={20} sx={{ color: theme.palette.primary.main }} />
                <Typography variant="subtitle2" fontWeight={700}>Live Plan Subscription</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {subscriptionPercent}% used · {daysLeft ?? '?'} days left
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={subscriptionPercent}
              sx={{
                height: 10, borderRadius: 6,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: subscriptionPercent > 85
                    ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                    : `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`
                }
              }}
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.disabled">
                Start: {user.start_date ? new Date(user.start_date).toLocaleDateString('en-IN') : '—'}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                End: {user.end_date ? new Date(user.end_date).toLocaleDateString('en-IN') : '—'}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Quick Info Pills */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Account', value: user.user_name, icon: 'mdi:account-circle', color: theme.palette.info.main },
            { label: 'Group Service', value: user.group_service || 'Default', icon: 'mdi:layers', color: theme.palette.secondary.main },
            { label: 'Sub Admin', value: user.sub_admin || 'Main', icon: 'mdi:shield-account', color: theme.palette.warning.main },
            { label: 'Trading Mode', value: 'Automated', icon: 'mdi:robot', color: theme.palette.success.main },
          ].map((pill) => (
            <Grid key={pill.label} xs={6} md={3}>
              <Box sx={{
                p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                border: `1px solid ${alpha(pill.color, 0.2)}`,
                bgcolor: alpha(pill.color, 0.05), transition: 'all 0.2s',
                '&:hover': { bgcolor: alpha(pill.color, 0.1) }
              }}>
                <Iconify icon={pill.icon} width={22} sx={{ color: pill.color, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', letterSpacing: 0.5, fontWeight: 600 }}>{pill.label}</Typography>
                  <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.82rem' }}>{pill.value}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 3, opacity: 0.4 }} />

        {/* Live Trading Control */}
        <LiveTradingControl user={user} />
        <AlgoRiskDisclaimer variant="simple" />
      </Container>
    );
  }

  // ── ADMIN / SUB-ADMIN DASHBOARD ─────────────────────────────────────────
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const adminStats = [
    {
      title: 'Total Clients',
      value: stats?.total ?? 0,
      icon: 'mdi:account-group',
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.18) 100%)',
      path: paths.dashboard.general.ecommerce,
      change: '+12%',
      changeLabel: 'vs last month',
    },
    {
      title: 'Active Clients',
      value: stats?.active ?? 0,
      icon: 'mdi:check-circle',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.18) 100%)',
      path: paths.dashboard.permission,
      change: 'Active Now',
      changeLabel: 'subscribed users',
    },
    {
      title: 'Expired',
      value: stats?.expired ?? 0,
      icon: 'mdi:clock-alert-outline',
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.18) 100%)',
      path: paths.dashboard.user.list,
      change: 'Renewal Needed',
      changeLabel: 'expired accounts',
    },
    {
      title: 'Live Trading',
      value: stats?.live ?? 0,
      icon: 'mdi:chart-line-variant',
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(29,78,216,0.18) 100%)',
      path: paths.dashboard.general.ecommerce,
      change: 'Trading Now',
      changeLabel: 'live accounts',
    },
    {
      title: 'Demo Mode',
      value: stats?.demo ?? 0,
      icon: 'mdi:test-tube-outline',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.18) 100%)',
      path: paths.dashboard.general.ecommerce,
      change: 'Trial Users',
      changeLabel: 'in demo mode',
    },
  ];

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'} sx={{ py: 3 }}>

      {/* ── TOP HEADER BAR ──────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e',
              boxShadow: '0 0 0 3px rgba(34,197,94,0.3)',
              animation: 'adminpulse 2s ease-in-out infinite',
              '@keyframes adminpulse': { '0%,100%': { boxShadow: '0 0 0 3px rgba(34,197,94,0.3)' }, '50%': { boxShadow: '0 0 0 7px rgba(34,197,94,0.08)' } }
            }} />
            <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 2, fontSize: '0.68rem', fontWeight: 700 }}>
              ADMIN CONTROL PANEL
            </Typography>
          </Stack>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
            Trading Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {dateString} · {timeString}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            label={`${user.licence} Admin`}
            size="small"
            icon={<Iconify icon="mdi:shield-crown" width={14} />}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff', fontWeight: 700, border: 'none',
              '& .MuiChip-icon': { color: '#fff' }
            }}
          />
          <Tooltip title="Refresh dashboard data">
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? undefined : <Iconify icon="mdi:refresh" width={18} />}
              onClick={fetchData}
              disabled={loading}
              sx={{
                borderRadius: 2, fontWeight: 600, px: 2,
                borderColor: alpha(theme.palette.primary.main, 0.35),
                '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.06) }
              }}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 4, height: 3 }} />}

      {/* Broker warning */}
      {user.licence === 'Live' && !isBrokerConnected && (
        <Alert
          severity="warning" variant="outlined" sx={{ mb: 3, borderRadius: 2 }}
          action={<Button color="inherit" size="small" onClick={() => navigate(paths.dashboard.brokerConnect)}>Connect Now</Button>}
        >
          <strong>Broker Session Inactive:</strong> Your API keys are assigned, but you need to log in to your broker account to authorize trading for today.
        </Alert>
      )}

      {/* ── HERO WELCOME CARD ──────────────────────────────────────── */}
      <Card sx={{
        mb: 3.5, borderRadius: 3, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
        color: 'white',
        boxShadow: `0 20px 60px ${alpha('#000', 0.45)}`,
        border: `1px solid ${alpha('#6366f1', 0.25)}`
      }}>
        {/* Decorative orbs */}
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -50, left: -30, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: 20, left: '40%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid xs={12} md={7}>
              {/* Admin badge */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{
                  width: 48, height: 48, fontWeight: 800, fontSize: '1.2rem',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.5)'
                }}>
                  {(user.full_name || user.user_name || 'A')[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.6, letterSpacing: 1, fontSize: '0.7rem', fontWeight: 700 }}>
                    WELCOME BACK
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                    {user.full_name || user.user_name} 👋
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="body1" sx={{ opacity: 0.65, mb: 3, maxWidth: 500, lineHeight: 1.7 }}>
                Monitor your algo trading system performance and manage client analytics in real-time. All systems are operational.
              </Typography>

              {/* Status pills */}
              <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1}>
                {[
                  { icon: 'mdi:circle', color: '#22c55e', label: 'System', value: 'Online' },
                  { icon: 'mdi:api', color: '#3b82f6', label: 'API', value: 'Connected' },
                  { icon: 'mdi:database', color: '#a855f7', label: 'DB', value: 'Healthy' },
                ].map((s) => (
                  <Box key={s.label} sx={{
                    bgcolor: alpha('#fff', 0.07), px: 2, py: 1, borderRadius: 1.5,
                    border: `1px solid ${alpha('#fff', 0.1)}`, backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', gap: 1
                  }}>
                    <Iconify icon={s.icon} width={10} sx={{ color: s.color }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', lineHeight: 1 }}>{s.label}</Typography>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>{s.value}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Grid>

            <Grid xs={12} md={5}>
              {/* Right side — quick admin metrics */}
              <Grid container spacing={1.5}>
                {[
                  { label: 'Broker', value: user.broker || 'N/A', icon: 'mdi:bank-outline', color: '#6366f1' },
                  { label: 'Role', value: user.role === 'admin' ? 'Super Admin' : 'Sub Admin', icon: 'mdi:shield-star', color: '#10b981' },
                  { label: 'Licence', value: user.licence || '—', icon: 'mdi:certificate', color: '#f59e0b' },
                  { label: 'Sub Admin', value: user.sub_admin || 'Main', icon: 'mdi:account-tie', color: '#3b82f6' },
                ].map((m) => (
                  <Grid key={m.label} xs={6}>
                    <Box sx={{
                      p: 1.5, borderRadius: 2,
                      bgcolor: alpha(m.color, 0.1),
                      border: `1px solid ${alpha(m.color, 0.2)}`,
                      backdropFilter: 'blur(8px)',
                    }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon={m.icon} width={18} sx={{ color: m.color }} />
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.label}</Typography>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>{m.value}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── STATS CARDS ──────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {adminStats.map((item) => (
          <Grid key={item.title} xs={12} sm={6} md={4} lg={2.4}>
            <Card
              onClick={() => navigate(item.path)}
              sx={{
                cursor: 'pointer',
                background: item.bgGradient,
                border: `1px solid ${alpha(item.color, 0.2)}`,
                borderRadius: 2.5,
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-5px) scale(1.01)',
                  boxShadow: `0 12px 32px ${alpha(item.color, 0.35)}`,
                  border: `1px solid ${alpha(item.color, 0.5)}`,
                },
                '&:hover .stat-icon-bg': {
                  opacity: 0.25,
                  transform: 'scale(1.15) rotate(10deg)',
                }
              }}
            >
              {/* Big decorative icon in bg */}
              <Box
                className="stat-icon-bg"
                sx={{
                  position: 'absolute', right: -14, top: -14,
                  width: 90, height: 90,
                  opacity: 0.1, transition: 'all 0.35s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Iconify icon={item.icon} width={80} sx={{ color: item.color }} />
              </Box>

              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{
                  width: 42, height: 42, borderRadius: 1.5, mb: 1.5,
                  background: item.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 14px ${alpha(item.color, 0.45)}`
                }}>
                  <Iconify icon={item.icon} width={22} sx={{ color: '#fff' }} />
                </Box>

                <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 0.5 }}>
                  {item.title}
                </Typography>

                {loading ? (
                  <Skeleton width={60} height={40} />
                ) : (
                  <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1, mb: 0.5, color: item.color }}>
                    {item.value}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {item.changeLabel}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── QUICK ACTION SHORTCUTS ─────────────────────────────── */}
      <Card sx={{
        mb: 3.5, borderRadius: 2.5,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        background: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(12px)',
      }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="mdi:lightning-bolt" width={20} sx={{ color: '#f59e0b' }} />
              <Typography variant="subtitle1" fontWeight={700}>Quick Actions</Typography>
            </Stack>
            <Chip label="Admin Tools" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          </Stack>
          <Grid container spacing={1.5}>
            {[
              { label: 'Manage Clients', icon: 'mdi:account-group-outline', color: '#6366f1', path: paths.dashboard.general.ecommerce },
              { label: 'User Permissions', icon: 'mdi:shield-key-outline', color: '#10b981', path: paths.dashboard.permission },
              { label: 'User List', icon: 'mdi:format-list-bulleted', color: '#3b82f6', path: paths.dashboard.user.list },
              { label: 'Broker Connect', icon: 'mdi:link-variant', color: '#f59e0b', path: paths.dashboard.brokerConnect },
            ].map((action) => (
              <Grid key={action.label} xs={6} sm={3}>
                <Box
                  onClick={() => navigate(action.path)}
                  sx={{
                    p: 2, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                    border: `1px solid ${alpha(action.color, 0.2)}`,
                    bgcolor: alpha(action.color, 0.04),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(action.color, 0.1),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 16px ${alpha(action.color, 0.2)}`
                    }
                  }}
                >
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px',
                    bgcolor: alpha(action.color, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Iconify icon={action.icon} width={22} sx={{ color: action.color }} />
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary', fontSize: '0.75rem' }}>
                    {action.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* ── LIVE TRADING CONTROL (if admin has live licence) ───── */}
      {user.licence === 'Live' && (
        <Box sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Iconify icon="mdi:chart-timeline-variant-shimmer" width={22} sx={{ color: '#22c55e' }} />
            <Typography variant="h6" fontWeight={700}>Live Trading Operations</Typography>
            <Chip label="LIVE" size="small" sx={{ bgcolor: alpha('#22c55e', 0.15), color: '#22c55e', fontWeight: 800, fontSize: '0.65rem' }} />
          </Stack>
          <LiveTradingControl user={user} />
        </Box>
      )}
      <AlgoRiskDisclaimer variant="footer" />
    </Container>
  );
}
