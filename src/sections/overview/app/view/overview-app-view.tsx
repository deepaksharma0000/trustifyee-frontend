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
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';
import { HOST_API } from 'src/config-global';

// hooks
import { useSettingsContext } from 'src/components/settings';
import { useAuthUser } from 'src/hooks/use-auth-user';

// assets
import { SeoIllustration } from 'src/assets/illustrations';

// components
import Iconify from 'src/components/iconify';
import OpenPositionView from 'src/sections/account/view/user-account-view';

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
  const { user } = useAuthUser();

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
        headers: {
          'x-access-token': token ?? '',
        },
      });

      const usersRes = await api.get('/api/user/logged-in', {
        headers: {
          'x-access-token': token ?? '',
        },
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

  // 🟦 DEMO USER GUARD
  if (user.licence === 'Demo') {
    const isExpired = timeLeft ? timeLeft.totalSeconds <= 0 : false;

    // 🔥 IF EXPIRED: Block Access & Show Expiration Message
    if (isExpired) {
      return (
        <Container maxWidth="xl">
          <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card sx={{
              maxWidth: 600, width: '100%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.08)} 0%, ${alpha(theme.palette.error.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{
                  width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(theme.palette.error.main, 0.12), margin: '0 auto', mb: 3
                }}>
                  <Iconify icon="mdi:alert-circle" width={48} sx={{ color: theme.palette.error.main }} />
                </Box>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                  Demo Account Expired
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Aapka demo period khatam ho chuka hai. Live trading functions access karne ke liye please subscription lein.
                </Typography>

                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                  <Chip label="Expired" color="error" size="small" />
                  <Chip label="Paper Trading Mode" color="default" size="small" variant="outlined" />
                </Stack>

                <Button variant="contained" color="primary" size="large" onClick={() => { window.location.href = "https://wa.me/91XXXXXXXXXX?text=Hi, I want to subscribe to Trustifye" }} sx={{ mt: 2 }}>
                  Contact for Subscription
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Container>
      );
    }

    // ✅ IF ACTIVE: Show Only Open Positions Table (No Timer Card)
    return (
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Demo Dashboard</Typography>
        <OpenPositionView embed />
      </Container>
    );
  }

  // 🟨 LIVE USER NO BROKER GUARD
  if (user.licence === 'Live' && !user.broker) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{
            maxWidth: 600, width: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.warning.dark, 0.08)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
          }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box sx={{
                width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(theme.palette.warning.main, 0.12), margin: '0 auto', mb: 3
              }}>
                <Iconify icon="mdi:alert-circle-outline" width={48} sx={{ color: theme.palette.warning.main }} />
              </Box>
              <Typography variant="h4" gutterBottom fontWeight={700}>Broker Not Assigned</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Your account requires broker assignment to access trading features. Please contact your administrator to complete the setup.</Typography>
              <Chip label="Action Required" color="warning" icon={<Iconify icon="mdi:alert" width={18} />} />
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // 🟧 LIVE USER NOT CONNECTED GUARD
  const isBrokerConnected = localStorage.getItem('angel_jwt') !== null;
  if (user.licence === 'Live' && user.broker && !isBrokerConnected) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{
            maxWidth: 600, width: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.warning.dark, 0.08)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
          }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box sx={{
                width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(theme.palette.warning.main, 0.12), margin: '0 auto', mb: 3
              }}>
                <Iconify icon="mdi:link-variant-off" width={48} sx={{ color: theme.palette.warning.main }} />
              </Box>
              <Typography variant="h4" gutterBottom fontWeight={700}>Connect Your Broker</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Broker <strong>{user.broker}</strong> is selected but API connection is not established. Connect now to start trading.</Typography>
              <Button variant="contained" size="large" startIcon={<Iconify icon="mdi:link-variant" />} onClick={() => navigate('/dashboard/profile')} sx={{ background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`, px: 4, py: 1.5, fontWeight: 600 }}>Connect Broker API</Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // ✅ FINAL DASHBOARD (ADMIN OR LIVE CONNECTED USER)
  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h3" fontWeight={700} gutterBottom>Trading Dashboard</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`${user.licence} Account`} color="success" size="small" icon={<Iconify icon="mdi:check-circle" width={18} />} />
              <Chip label={user.broker || 'No Broker'} variant="outlined" size="small" />
              <Typography variant="caption" color="text.secondary">Last updated: {new Date().toLocaleTimeString()}</Typography>
            </Stack>
          </Box>
          <Button variant="contained" startIcon={loading ? null : <Iconify icon="mdi:refresh" width={20} />} onClick={fetchData} disabled={loading} sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, px: 3, fontWeight: 600 }}>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </Stack>
        {loading && <LinearProgress />}
      </Box>

      <Grid container spacing={3}>
        <Grid xs={12}>
          <Card sx={{ background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`, color: 'white', position: 'relative', overflow: 'hidden' }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid xs={12} md={8}>
                  <Typography variant="h4" fontWeight={700} gutterBottom>Welcome back, {user.full_name || user.user_name}! 👋</Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>Monitor your algo trading system performance and client analytics in real-time</Typography>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ bgcolor: alpha('#fff', 0.2), px: 2, py: 1, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Iconify icon="mdi:circle" width={12} color="#4ade80" />
                      <Box><Typography variant="caption" display="block">System Status</Typography><Typography variant="h6" fontWeight={600}>Online</Typography></Box>
                    </Box>
                    <Box sx={{ bgcolor: alpha('#fff', 0.2), px: 2, py: 1, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Iconify icon="mdi:circle" width={12} color="#4ade80" />
                      <Box><Typography variant="caption" display="block">API Status</Typography><Typography variant="h6" fontWeight={600}>Connected</Typography></Box>
                    </Box>
                  </Stack>
                </Grid>
                <Grid xs={12} md={4} sx={{ textAlign: 'center' }}>
                  <SeoIllustration sx={{ maxWidth: 200, opacity: 0.9 }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Custom Stats Cards */}
        {[
          { title: 'Total Clients', value: stats?.total ?? 0, icon: 'mdi:account-group', color: theme.palette.info.main },
          { title: 'Active Clients', value: stats?.active ?? 0, icon: 'mdi:check-circle', color: theme.palette.success.main },
          { title: 'Expired Clients', value: stats?.expired ?? 0, icon: 'mdi:close-circle', color: theme.palette.error.main },
          { title: 'Live Trading', value: stats?.live ?? 0, icon: 'mdi:chart-line', color: theme.palette.primary.main },
          { title: 'Demo Mode', value: stats?.demo ?? 0, icon: 'mdi:test-tube', color: theme.palette.warning.main },
        ].map((item) => (
          <Grid key={item.title} xs={12} sm={6} md={4}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha(item.color, 0.08)} 0%, ${alpha(item.color, 0.12)} 100%)`,
              border: `1px solid ${alpha(item.color, 0.2)}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{
                    p: 2, borderRadius: 2,
                    bgcolor: alpha(item.color, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Iconify icon={item.icon} width={32} sx={{ color: item.color }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">{item.title}</Typography>
                    <Typography variant="h4" fontWeight={700}>{item.value}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
