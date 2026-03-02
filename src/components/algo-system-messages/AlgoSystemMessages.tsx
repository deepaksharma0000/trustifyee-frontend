/**
 * AlgoSystemMessages — Real-world algo trading system message banners.
 *
 * Covers the same contextual messages you see on:
 * Angel Broking SmartAPI | Zerodha Kite | Upstox Pro | AliceBlue ANT
 *
 * Context types:
 *   'dashboard'      → market status, connection health, session expiry
 *   'live-trading'   → auto square-off timer, margin, slippage, MIS warning
 *   'open-positions' → expiry-day alert, MTM loss alert, auto-exit reminder
 *   'signals'        → signal queue status, execution health
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Alert,
  AlertTitle,
  Typography,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Divider,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Iconify from 'src/components/iconify';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — NSE market timing logic (IST)
// ─────────────────────────────────────────────────────────────────────────────

function getNowIST(): { hour: number; minute: number; dayOfWeek: number; dateStr: string } {
  const now = new Date();
  // IST = UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  return {
    hour: ist.getHours(),
    minute: ist.getMinutes(),
    dayOfWeek: ist.getDay(),          // 0=Sun, 1=Mon … 6=Sat
    dateStr: ist.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

type MarketStatus = 'pre-open' | 'open' | 'post-close' | 'closed' | 'holiday';

function getMarketStatus(): MarketStatus {
  const { hour, minute, dayOfWeek } = getNowIST();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'holiday';
  const totalMin = hour * 60 + minute;
  if (totalMin >= 9 * 60 && totalMin < 9 * 60 + 15) return 'pre-open';   // 09:00–09:15
  if (totalMin >= 9 * 60 + 15 && totalMin < 15 * 60 + 30) return 'open'; // 09:15–15:30
  if (totalMin >= 15 * 60 + 30 && totalMin < 16 * 60) return 'post-close'; // 15:30–16:00
  return 'closed';
}

/** True if today is Thursday (NSE weekly F&O expiry) */
function isFnOExpiryDay(): boolean {
  return getNowIST().dayOfWeek === 4;
}

