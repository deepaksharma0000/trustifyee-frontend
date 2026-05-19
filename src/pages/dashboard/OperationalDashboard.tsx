import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Card, Grid, 
  Button, Table, TableBody, TableCell, TableHead, TableRow, 
  Chip, Tabs, Tab, CircularProgress, Alert
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { HOST_API } from 'src/config-global';

interface ObservabilityMetrics {
  tickThroughput: number;
  avgOmsLatencyMs: number;
  avgReconLatencyMs: number;
  reconMismatchesCount: number;
  activeAlertsCount: number;
}

export default function OperationalDashboard() {
  const [tab, setTab] = useState(0);
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [shadowLogs, setShadowLogs] = useState<any[]>([]);
  const [chaosLogs, setChaosLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/observability/metrics`);
      const data = await res.json();
      setMetrics(data);
    } catch (e) {}
  };

  const fetchShadowLog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/observability/shadow-log`);
      const data = await res.json();
      setShadowLogs(data.logs || []);
    } catch (e) {}
  };

  const fetchChaosLog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chaos/metrics`);
      const data = await res.json();
      setChaosLogs(data.logs || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === 1) fetchShadowLog();
    if (tab === 2) fetchChaosLog();
  }, [tab]);

  const triggerChaos = async (endpoint: string, payload = {}) => {
    try {
      setLoading(true);
      await fetch(`${API_BASE}/api/chaos/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      enqueueSnackbar(`Chaos drill ${endpoint} initiated`, { variant: 'warning' });
      fetchChaosLog();
    } catch (e) {
      enqueueSnackbar(`Failed to trigger drill`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Operational Control Center
      </Typography>
      
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Observability & Telemetry" />
        <Tab label="Shadow Execution" />
        <Tab label="Chaos Framework" />
        <Tab label="Strategy Runtime" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">Tick Throughput</Typography>
              <Typography variant="h3">{metrics?.tickThroughput || 0}</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">Avg OMS Latency</Typography>
              <Typography variant="h3">{metrics?.avgOmsLatencyMs || 0} ms</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="error.main">Recon Mismatches</Typography>
              <Typography variant="h3" color="error">{metrics?.reconMismatchesCount || 0}</Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Shadow Match Ledger</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell>Live Price</TableCell>
                <TableCell>Paper Price</TableCell>
                <TableCell>Divergence (Paisa)</TableCell>
                <TableCell>State</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shadowLogs.map((log: any) => (
                <TableRow key={log.clientOrderId}>
                  <TableCell>{log.clientOrderId}</TableCell>
                  <TableCell>{log.tradingsymbol}</TableCell>
                  <TableCell>₹{log.livePrice}</TableCell>
                  <TableCell>₹{log.paperPrice}</TableCell>
                  <TableCell>
                    <Typography color={log.divergenceDeltaPaisa > 10 ? 'error' : 'success'}>
                      {log.divergenceDeltaPaisa}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.state} color={log.state === 'SHADOW_MATCHED' ? 'success' : 'error'} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Drill Injectors</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button variant="contained" color="error" onClick={() => triggerChaos('websocket-storm')} disabled={loading}>
                  Inject WS Disconnect Storm
                </Button>
                <Button variant="contained" color="warning" onClick={() => triggerChaos('clock-drift')} disabled={loading}>
                  Inject NTP Clock Drift
                </Button>
                <Button variant="contained" color="info" onClick={() => triggerChaos('sandbox-crash', { strategyId: 'test-1' })} disabled={loading}>
                  Inject Sandbox Crash
                </Button>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Chaos Execution Logs</Typography>
              {chaosLogs.length === 0 ? (
                <Typography color="text.secondary">No active or past experiments.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Experiment</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Assertions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chaosLogs.map((c: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{c.experimentName}</TableCell>
                        <TableCell><Chip label={c.result} color={c.result === 'SUCCESS' ? 'success' : 'error'} size="small" /></TableCell>
                        <TableCell>{c.assertionsVerified?.length || 0} passed</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Grid>
        </Grid>
      )}
      
      {tab === 3 && (
        <Card sx={{ p: 3 }}>
           <Typography variant="h6" gutterBottom>Strategy Sandbox Runtimes</Typography>
           <Alert severity="info">Sandbox telemetry connected. Awaiting active runtime dispatches.</Alert>
        </Card>
      )}
    </Container>
  );
}
