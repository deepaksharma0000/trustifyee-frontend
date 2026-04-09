import { useState, useEffect, useMemo, useCallback } from 'react';
// @mui
import {
  Box,
  Card,
  Grid,
  Stack,
  Button,
  Container,
  Typography,
  Divider,
  LinearProgress,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
// components
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import axios, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

type LogEntry = {
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
};

type Props = {
  userId?: string;
  disablePadding?: boolean;
};

export default function RiskHealthView({ userId: propUserId, disablePadding = false }: Props) {
  const settings = useSettingsContext();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const userData = useMemo(() => {
    try {
      const stored = localStorage.getItem('authUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const userId = propUserId || userData?._id || userData?.id;

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const fetchRiskStatus = useCallback(async (isManual = false) => {
    if (!userId) return;

    try {
      setLoading(isManual);
      const url = endpoints.user.riskStatus(userId);
      const response = await axios.get(isManual ? `${url}?refresh=true` : url);
      const result = response.data.data;
      setData(result);

      if (isManual) {
        addLog('System scan completed successfully.', 'info');
      }

      // Live monitoring logs
      if (result.trading_paused) {
        addLog('RISK: Trading activity paused due to system safety limits.', 'error');
      }
      
      if (!result.profile_valid) {
        addLog(`SESSION: Connection error detected: ${result.profile_message}`, 'warning');
      } else {
        addLog('SESSION: Broker connectivity verified and active.', 'success');
      }

      if (!result.margin_valid) {
        addLog(`MARGIN: Insufficient balance alert: ${result.margin_message}`, 'warning');
      } else {
        addLog(`MARGIN: Wallet balance check completed. Funds available.`, 'success');
      }

    } catch (error) {
      console.error(error);
      addLog('NETWORK: Connection to risk engine timed out.', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, addLog]);

  useEffect(() => {
    fetchRiskStatus();
    const interval = setInterval(() => fetchRiskStatus(false), 30000);
    return () => clearInterval(interval);
  }, [fetchRiskStatus]);

  const marginPercent = useMemo(() => {
    if (!data?.margin_data) return 0;
    const available = parseFloat(data.margin_data.availablecash || '0');
    const used = Math.abs(parseFloat(data.margin_data.utilized || '0'));
    const total = available + used;
    return total > 0 ? (used / total) * 100 : 0;
  }, [data]);

  const content = (
    <Grid container spacing={2.5}>
      {/* Left Column: Metrics Grid */}
      <Grid item xs={12} md={8}>
        <Stack spacing={2.5}>
          <Grid container spacing={2.5}>
            {/* Session Card */}
            <Grid item xs={12} sm={6}>
              <MetricCard
                title="Broker Connectivity"
                subtitle="Real-time Session Status"
                value={data?.profile_valid ? 'Active' : 'Offline'}
                caption={data?.profile_message || 'Validating...'}
                status={data?.profile_valid ? 'success' : 'error'}
                icon="solar:link-1-bold"
              />
            </Grid>

            {/* Funds Card */}
            <Grid item xs={12} sm={6}>
              <MetricCard
                title="Fund Sufficiency"
                subtitle="Usable Trading Margin"
                value={data?.margin_valid ? 'Ready' : 'Low Funds'}
                caption={data?.margin_message || 'Calculating...'}
                status={data?.margin_valid ? 'success' : 'warning'}
                icon="solar:wallet-2-bold"
              />
            </Grid>

            {/* Safety Switch Card */}
            <Grid item xs={12}>
              <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 3, border: (th) => `1px solid ${data?.trading_paused ? th.palette.error.main : th.palette.divider}`, boxShadow: 'none' }}>
                <Box sx={{ p: 2, borderRadius: '50%', bgcolor: (th) => alpha(data?.trading_paused ? th.palette.error.main : th.palette.success.main, 0.1), color: data?.trading_paused ? 'error.main' : 'success.main' }}>
                  <Iconify icon={data?.trading_paused ? "solar:shield-cross-bold" : "solar:shield-check-bold"} width={32} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>Circuit Breaker Protocol</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Safety Status: <strong>{data?.trading_paused ? 'Engaged (Trading Locked)' : 'Scanning (System Clear)'}</strong>
                  </Typography>
                </Box>
                <Label color={data?.trading_paused ? 'error' : 'success'} variant="soft">
                   {data?.consecutive_failures || 0} / 3 Failures
                </Label>
              </Card>
            </Grid>

            {/* Margin Usage Card */}
            <Grid item xs={12}>
              <Card sx={{ p: 2.5, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>Exposure Utilization Monitor</Typography>
                <Box sx={{ mt: 1, position: 'relative' }}>
                  <LinearProgress
                    variant="determinate"
                    value={marginPercent}
                    color={
                      (marginPercent > 70 && 'error') ||
                      (marginPercent > 50 && 'warning') ||
                      'success'
                    }
                    sx={{ height: 10, borderRadius: 5, bgcolor: (th) => alpha(th.palette.grey[500], 0.1) }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                    <Typography variant="h6" sx={{ fontSize: 15 }}>{marginPercent.toFixed(1)}% Capacity Used</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Limit: 70.0%</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Grid>

      {/* Right Column: Refined Log Terminal */}
      <Grid item xs={12} md={4}>
        <Card sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.neutral'
        }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
               <Box sx={{ width: 6, height: 6, bgcolor: 'success.main', borderRadius: '50%' }} />
               <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Activity Monitor</Typography>
            </Stack>
            <IconButton size="small" onClick={() => setLogs([])}>
              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
            </IconButton>
          </Box>

          <Scrollbar sx={{ flexGrow: 1, p: 2, height: 480 }}>
            <Stack spacing={1.5}>
              {logs.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', mt: 4 }}>
                  No system activity logs to display.
                </Typography>
              )}
              {logs.map((log, index) => (
                <Box key={index}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', whiteSpace: 'nowrap', mt: 0.2 }}>
                      {log.time}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.8rem', 
                        lineHeight: 1.5,
                        color: (log.type === 'error' && 'error.main') ||
                               (log.type === 'warning' && 'warning.main') ||
                               (log.type === 'success' && 'success.main') ||
                               'text.primary'
                      }}
                    >
                      {log.message}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Scrollbar>

          <Divider />
          <Box sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700 }}>
              AUTO-HEALTH CHECK :: ENABLED
            </Typography>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );

  if (disablePadding) {
    return content;
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
           <Typography variant="h4" sx={{ fontWeight: 800 }}>Account Health</Typography>
           <Typography variant="body2" color="text.secondary">Account risk and broker connectivity overview</Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Iconify icon="solar:restart-bold" />}
          onClick={() => fetchRiskStatus(true)}
          disabled={loading}
          sx={{ boxShadow: 'none' }}
        >
          Check Now
        </Button>
      </Stack>

      {content}
    </Container>
  );
}

// ----------------------------------------------------------------------

function MetricCard({ title, subtitle, value, caption, status, icon }: any) {
  const theme = useTheme();

  let color = theme.palette.error.main;
  if (status === 'success') color = theme.palette.success.main;
  else if (status === 'warning') color = theme.palette.warning.main;

  return (
    <Card sx={{ p: 2.5, height: '100%', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(color, 0.08), color }}>
          <Iconify icon={icon} width={24} />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Stack>
      
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h4" sx={{ color, fontWeight: 800 }}>{value}</Typography>
        <Label color={status} variant="soft">{status.toUpperCase()}</Label>
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {caption}
      </Typography>
    </Card>
  );
}
