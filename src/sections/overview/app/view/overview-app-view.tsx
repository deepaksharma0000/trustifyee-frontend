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

// hooks
import { useSettingsContext } from 'src/components/settings';
import { useAuthUser } from 'src/hooks/use-auth-user';

// assets
import { SeoIllustration } from 'src/assets/illustrations';

// components
import Iconify from 'src/components/iconify';
import AppWelcome from '../app-welcome';
import AppWidgetSummary from '../app-widget-summary';
import { BACKEND_API } from 'src/config-global';

// ----------------------------------------------------------------------

type StatsResponse = {
  total: number;
  active: number;
  expired: number;
  live: number;
  demo: number;
};

const API_BASE = BACKEND_API;

// ----------------------------------------------------------------------

export default function OverviewAppView() {
  // ✅ hooks (ALWAYS ON TOP)
  const theme = useTheme();
  const settings = useSettingsContext();
  const navigate = useNavigate();
  const { user } = useAuthUser();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

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

  // ----------------------------------------------------------------------
  // ✅ FETCH DASHBOARD DATA (LIVE USER ONLY)
  const fetchData = useCallback(async () => {
    // if (!user || user.licence !== 'Live') return;
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
        active: users.filter(
          (u: any) => u.status === 'active' && u.end_date >= today
        ).length,
        expired: users.filter(
          (u: any) => !u.end_date || u.end_date < today
        ).length,
        live: users.filter(
          (u: any) =>
            (u.licence || '').toLowerCase() === 'live' &&
            u.status === 'active'
        ).length,
        demo: users.filter(
          (u: any) => (u.licence || '').toLowerCase() === 'demo'
        ).length,
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

  useEffect(() => {
    console.log('STATS 👉', stats);
  }, [stats]);
  // ----------------------------------------------------------------------
  // ✅ RENDER GUARDS (NO HOOK ISSUES)

  if (!user) return null;

  // 🟦 DEMO USER
  if (user.licence === 'Demo') {
    return (
      <Container maxWidth="xl">
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Card
            sx={{
              maxWidth: 600,
              width: '100%',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.info.main,
                0.08
              )} 0%, ${alpha(theme.palette.info.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  margin: '0 auto',
                  mb: 3,
                }}
              >
                <Iconify
                  icon="mdi:test-tube"
                  width={48}
                  sx={{ color: theme.palette.info.main }}
                />
              </Box>
              <Typography variant="h4" gutterBottom fontWeight={700}>
                Demo Account Active
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                You are currently using a <strong>Demo</strong> account. Live
                trading features and real-time analytics are disabled in this
                mode.
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                sx={{ mb: 2 }}
              >
                <Chip
                  label="Paper Trading Only"
                  color="info"
                  size="small"
                />
                <Chip
                  label="No Real Funds"
                  color="default"
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // 🟨 LIVE USER BUT NO BROKER
  if (user.licence === 'Live' && !user.broker) {
    return (
      <Container maxWidth="xl">
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Card
            sx={{
              maxWidth: 600,
              width: '100%',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.warning.main,
                0.08
              )} 0%, ${alpha(theme.palette.warning.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.warning.main, 0.12),
                  margin: '0 auto',
                  mb: 3,
                }}
              >
                <Iconify
                  icon="mdi:alert-circle-outline"
                  width={48}
                  sx={{ color: theme.palette.warning.main }}
                />
              </Box>
              <Typography variant="h4" gutterBottom fontWeight={700}>
                Broker Not Assigned
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Your account requires broker assignment to access trading
                features. Please contact your administrator to complete the
                setup.
              </Typography>
              <Chip
                label="Action Required"
                color="warning"
                icon={<Iconify icon="mdi:alert" width={18} />}
              />
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // 🟧 LIVE USER + BROKER BUT API NOT CONNECTED
  if (user.licence === 'Live' && user.broker && !user.broker_connected) {
    return (
      <Container maxWidth="xl">
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Card
            sx={{
              maxWidth: 600,
              width: '100%',
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.warning.main,
                0.08
              )} 0%, ${alpha(theme.palette.warning.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.warning.main, 0.12),
                  margin: '0 auto',
                  mb: 3,
                }}
              >
                <Iconify
                  icon="mdi:link-variant-off"
                  width={48}
                  sx={{ color: theme.palette.warning.main }}
                />
              </Box>
              <Typography variant="h4" gutterBottom fontWeight={700}>
                Connect Your Broker
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Broker <strong>{user.broker}</strong> is selected but API
                connection is not established. Connect now to start trading.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<Iconify icon="mdi:link-variant" />}
                onClick={() => navigate('/profile/broker-connect')}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                }}
              >
                Connect Broker API
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // ----------------------------------------------------------------------
  // ✅ FINAL DASHBOARD (LIVE + CONNECTED USER)

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Trading Dashboard
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`${user.licence} Account`}
                color="success"
                size="small"
                icon={<Iconify icon="mdi:check-circle" width={18} />}
              />
              <Chip
                label={user.broker || 'No Broker'}
                variant="outlined"
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Stack>
          </Box>
          <Button
            variant="contained"
            startIcon={
              loading ? null : <Iconify icon="mdi:refresh" width={20} />
            }
            onClick={fetchData}
            disabled={loading}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              px: 3,
              fontWeight: 600,
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </Stack>
        {loading && <LinearProgress />}
      </Box>

      <Grid container spacing={3}>
        {/* Welcome Card */}
        <Grid xs={12}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.9
              )} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid xs={12} md={8}>
                  <Typography variant="h4" fontWeight={700} gutterBottom>
                    Welcome back, {user.full_name || user.user_name}! 👋
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                    Monitor your algo trading system performance and client
                    analytics in real-time
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Box
                      sx={{
                        bgcolor: alpha('#fff', 0.2),
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Iconify icon="mdi:circle" width={12} color="#4ade80" />
                      <Box>
                        <Typography variant="caption" display="block">
                          System Status
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          Online
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: alpha('#fff', 0.2),
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Iconify icon="mdi:circle" width={12} color="#4ade80" />
                      <Box>
                        <Typography variant="caption" display="block">
                          API Status
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          Connected
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Grid>
                <Grid xs={12} md={4} sx={{ textAlign: 'center' }}>
                  <SeoIllustration
                    sx={{
                      maxWidth: 200,
                      opacity: 0.9,
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Cards */}
        <Grid xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.info.main,
                0.08
              )} 0%, ${alpha(theme.palette.info.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.12),
                  }}
                >
                  <Iconify
                    icon="mdi:account-group"
                    width={40}
                    sx={{ color: theme.palette.info.main }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Clients
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats?.total ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.success.main,
                0.08
              )} 0%, ${alpha(theme.palette.success.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                  }}
                >
                  <Iconify
                    icon="mdi:check-circle"
                    width={40}
                    sx={{ color: theme.palette.success.main }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Clients
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats?.active ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.error.main,
                0.08
              )} 0%, ${alpha(theme.palette.error.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.error.main, 0.12),
                  }}
                >
                  <Iconify
                    icon="mdi:close-circle"
                    width={40}
                    sx={{ color: theme.palette.error.main }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Expired Clients
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats?.expired ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={6}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.08
              )} 0%, ${alpha(theme.palette.primary.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  }}
                >
                  <Iconify
                    icon="mdi:chart-line"
                    width={40}
                    sx={{ color: theme.palette.primary.main }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Live Trading Clients
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats?.live ?? 0}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    Real-time trading active
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={6}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.warning.main,
                0.08
              )} 0%, ${alpha(theme.palette.warning.dark, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                  }}
                >
                  <Iconify
                    icon="mdi:test-tube"
                    width={40}
                    sx={{ color: theme.palette.warning.main }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Demo/Paper Trading
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats?.demo ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Simulation mode
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}