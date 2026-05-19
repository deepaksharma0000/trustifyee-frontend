import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, AlertTitle } from '@mui/material';
import { HOST_API } from 'src/config-global';
import Iconify from 'src/components/iconify';

interface StartupStatus {
  correlationId?: string;
  state: 'INITIALIZING' | 'READY' | 'DEGRADED' | 'FAILED';
  safeBootMode: boolean;
  driftAnalytics?: any;
}

export default function StartupSafetyBanner() {
  const [status, setStatus] = useState<StartupStatus | null>(null);
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/observability/startup/status`);
        const json = await res.json();
        setStatus(json);
      } catch (err) {
        // Silently fail if endpoint doesn't exist yet
      }
    };

    fetchStatus();
    // Poll every 30s to check if we recovered
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  if (!status || !status.safeBootMode) return null;

  return (
    <Box sx={{ width: '100%', zIndex: 9999, position: 'relative' }}>
      <Alert 
        severity="error" 
        icon={<Iconify icon="eva:alert-triangle-fill" width={24} />}
        sx={{ borderRadius: 0, justifyContent: 'center' }}
      >
        <AlertTitle sx={{ mb: 0, fontWeight: 'bold' }}>
          CRITICAL: System in Safe Boot Mode
        </AlertTitle>
        The backend infrastructure detected unstable dependencies during startup ({status.state}). New entry strategies and algo deployments are strictly disabled. Only manual emergency exits are permitted.
      </Alert>
    </Box>
  );
}