/** Minutes until MIS auto square-off (NSE: 15:20 IST) */
function minutesToAutoSquareOff(): number | null {
  const { hour, minute, dayOfWeek } = getNowIST();
  if (dayOfWeek === 0 || dayOfWeek === 6) return null;
  const now = hour * 60 + minute;
  const squareOff = 15 * 60 + 20; // 15:20
  const marketClose = 15 * 60 + 30;
  if (now >= 9 * 60 + 15 && now < squareOff) return squareOff - now;
  if (now >= squareOff && now < marketClose) return 0; // already started
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlgoMsgContext = 'dashboard' | 'live-trading' | 'open-positions' | 'signals';

interface AlgoSystemMessagesProps {
  context: AlgoMsgContext;
  /** Pass the user object so we can show trading_status, licence, broker etc. */
  user?: any;
  /** Show only urgent messages (e.g. top-of-page) */
  urgentOnly?: boolean;
  sx?: object;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Pill-style live indicator dot */
function PulseDot({ color }: { color: string }) {
  return (
    <Box sx={{
      width: 8, height: 8, borderRadius: '50%', bgcolor: color,
      boxShadow: `0 0 0 3px ${alpha(color, 0.25)}`,
      animation: 'algoMsgPulse 1.8s ease-in-out infinite',
      '@keyframes algoMsgPulse': {
        '0%,100%': { boxShadow: `0 0 0 3px ${alpha(color, 0.25)}` },
        '50%': { boxShadow: `0 0 0 7px ${alpha(color, 0.06)}` },
      },
      flexShrink: 0,
    }} />
  );
}

/** Market status bar — top of every trading page */
function MarketStatusBar() {
  const theme = useTheme();
  const [status, setStatus] = useState<MarketStatus>(getMarketStatus());
  const [minsLeft, setMinsLeft] = useState<number | null>(minutesToAutoSquareOff());
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const tick = setInterval(() => {
      setStatus(getMarketStatus());
      setMinsLeft(minutesToAutoSquareOff());
      const { hour, minute } = getNowIST();
      setTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} IST`);
    }, 10000);
    const { hour, minute } = getNowIST();
    setTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} IST`);
    return () => clearInterval(tick);
  }, []);

  const config: Record<MarketStatus, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
    'pre-open':   { label: 'PRE-OPEN SESSION',   color: '#f59e0b', bg: alpha('#fffbeb', 0.95), border: alpha('#f59e0b', 0.4), icon: 'solar:sun-2-bold-duotone',               desc: 'Pre-market session (09:00–09:15). Orders can be placed but execution starts at 09:15.' },
    'open':       { label: 'MARKET OPEN',         color: '#22c55e', bg: alpha('#f0fdf4', 0.95), border: alpha('#22c55e', 0.35), icon: 'solar:chart-bold-duotone',             desc: 'NSE/BSE markets are live. Algo strategies are active.' },
    'post-close': { label: 'POST-MARKET SESSION', color: '#6366f1', bg: alpha('#eef2ff', 0.95), border: alpha('#6366f1', 0.3), icon: 'solar:clock-circle-bold-duotone',       desc: 'Market closed at 15:30. Post-closing session until 16:00. SLB & off-market orders allowed.' },
    'closed':     { label: 'MARKET CLOSED',       color: '#94a3b8', bg: alpha('#f8fafc', 0.95), border: alpha('#94a3b8', 0.3), icon: 'solar:moon-bold-duotone',               desc: 'Markets are closed. Strategies are paused. Orders will queue for next session.' },
    'holiday':    { label: 'MARKET HOLIDAY',      color: '#a855f7', bg: alpha('#faf5ff', 0.95), border: alpha('#a855f7', 0.3), icon: 'solar:calendar-date-bold-duotone',      desc: 'NSE/BSE is closed today (Weekend/Holiday). No trading session.' },
  };

  const c = config[status];
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{
        px: 2.5, py: 1.5, mb: 2,
        borderRadius: 2,
        bgcolor: c.bg,
        border: `1.5px solid ${c.border}`,
        boxShadow: `0 2px 12px ${alpha(c.color, 0.1)}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <PulseDot color={c.color} />
        <Iconify icon={c.icon} width={20} sx={{ color: c.color }} />
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: c.color, fontSize: 12.5, letterSpacing: 0.5 }}>
              {c.label}
            </Typography>
            <Chip label={time} size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(c.color, 0.1), color: c.color, border: `1px solid ${alpha(c.color, 0.3)}` }} />
          </Stack>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>
            {c.desc}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        {isFnOExpiryDay() && (
          <Chip
            label="⚡ F&O EXPIRY TODAY"
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.62rem', letterSpacing: 0.5, bgcolor: alpha('#ef4444', 0.1), color: '#ef4444', border: `1px solid ${alpha('#ef4444', 0.35)}`, animation: 'expiryFlash 1.5s ease-in-out infinite', '@keyframes expiryFlash': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } } }}
          />
        )}
        {minsLeft !== null && minsLeft <= 30 && (
          <Chip
            label={minsLeft === 0 ? '⏰ AUTO SQ-OFF ACTIVE' : `⏰ Auto Sq-Off in ${minsLeft} min`}
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.62rem', bgcolor: alpha('#f59e0b', 0.1), color: '#d97706', border: `1px solid ${alpha('#f59e0b', 0.4)}` }}
          />
        )}
      </Stack>
    </Stack>
  );
}

/** Auto square-off countdown — for Live Trading & Open Positions when market is approaching 15:20 */
function AutoSquareOffWarning() {
  const [minsLeft, setMinsLeft] = useState<number | null>(minutesToAutoSquareOff());

  useEffect(() => {
    const iv = setInterval(() => setMinsLeft(minutesToAutoSquareOff()), 30000);
    return () => clearInterval(iv);
  }, []);

  if (minsLeft === null || minsLeft > 60) return null;

  const isNow = minsLeft === 0;
  const progress = isNow ? 100 : Math.min(100, ((60 - minsLeft) / 60) * 100);
  const color = minsLeft <= 10 ? '#ef4444' : minsLeft <= 30 ? '#f59e0b' : '#6366f1';

  return (
    <Alert
      severity={minsLeft <= 10 ? 'error' : 'warning'}
      icon={<Iconify icon="solar:clock-circle-bold-duotone" width={22} />}
      sx={{ borderRadius: 2, mb: 2, border: '1.5px solid', borderColor: alpha(color, 0.5) }}
    >
      <AlertTitle sx={{ fontWeight: 800, fontSize: 13 }}>
        {isNow
          ? '🔴 MIS Auto Square-Off is Executing Now (15:20)'
          : `⚠ MIS Auto Square-Off in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''} (15:20 IST)`}
      </AlertTitle>
      <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.7 }}>
        {isNow
          ? 'All MIS/Intraday positions are being squared off automatically by the system. Do NOT place new MIS orders.'
          : `All MIS (Intraday) open positions will be automatically squared off at 15:20 IST as per NSE/SEBI regulations. Convert to CNC/NRML or exit manually before the deadline.`}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mt: 1, height: 4, borderRadius: 4,
          bgcolor: alpha(color, 0.15),
          '& .MuiLinearProgress-bar': { bgcolor: color }
        }}
      />
    </Alert>
  );
}

/** F&O Expiry day contextual alert */
function ExpiryDayAlert() {
  if (!isFnOExpiryDay()) return null;
  return (
    <Alert
      severity="error"
      variant="outlined"
      icon={<Iconify icon="solar:danger-bold-duotone" width={22} />}
      sx={{ borderRadius: 2, mb: 2, border: '1.5px solid', borderColor: alpha('#ef4444', 0.5), bgcolor: alpha('#fff5f5', 0.95) }}
    >
      <AlertTitle sx={{ fontWeight: 800 }}>📅 F&O Weekly Expiry Day — Exercise Extra Caution</AlertTitle>
      <Typography variant="caption" sx={{ lineHeight: 1.8 }}>
        Today is <strong>Thursday — NSE F&O Weekly Expiry</strong>. Option premiums will decay rapidly (theta decay).
        Stocks and indices may show extreme intraday volatility near expiry strikes.
        Avoid holding far OTM options close to expiry. Review your positions carefully before 15:00 IST.
      </Typography>
    </Alert>
  );
}

/** Market-closed / after-hours warning for trading actions */
function MarketClosedForAction() {
  const status = getMarketStatus();
  if (status === 'open' || status === 'pre-open') return null;
  return (
    <Alert
      severity="info"
      variant="outlined"
      icon={<Iconify icon="solar:moon-bold-duotone" width={22} />}
      sx={{ borderRadius: 2, mb: 2 }}
    >
      <AlertTitle sx={{ fontWeight: 800 }}>Market is Currently Closed</AlertTitle>
      <Typography variant="caption" sx={{ lineHeight: 1.7 }}>
        Orders placed now will be queued and sent to the exchange when the market opens at <strong>09:15 IST</strong> on the next trading day.
        Prices at execution may differ from current quotes. Algo strategies are in <strong>standby mode</strong>.
      </Typography>
    </Alert>
  );
}

/** MIS product type warning — always shown on live trading page */
function MisProductWarning() {
  return (
    <Alert
      severity="warning"
      variant="outlined"
      icon={<Iconify icon="solar:shield-warning-bold-duotone" width={22} />}
      sx={{ borderRadius: 2, mb: 2, border: '1.5px solid', borderColor: alpha('#f59e0b', 0.45), bgcolor: alpha('#fffbeb', 0.95) }}
    >
      <AlertTitle sx={{ fontWeight: 800 }}>MIS / Intraday Orders — Important Notice</AlertTitle>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {[
          'MIS positions must be squared off before 15:20 IST. Failure will trigger auto square-off charges.',
          'Market orders may experience slippage during high-volatility periods (opening / expiry / news events).',
          'Use Limit orders to control execution price. Market orders are not guaranteed at quoted price.',
          'Margin requirements may increase during volatile periods without prior notice.',
        ].map((pt, i) => (
          <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
            <Iconify icon="solar:alt-arrow-right-bold" width={12} sx={{ color: '#d97706', mt: 0.35, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#92400e', lineHeight: 1.6, fontSize: 11 }}>{pt}</Typography>
          </Stack>
        ))}
      </Stack>
    </Alert>
  );
}

/** Signal execution health notice */
function SignalQueueNotice() {
  const status = getMarketStatus();
  const isActive = status === 'open';
  return (
    <Alert
      severity={isActive ? 'success' : 'info'}
      variant="outlined"
      icon={<Iconify icon={isActive ? 'solar:bolt-bold-duotone' : 'solar:stop-bold-duotone'} width={22} />}
      sx={{ borderRadius: 2, mb: 2 }}
    >
      <AlertTitle sx={{ fontWeight: 800 }}>
        {isActive ? '⚡ Signal Execution Engine — ACTIVE' : '⏸ Signal Engine — STANDBY'}
      </AlertTitle>
      <Typography variant="caption" sx={{ lineHeight: 1.7 }}>
        {isActive
          ? 'Algo signal processing is live. Signals are being matched against your strategy parameters and sent to the broker in real-time. Do not close this session during active execution.'
          : 'Signal engine is in standby mode outside market hours. Signals received now will be queued and processed when market opens. No orders will be placed until 09:15 IST.'}
      </Typography>
    </Alert>
  );
}

/** Open positions context — MTM and overnight risk */
function OpenPositionContextWarning({ user }: { user?: any }) {
  const status = getMarketStatus();
  const isClosed = status === 'closed' || status === 'holiday';

  return (
    <>
      {isClosed && (
        <Alert
          severity="info"
          variant="outlined"
          icon={<Iconify icon="solar:moon-fog-bold-duotone" width={22} />}
          sx={{ borderRadius: 2, mb: 2 }}
        >
          <AlertTitle sx={{ fontWeight: 800 }}>Overnight Position Risk — Market Closed</AlertTitle>
          <Typography variant="caption" sx={{ lineHeight: 1.7 }}>
            Positions held overnight are subject to <strong>gap risk</strong> — the market may open significantly higher or lower 
            than the previous close due to global cues, news events, or earnings announcements.
            Review your stop-loss levels and ensure adequate margin is available for next session.
            <br /><Box component="span" fontWeight={700} color="warning.main"> NRML/CNC positions are not auto squared off. MIS positions cannot be carried overnight.</Box>
          </Typography>
        </Alert>
      )}

      <Alert
        severity="warning"
        variant="outlined"
        icon={<Iconify icon="solar:chart-square-bold-duotone" width={22} />}
        sx={{ borderRadius: 2, mb: 2, border: '1.5px solid', borderColor: alpha('#f59e0b', 0.4), bgcolor: alpha('#fffbeb', 0.9) }}
      >
        <AlertTitle sx={{ fontWeight: 800 }}>Live P&amp;L — Unrealised &amp; Mark-to-Market</AlertTitle>
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          {[
            'Live P&L shown is unrealised (MTM). It becomes realised only upon position exit.',
            'Brokerage, STT, exchange charges, GST and SEBI fees will be deducted from final P&L.',
            'Stop-loss orders are not guaranteed to execute at the set price in fast markets.',
            'In case of technical issues, contact your broker to manually square off positions.',
          ].map((pt, i) => (
            <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
              <Iconify icon="solar:alt-arrow-right-bold" width={12} sx={{ color: '#d97706', mt: 0.35, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: '#92400e', lineHeight: 1.6, fontSize: 11 }}>{pt}</Typography>
            </Stack>
          ))}
        </Stack>
      </Alert>
    </>
  );
}

/** Dashboard — system health strip */
function SystemHealthStrip({ user }: { user?: any }) {
  const theme = useTheme();
  const status = getMarketStatus();

  const items = [
    {
      label: 'Algo Engine',
      value: status === 'open' ? 'RUNNING' : 'STANDBY',
      color: status === 'open' ? '#22c55e' : '#94a3b8',
      icon: 'solar:cpu-bolt-bold-duotone',
    },
    {
      label: 'Signal Feed',
      value: status === 'open' ? 'LIVE' : 'QUEUED',
      color: status === 'open' ? '#22c55e' : '#6366f1',
      icon: 'solar:antenna-bold-duotone',
    },
    {
      label: 'Broker API',
      value: user?.broker_connected ? 'CONNECTED' : 'CHECK SESSION',
      color: user?.broker_connected ? '#22c55e' : '#f59e0b',
      icon: 'solar:link-bold-duotone',
    },
    {
      label: 'Market',
      value: status.replace('-', ' ').toUpperCase(),
      color: status === 'open' ? '#22c55e' : status === 'pre-open' ? '#f59e0b' : '#94a3b8',
      icon: 'solar:chart-2-bold-duotone',
    },
    {
      label: 'Data Feed',
      value: status === 'open' ? 'REAL-TIME' : 'DELAYED',
      color: status === 'open' ? '#22c55e' : '#94a3b8',
      icon: 'solar:database-bold-duotone',
    },
  ];

  return (
    <Box sx={{
      px: 2.5, py: 1.5, mb: 2,
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
      bgcolor: alpha(theme.palette.background.paper, 0.8),
      backdropFilter: 'blur(8px)',
    }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <Iconify icon="solar:server-bold-duotone" width={16} sx={{ color: 'text.disabled' }} />
        <Typography variant="caption" fontWeight={800} sx={{ color: 'text.disabled', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
          System Health
        </Typography>
        <Divider orientation="vertical" flexItem sx={{ height: 10, alignSelf: 'center' }} />
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
          {getNowIST().dateStr}
        </Typography>
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {items.map((item) => (
          <Stack key={item.label} direction="row" alignItems="center" spacing={0.75}
            sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, border: `1px solid ${alpha(item.color, 0.25)}`, bgcolor: alpha(item.color, 0.05) }}>
            <PulseDot color={item.color} />
            <Stack spacing={0}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 9.5, lineHeight: 1, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {item.label}
              </Typography>
              <Typography variant="caption" sx={{ color: item.color, fontWeight: 800, fontSize: 11, lineHeight: 1.2 }}>
                {item.value}
              </Typography>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function AlgoSystemMessages({ context, user, urgentOnly = false, sx }: AlgoSystemMessagesProps) {
  return (
    <Box sx={sx}>
      {/* ── DASHBOARD context ── */}
      {context === 'dashboard' && (
        <>
          <MarketStatusBar />
          <SystemHealthStrip user={user} />
          {!urgentOnly && <ExpiryDayAlert />}
        </>
      )}

      {/* ── LIVE TRADING context ── */}
      {context === 'live-trading' && (
        <>
          <MarketStatusBar />
          <AutoSquareOffWarning />
          <ExpiryDayAlert />
          {!urgentOnly && <MisProductWarning />}
        </>
      )}

      {/* ── OPEN POSITIONS context ── */}
      {context === 'open-positions' && (
        <>
          <MarketStatusBar />
          <AutoSquareOffWarning />
          <ExpiryDayAlert />
          {!urgentOnly && <OpenPositionContextWarning user={user} />}
        </>
      )}

      {/* ── SIGNALS context ── */}
      {context === 'signals' && (
        <>
          <MarketStatusBar />
          <SignalQueueNotice />
          <AutoSquareOffWarning />
          {!urgentOnly && <ExpiryDayAlert />}
        </>
      )}
    </Box>
  );
}
