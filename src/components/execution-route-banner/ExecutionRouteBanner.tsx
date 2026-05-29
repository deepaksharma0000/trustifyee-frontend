import React, { useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
// utils
import axiosInstance from 'src/utils/axios';

// ----------------------------------------------------------------------

interface RouteDiagnostics {
  executionMode: string;
  detectedOutboundIp: string;
  configuredPublicIp: string;
  brokerWhitelistMatch: boolean;
  routeClassification: string;
  safetyStatus: string;
}

export default function ExecutionRouteBanner() {
  const theme = useTheme();
  const [diagnostics, setDiagnostics] = useState<RouteDiagnostics | null>(null);
  const [flags, setFlags] = useState<{
    PAPER_ONLY_MODE: boolean;
    LIVE_TRADING_ENABLED: boolean;
    SAFE_MODE_GLOBAL: boolean;
    BROKER_DISABLED: boolean;
    SHADOW_ONLY_MODE: boolean;
    EMERGENCY_KILL_SWITCH: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await axiosInstance.get('/api/execution/route-status');
      if (response.data && response.data.status === 'success') {
        setDiagnostics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch execution route diagnostics:', error);
    }

    try {
      const flagsResponse = await axiosInstance.get('/api/observability/flags');
      if (flagsResponse.data && flagsResponse.data.status === 'success') {
        setFlags(flagsResponse.data.flags);
      }
    } catch (error) {
      console.error('Failed to fetch operational flags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 10 seconds to keep operational alerts reactive
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !diagnostics) {
    return null;
  }

  const {
    executionMode,
    detectedOutboundIp,
    configuredPublicIp,
    brokerWhitelistMatch,
    routeClassification,
    safetyStatus,
  } = diagnostics;

  const isLocalHostFrontend =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Highlight if local frontend is using centralized shared VPS execution route
  const showLocalhostVPSWarning = isLocalHostFrontend && executionMode === 'SERVER_SHARED_IP';

  // Setup color/theme scheme based on execution mode and safety status
  let mainColor = theme.palette.primary.main;
  let bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.08)} 100%)`;
  let borderColor = alpha(theme.palette.primary.main, 0.2);

  if (executionMode === 'LOCAL_DEVICE') {
    mainColor = theme.palette.info.main;
    bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`;
    borderColor = alpha(theme.palette.info.main, 0.25);
  } else if (executionMode === 'SERVER_SHARED_IP') {
    mainColor = theme.palette.warning.main;
    bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.warning.dark, 0.12)} 100%)`;
    borderColor = alpha(theme.palette.warning.main, 0.25);
  } else if (executionMode === 'STATIC_AGENT') {
    mainColor = theme.palette.success.main;
    bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`;
    borderColor = alpha(theme.palette.success.main, 0.25);
  }

  return (
    <Stack spacing={1.5} sx={{ width: '100%', px: { xs: 2, lg: 5 }, pt: 2, pb: 0.5 }}>
      {/* 🚨 Global Emergency Kill Switch Banner */}
      {flags?.EMERGENCY_KILL_SWITCH && (
        <Box
          sx={{
            py: 1.5,
            px: 2.5,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.error.main, 0.12),
            border: `2px dashed ${theme.palette.error.main}`,
            boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.15)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            animation: 'pulseEmergency 1.8s infinite ease-in-out',
            '@keyframes pulseEmergency': {
              '0%, 100%': { opacity: 0.9, transform: 'scale(1)' },
              '50%': { opacity: 1, transform: 'scale(1.002)', borderColor: alpha(theme.palette.error.main, 0.6) },
            },
          }}
        >
          <Typography variant="subtitle2" sx={{ color: theme.palette.error.main, fontWeight: 900, fontSize: 13.5, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            🚨 CRITICAL STATE: EMERGENCY KILL SWITCH ACTIVE — ALL STRATEGY ENTRIES ARE INSTANTLY BLOCKED. LIQUIDATION & EXITS ONLY.
          </Typography>
        </Box>
      )}

      {/* 🛡️ Global Safe Mode Active Banner */}
      {flags?.SAFE_MODE_GLOBAL && !flags?.EMERGENCY_KILL_SWITCH && (
        <Box
          sx={{
            py: 1.2,
            px: 2,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            border: `1px solid ${theme.palette.warning.main}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: theme.palette.warning.main, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 1 }}>
            🛡️ SAFETY ACTIVE: GLOBAL SAFE MODE ENGAGED — NEW STRATEGY ENTRIES REJECTED. EXITS ALLOWED.
          </Typography>
        </Box>
      )}

      {/* 🔌 Broker Connections Suspended Banner */}
      {flags?.BROKER_DISABLED && (
        <Box
          sx={{
            py: 1.2,
            px: 2,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: `1px solid ${theme.palette.error.main}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: theme.palette.error.main, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 1 }}>
            🔌 CONNECTION LOST: OUTBOUND BROKER EXECUTION SUSPENDED BY SYSTEM ADMINISTRATION.
          </Typography>
        </Box>
      )}

      {/* 📝 Paper Trading Safe-guard Banner */}
      {(flags?.PAPER_ONLY_MODE || flags?.SHADOW_ONLY_MODE) && (
        <Box
          sx={{
            py: 1.2,
            px: 2,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.info.main, 0.1),
            border: `1px solid ${theme.palette.info.main}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: theme.palette.info.main, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 1 }}>
            📝 ENVIRONMENT SAFEGUARD: PAPER/SHADOW TRADING ONLY MODE ACTIVE — NO REAL CAPITAL EXPOSED.
          </Typography>
        </Box>
      )}

      {/* ⚠️ Centralized VPS Routing Warning on Localhost */}
      {showLocalhostVPSWarning && (
        <Box
          sx={{
            py: 1.2,
            px: 2,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.warning.main, 0.12),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.08)}`,
            animation: 'pulseWarning 2s infinite ease-in-out',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '@keyframes pulseWarning': {
              '0%, 100%': { opacity: 0.95 },
              '50%': { opacity: 1, transform: 'scale(1.002)' },
            },
          }}
        >
          <Typography variant="subtitle2" sx={{ color: theme.palette.warning.dark, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            ⚠️ Local testing is using centralized VPS execution route.
          </Typography>
        </Box>
      )}

      {/* Main Glassmorphic Route Banner */}
      <Box
        sx={{
          py: 1.5,
          px: 2.5,
          borderRadius: 2,
          background: bgGradient,
          border: `1px solid ${borderColor}`,
          backdropFilter: 'blur(10px)',
          boxShadow: `0 8px 32px 0 ${alpha(mainColor, 0.05)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: `0 8px 32px 0 ${alpha(mainColor, 0.08)}`,
            borderColor: alpha(mainColor, 0.4),
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          {/* Section 1: Execution Mode and Classification */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: brokerWhitelistMatch ? 'success.main' : 'error.main',
                boxShadow: `0 0 8px ${brokerWhitelistMatch ? theme.palette.success.main : theme.palette.error.main}`,
                animation: !brokerWhitelistMatch ? 'pulseGlow 1.5s infinite ease-in-out' : 'none',
                '@keyframes pulseGlow': {
                  '0%, 100%': { transform: 'scale(1)', opacity: 0.8 },
                  '50%': { transform: 'scale(1.3)', opacity: 1 },
                },
              }}
            />
            <Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'semibold', letterSpacing: 0.5 }}>
                ACTIVE ROUTE ENGINE
              </Typography>
              <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                {routeClassification}
              </Typography>
            </Stack>
          </Stack>

          {/* Section 2: Execution IP Address Details */}
          <Stack direction="row" spacing={3}>
            <Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'semibold' }}>
                OUTBOUND EXECUTION IP
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'text.primary' }}>
                {detectedOutboundIp}
              </Typography>
            </Stack>

            <Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'semibold' }}>
                WHITELISTED BROKER IP
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'text.primary' }}>
                {configuredPublicIp}
              </Typography>
            </Stack>
          </Stack>

          {/* Section 3: Whitelist & Safety Status Badges */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {/* Whitelist status badge */}
            <Box
              sx={{
                py: 0.5,
                px: 1.5,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                bgcolor: brokerWhitelistMatch
                  ? alpha(theme.palette.success.main, 0.12)
                  : alpha(theme.palette.error.main, 0.12),
                color: brokerWhitelistMatch ? 'success.main' : 'error.main',
                border: `1px solid ${alpha(brokerWhitelistMatch ? theme.palette.success.main : theme.palette.error.main, 0.25)}`,
              }}
            >
              WHITELIST: {brokerWhitelistMatch ? 'MATCHED' : 'MISMATCHED'}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 420, display: { xs: 'none', md: 'block' } }}>
              Server egress only. Orders use platform ANGEL_API_KEY — whitelist {configuredPublicIp} on that SmartAPI app in Angel One.
            </Typography>

            {/* Safety status badge */}
            <Box
              sx={{
                py: 0.5,
                px: 1.5,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                bgcolor: brokerWhitelistMatch
                  ? alpha(theme.palette.success.main, 0.12)
                  : alpha(theme.palette.error.main, 0.16),
                color: brokerWhitelistMatch ? 'success.main' : 'error.main',
                border: `1px solid ${alpha(brokerWhitelistMatch ? theme.palette.success.main : theme.palette.error.main, 0.3)}`,
                animation: !brokerWhitelistMatch ? 'pulseBadge 2s infinite ease-in-out' : 'none',
                '@keyframes pulseBadge': {
                  '0%, 100%': { filter: 'brightness(1)' },
                  '50%': { filter: 'brightness(1.2)' },
                },
              }}
            >
              {safetyStatus === 'SECURE' ? 'SECURE' : 'PAPER FALLBACK ACTIVE'}
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
