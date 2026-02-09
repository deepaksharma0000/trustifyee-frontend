// @mui
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
// auth
import { useAuthContext } from 'src/auth/hooks';
// hooks
import { useResponsive } from 'src/hooks/use-responsive';
// components
import Logo from 'src/components/logo';

// ----------------------------------------------------------------------

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  image?: string;
  children: React.ReactNode;
};

export default function AuthClassicLayout({ children, image, title }: Props) {
  const { method } = useAuthContext();
  const theme = useTheme();
  const upMd = useResponsive('up', 'md');

  const renderLogo = (
    <Logo
      single={false}
      sx={{
        zIndex: 10,
        position: 'absolute',
        top: { xs: 24, md: 40 },
        left: { xs: 24, md: 40 },
        height: { xs: 32, md: 40 },
        width: 'auto',
      }}
    />
  );

  const renderContent = (
    <Stack
      sx={{
        width: 1,
        mx: 'auto',
        maxWidth: { xs: 1, md: 540 },
        px: { xs: 2, md: 10 },
        py: { xs: 10, md: 0 },
        justifyContent: 'center',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 2,
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          width: 1,
          animation: `${slideUp} 0.6s ease-out`,
        }}
      >
        {/* Mobile-only Hero Header */}
        {!upMd && (
          <Stack spacing={2} sx={{ mb: 6, textAlign: 'center' }}>
            <Box
              component="img"
              src="/assets/images/auth/trading-bg.png"
              sx={{
                width: 120,
                height: 'auto',
                mx: 'auto',
                borderRadius: 2,
                boxShadow: `0 12px 24px ${alpha(theme.palette.common.black, 0.1)}`,
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{title || 'Algo Solution'}</Typography>
          </Stack>
        )}
        {children}
      </Box>
    </Stack>
  );

  const renderSection = (
    <Stack
      flexGrow={1}
      sx={{
        bgcolor: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        borderRight: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
        p: 10,
        justifyContent: 'center',
      }}
    >
      {/* Soft Background Gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: `radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 40%), 
                       radial-gradient(circle at 80% 80%, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 40%)`,
        }}
      />

      <Stack spacing={8} sx={{ zIndex: 1, position: 'relative' }}>
        <Stack spacing={2}>
          <Typography variant="h2" sx={{
            fontWeight: 800,
            color: '#1C252E',
            fontSize: '3.5rem',
            lineHeight: 1.1,
            letterSpacing: -1.5,
          }}>
            Pure <span style={{ color: '#00a76f' }}>Intelligence.</span> <br />
            Zero Emotion.
          </Typography>
          <Typography variant="h6" sx={{ color: '#637381', fontWeight: 400, maxWidth: 480 }}>
            Institutional-grade algorithmic trading with sub-millisecond precision. Simple, powerful, and built for performance.
          </Typography>
        </Stack>

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 600,
          }}
        >
          {/* Shadow beneath the robot */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -40,
              left: '10%',
              right: '10%',
              height: 40,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, ${alpha(theme.palette.common.black, 0.08)} 0%, transparent 70%)`,
              zIndex: 0,
            }}
          />

          <Box
            component="img"
            alt="Trading Visual"
            src={image || '/assets/images/auth/trading-bg.png'}
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 4,
              zIndex: 1,
              position: 'relative',
              animation: `${float} 6s ease-in-out infinite`,
              boxShadow: `0 40px 80px -24px ${alpha(theme.palette.common.black, 0.16)}`,
            }}
          />
        </Box>

        <Stack direction="row" spacing={6}>
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '< 2ms', label: 'Latency' },
            { value: '256-bit', label: 'SSL' },
          ].map((stat) => (
            <Stack key={stat.label} spacing={0.5}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1C252E' }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ color: '#637381', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          position: 'absolute',
          bottom: 40,
          left: 80,
          color: 'text.disabled',
          opacity: 0.6
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00a76f' }} />
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>NETWORK SECURE // TRUSTIFYEE_ALGO_V5</Typography>
      </Stack>
    </Stack>
  );

  return (
    <Stack
      component="main"
      direction="row"
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {renderLogo}
      {upMd && renderSection}
      {renderContent}
    </Stack>
  );
}
