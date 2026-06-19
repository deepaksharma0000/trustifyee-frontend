// @mui
import Box from '@mui/material/Box';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';
import { useAuthUser } from 'src/hooks/use-auth-user';
import { useSignalExecutor } from 'src/hooks/use-signal-executor';
// components
import { useSettingsContext } from 'src/components/settings';
import InactivityTimer from 'src/components/inactivity-timer/InactivityTimer';
import ExecutionRouteBanner from 'src/components/execution-route-banner/ExecutionRouteBanner';
//
import Main from './main';
import Header from './header';
import NavMini from './nav-mini';
import NavVertical from './nav-vertical';
import NavHorizontal from './nav-horizontal';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const settings = useSettingsContext();

  const lgUp = useResponsive('up', 'lg');

  const { user } = useAuthUser();
  const token = sessionStorage.getItem("accessToken") || localStorage.getItem("authToken");

  const role = String(user?.role || '').toLowerCase();
  const isStaff = role === 'admin' || role === 'sub-admin' || role === 'master';
  const isLiveUser =
    String(user?.licence || '').toLowerCase() === 'live' &&
    (user?.broker_connected === true ||
      ['zerodha', 'upstox', 'aliceblue'].includes(String(user?.broker || '').toLowerCase()));
  const enabled = !!user && !!token && !isStaff && isLiveUser;

  useSignalExecutor({
    token,
    enabled,
    onSignalReceived: (signal) => {
      console.log("[BackgroundExecutor] Received signal:", signal);
    },
    onOrderPlaced: (signal, result) => {
      console.log("[BackgroundExecutor] Order placed in background:", signal, result);
    },
    onOrderFailed: (signal, err) => {
      console.error("[BackgroundExecutor] Order failed in background:", signal, err);
    },
  });

  const nav = useBoolean();

  const isHorizontal = settings.themeLayout === 'horizontal';

  const isMini = settings.themeLayout === 'mini';

  const renderNavMini = <NavMini />;

  const renderHorizontal = <NavHorizontal />;

  const renderNavVertical = <NavVertical openNav={nav.value} onCloseNav={nav.onFalse} />;

  if (isHorizontal) {
    return (
      <>
        <InactivityTimer />
        <Header onOpenNav={nav.onTrue} />

        {lgUp ? renderHorizontal : renderNavVertical}

        <Main>
          <ExecutionRouteBanner />
          {children}
        </Main>
      </>
    );
  }

  if (isMini) {
    return (
      <>
        <InactivityTimer />
        <Header onOpenNav={nav.onTrue} />

        <Box
          sx={{
            minHeight: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {lgUp ? renderNavMini : renderNavVertical}

          <Main>
            <ExecutionRouteBanner />
            {children}
          </Main>
        </Box>
      </>
    );
  }

  return (
    <>
      <InactivityTimer />
      <Header onOpenNav={nav.onTrue} />

      <Box
        sx={{
          minHeight: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {renderNavVertical}

        <Main>
          <ExecutionRouteBanner />
          {children}
        </Main>
      </Box>
    </>
  );
}
