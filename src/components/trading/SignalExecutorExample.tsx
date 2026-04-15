import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSignalExecutor } from 'src/hooks/useSignalExecutor';
import { useBrokerSession } from 'src/trading/context/broker-session-context';

type Props = {
  appToken: string | null;
  enabled: boolean;
};

export function SignalExecutorExample({ appToken, enabled }: Props) {
  const { angelClient, state, setCredentials } = useBrokerSession();
  const [clientCode, setClientCode] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const execution = useSignalExecutor({
    appToken,
    enabled,
    onExecutionSuccess: (result) => {
      setStatusMessage(`Signal ${result.signalId} executed successfully. Order: ${result.orderId || 'N/A'}`);
    },
    onExecutionFailure: (result) => {
      setStatusMessage(`Signal ${result.signalId} failed: ${result.error || 'Unknown error'}`);
    },
  });

  const connectionLabel = useMemo(() => {
    if (!enabled) return 'Disabled';
    if (!execution.isConnected) return 'Waiting for WebSocket';
    if (!execution.isExecutorReady) return 'Reconnect broker session';
    return 'Ready';
  }, [enabled, execution.isConnected, execution.isExecutorReady]);

  const handleConnectBroker = async () => {
    try {
      setCredentials({ clientCode, apiKey });
      await angelClient.generateSession({
        clientcode: clientCode,
        password,
        totp,
      });
      setStatusMessage('Broker session connected in memory. Signals can now execute from this device.');
    } catch (error: any) {
      setStatusMessage(error.message || 'Failed to connect broker session');
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Signal Executor</Typography>
          <Typography variant="body2" color="text.secondary">
            In-memory broker session only. No API key is persisted to localStorage.
          </Typography>
        </Box>

        {statusMessage && <Alert severity={execution.lastError ? 'error' : 'success'}>{statusMessage}</Alert>}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Client Code"
            value={clientCode}
            onChange={(event) => setClientCode(event.target.value)}
            fullWidth
          />
          <TextField
            label="API Key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Broker Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            fullWidth
          />
          <TextField
            label="TOTP"
            value={totp}
            onChange={(event) => setTotp(event.target.value)}
            fullWidth
          />
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="contained" onClick={handleConnectBroker} disabled={!clientCode || !apiKey || !password || !totp}>
            Connect Broker Session
          </Button>
          <Typography variant="body2" color="text.secondary">
            WebSocket: {connectionLabel} | Queue: {execution.queueSize}
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Active in-memory client: {state.credentials?.clientCode || 'none'}
        </Typography>
      </Stack>
    </Card>
  );
}
