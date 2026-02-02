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

// Professional Trading Animations
const tickerScroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const priceFlash = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const dataStream = keyframes`
  0% { transform: translateY(-100%); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px ${alpha('#00ff88', 0.3)},
                inset 0 0 20px ${alpha('#00ff88', 0.1)}; 
  }
  50% { 
    box-shadow: 0 0 40px ${alpha('#00ff88', 0.5)},
                inset 0 0 30px ${alpha('#00ff88', 0.2)}; 
  }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(2deg); }
`;

const scanline = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
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

  // Mock trading data
  const tickerData = [
    { symbol: 'BTC/USD', price: '45,234.50', change: '+2.34%', trend: 'up' },
    { symbol: 'ETH/USD', price: '3,456.78', change: '+1.82%', trend: 'up' },
    { symbol: 'AAPL', price: '178.25', change: '+0.45%', trend: 'up' },
    { symbol: 'TSLA', price: '242.80', change: '+3.21%', trend: 'up' },
    { symbol: 'GOOGL', price: '141.50', change: '+0.89%', trend: 'up' },
    { symbol: 'MSFT', price: '378.91', change: '+1.23%', trend: 'up' },
  ];

  const renderLogo = (
    <Logo
      sx={{
        zIndex: 9,
        position: 'absolute',
        top: { xs: 24, md: 40 },
        left: { xs: 24, md: 40 },
        filter: 'drop-shadow(0 4px 12px rgba(0,255,136,0.4))',
      }}
    />
  );

  const renderContent = (
    <Stack
      sx={{
        width: 1,
        mx: 'auto',
        maxWidth: 480,
        px: { xs: 3, md: 5 },
        py: { xs: 12, md: 0 },
        justifyContent: 'center',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {children}
    </Stack>
  );

  const renderSection = (
    <Stack
      flexGrow={1}
      sx={{
        background: theme.palette.mode === 'light'
          ? `linear-gradient(135deg, #ffffff 0%, #f8fafb 50%, #ffffff 100%)`
          : `linear-gradient(135deg, #ffffff 0%, #f0f4f8 50%, #ffffff 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle Grid Background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${alpha('#00ff88', 0.04)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha('#00ff88', 0.04)} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Green Gradient Orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#00ff88', 0.08)} 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#00ff88', 0.06)} 0%, transparent 70%)`,
          filter: 'blur(70px)',
        }}
      />

      {/* Data Stream Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
        {[...Array(6)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              left: `${15 + i * 15}%`,
              width: '1px',
              height: '60px',
              background: `linear-gradient(to bottom, transparent, ${alpha('#00ff88', 0.3)}, transparent)`,
              animation: `${dataStream} ${4 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </Box>

      {/* Top Shimmer Line */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${alpha('#00ff88', 0.6)}, transparent)`,
          backgroundSize: '1000px 100%',
          animation: `${shimmer} 3s linear infinite`,
        }}
      />

      {/* Top Ticker Bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 50,
          background: alpha('#ffffff', 0.95),
          borderBottom: `2px solid ${alpha('#00ff88', 0.3)}`,
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
          zIndex: 2,
          boxShadow: `0 4px 20px ${alpha('#00ff88', 0.1)}`,
        }}
      >
        <Stack
          direction="row"
          spacing={4}
          sx={{
            height: '100%',
            alignItems: 'center',
            animation: `${tickerScroll} 30s linear infinite`,
            width: 'max-content',
            px: 2,
          }}
        >
          {[...tickerData, ...tickerData].map((ticker, index) => (
            <Stack
              key={index}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                minWidth: 'max-content',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: alpha('#000000', 0.7),
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              >
                {ticker.symbol}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              >
                {ticker.price}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#00ff88',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  animation: `${priceFlash} 2s ease-in-out infinite`,
                }}
              >
                {ticker.change}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Main Content Area */}
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          height: '100%',
          px: 4,
          pt: 10,
          pb: 6,
          zIndex: 1,
        }}
      >
        {/* Header Section */}
        <Stack spacing={3} alignItems="center" sx={{ mb: 6 }}>
          {/* Status Badge */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#00ff88',
                boxShadow: `0 0 12px ${alpha('#00ff88', 0.8)}`,
                animation: `${priceFlash} 1.5s ease-in-out infinite`,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: '#00ff88',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
              }}
            >
              SYSTEM ONLINE
            </Typography>
          </Stack>

          {/* Main Title */}
          <Typography
            variant="h2"
            sx={{
              color: '#000000',
              fontWeight: 800,
              textAlign: 'center',
              fontSize: { xs: '2rem', md: '2.75rem' },
              lineHeight: 1.2,
              fontFamily: '"Inter", "Roboto", sans-serif',
            }}
          >
            {title || 'Trustifyee '}
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: alpha('#000000', 0.6),
              fontWeight: 400,
              textAlign: 'center',
              maxWidth: 500,
              fontSize: { xs: '1rem', md: '1.1rem' },
              fontFamily: '"Inter", "Roboto", sans-serif',
            }}
          >
            Professional-Grade Trading Platform
          </Typography>
        </Stack>

        {/* Market Stats Dashboard */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            mb: 5,
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          {[
            { label: 'Market Cap', value: '$2.4T' },
            { label: '24h Volume', value: '$89.2B' },
            { label: 'Active Pairs', value: '1,247' },
            { label: 'Online Users', value: '12.5K' },
          ].map((stat, index) => (
            <Box
              key={index}
              sx={{
                position: 'relative',
                px: 3,
                py: 2,
                minWidth: 140,
                background: '#ffffff',
                border: `2px solid ${alpha('#00ff88', 0.25)}`,
                borderRadius: 2,
                boxShadow: `0 4px 20px ${alpha('#00ff88', 0.08)}`,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  border: `2px solid ${alpha('#00ff88', 0.6)}`,
                  background: alpha('#00ff88', 0.03),
                  boxShadow: `0 12px 40px ${alpha('#00ff88', 0.2)}`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(90deg, transparent, ${alpha('#00ff88', 0.1)}, transparent)`,
                  transition: 'left 0.5s',
                },
                '&:hover::before': {
                  left: '100%',
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: alpha('#000000', 0.5),
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  mb: 0.5,
                  fontFamily: 'monospace',
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: '#00ff88',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  textShadow: `0 2px 8px ${alpha('#00ff88', 0.3)}`,
                }}
              >
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Main Image with Terminal Frame */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 750,
            mb: 5,
          }}
        >
          {/* Terminal Window Header */}
          <Box
            sx={{
              position: 'absolute',
              top: -35,
              left: 0,
              right: 0,
              height: 35,
              background: '#ffffff',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              border: `2px solid ${alpha('#00ff88', 0.3)}`,
              borderBottom: 'none',
              display: 'flex',
              alignItems: 'center',
              px: 2,
              zIndex: 1,
              boxShadow: `0 -2px 10px ${alpha('#00ff88', 0.1)}`,
            }}
          >
            <Stack direction="row" spacing={1}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: alpha('#00ff88', 0.3) }} />
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: alpha('#00ff88', 0.5) }} />
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#00ff88' }} />
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: alpha('#000000', 0.5),
                ml: 2,
                fontFamily: 'monospace',
                fontSize: '0.7rem',
              }}
            >
              trading_terminal.exe
            </Typography>
          </Box>

          {/* Glowing Border Container */}
          <Box
            sx={{
              position: 'relative',
              border: `3px solid ${alpha('#00ff88', 0.4)}`,
              borderRadius: 2,
              overflow: 'hidden',
              background: '#ffffff',
              animation: `${pulseGlow} 3s ease-in-out infinite`,
              boxShadow: `0 10px 40px ${alpha('#00ff88', 0.15)}`,
            }}
          >
            {/* Corner Brackets */}
            {[
              { top: -2, left: -2, borderTop: true, borderLeft: true },
              { top: -2, right: -2, borderTop: true, borderRight: true },
              { bottom: -2, left: -2, borderBottom: true, borderLeft: true },
              { bottom: -2, right: -2, borderBottom: true, borderRight: true },
            ].map((corner, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: 25,
                  height: 25,
                  ...(corner.top !== undefined && { top: corner.top }),
                  ...(corner.bottom !== undefined && { bottom: corner.bottom }),
                  ...(corner.left !== undefined && { left: corner.left }),
                  ...(corner.right !== undefined && { right: corner.right }),
                  ...(corner.borderTop && { borderTop: `4px solid #00ff88` }),
                  ...(corner.borderBottom && { borderBottom: `4px solid #00ff88` }),
                  ...(corner.borderLeft && { borderLeft: `4px solid #00ff88` }),
                  ...(corner.borderRight && { borderRight: `4px solid #00ff88` }),
                  zIndex: 2,
                }}
              />
            ))}

            {/* Main Image */}
            <Box
              component="img"
              alt="Trading Platform"
              src={image || '/assets/images/auth/trading-bg.png'}
              sx={{
                width: '100%',
                height: 'auto',
                display: 'block',
                animation: `${float} 6s ease-in-out infinite`,
              }}
            />

            {/* Overlay Effect */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(180deg, transparent 0%, ${alpha('#00ff88', 0.03)} 50%, transparent 100%)`,
                pointerEvents: 'none',
              }}
            />
          </Box>

          {/* Floating Data Points */}
          {[
            { top: '10%', left: '-5%', value: '+2.4%' },
            { top: '30%', right: '-5%', value: '₿ 45K' },
            { bottom: '20%', left: '-3%', value: '↑ 12%' },
          ].map((point, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                ...(point.top && { top: point.top }),
                ...(point.bottom && { bottom: point.bottom }),
                ...(point.left && { left: point.left }),
                ...(point.right && { right: point.right }),
                px: 2,
                py: 1,
                background: '#ffffff',
                border: `2px solid ${alpha('#00ff88', 0.5)}`,
                borderRadius: 1,
                backdropFilter: 'blur(10px)',
                animation: `${float} ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
                boxShadow: `0 4px 15px ${alpha('#00ff88', 0.2)}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#00ff88',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  textShadow: `0 2px 8px ${alpha('#00ff88', 0.3)}`,
                }}
              >
                {point.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Feature Pills */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          {[
            'AI-Powered',
            'Real-Time Data',
            'Secure Trading',
            'Advanced Analytics',
            'Global Markets',
          ].map((feature, i) => (
            <Box
              key={i}
              sx={{
                px: 2.5,
                py: 1.2,
                background: alpha('#00ff88', 0.08),
                border: `2px solid ${alpha('#00ff88', 0.3)}`,
                borderRadius: 20,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: alpha('#00ff88', 0.15),
                  transform: 'translateY(-3px)',
                  boxShadow: `0 8px 25px ${alpha('#00ff88', 0.3)}`,
                  border: `2px solid ${alpha('#00ff88', 0.6)}`,
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#00ff88',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontFamily: 'monospace',
                }}
              >
                {feature}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>

      {/* Bottom Status Bar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          background: alpha('#ffffff', 0.95),
          borderTop: `2px solid ${alpha('#00ff88', 0.3)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          zIndex: 2,
          backdropFilter: 'blur(20px)',
          boxShadow: `0 -4px 20px ${alpha('#00ff88', 0.1)}`,
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#00ff88',
                animation: `${priceFlash} 1s ease-in-out infinite`,
                boxShadow: `0 0 8px ${alpha('#00ff88', 0.6)}`,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: alpha('#000000', 0.7),
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              Connected
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: alpha('#000000', 0.5),
              fontFamily: 'monospace',
              fontSize: '0.7rem',
            }}
          >
            Latency: 12ms
          </Typography>
        </Stack>
        <Typography
          variant="caption"
          sx={{
            color: alpha('#000000', 0.5),
            fontFamily: 'monospace',
            fontSize: '0.7rem',
          }}
        >
          © 2026 AlgoTrading Pro
        </Typography>
      </Box>

      {/* Bottom Glow Line */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${alpha('#00ff88', 0.6)}, transparent)`,
          backgroundSize: '1000px 100%',
          animation: `${shimmer} 3s linear infinite`,
        }}
      />
    </Stack>
  );

  return (
    <Stack
      component="main"
      direction="row"
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {renderLogo}
      {upMd && renderSection}
      {renderContent}
    </Stack>
  );
}