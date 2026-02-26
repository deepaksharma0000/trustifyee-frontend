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
        px: { xs: 2, md: 8 },
        py: { xs: 5, md: 0 },
        justifyContent: 'center',
        height: 1,
        maxHeight: '100vh',
        position: 'relative',
        zIndex: 2,
        bgcolor: '#ffffffcf !important',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          width: 1,
          animation: `${slideUp} 0.6s ease-out`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: 1
        }}
      >
        {/* Mobile-only Hero Header - Scaled down */}
        {!upMd && (
          <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
            <Box
              component="img"
              src="/assets/images/auth/trading-bg.png"
              sx={{
                width: 80,
                height: 'auto',
                mx: 'auto',
                borderRadius: 1.5,
              }}
            />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{title || 'Algo Solution'}</Typography>
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
        position: 'relative',
        overflow: 'hidden',
        borderRight: 'none',
        p: { md: 5, lg: 8 },
        justifyContent: 'center',
        alignItems: 'center',
        display: { xs: 'none', md: 'flex' },
        height: 1,
        maxHeight: '100vh',
        bgcolor: '#ffffffcf !important',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          zIndex: 1,
        }}
      >
        <Box
          component="img"
          alt="Trading Visual"
          src={image || '/assets/images/auth/trading-bg.png'}
          sx={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: 2,
          }}
        />
      </Box>
    </Stack>
  );

  return (
    <Stack
      component="main"
      direction="row"
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        bgcolor: '#ffffffcf !important',
      }}
    >
      {renderLogo}
      {upMd && renderSection}
      {renderContent}
    </Stack>
  );
}
