import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// @mui
import {
  Modal,
  Box,
  Typography,
  Button,
  Stack,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
// hooks
import { useAuthContext } from 'src/auth/hooks';
import { useResponsive } from 'src/hooks/use-responsive';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const INACTIVITY_LIMIT = 5 * 60; // 5 minutes in seconds
const WARNING_LAPTOP = 60; // 1 minute warning for desktop/laptop
const WARNING_MOBILE = 30; // 30 seconds warning for mobile

// ----------------------------------------------------------------------

export default function InactivityTimer() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const isMobile = useResponsive('down', 'sm');

  const [counter, setCounter] = useState(INACTIVITY_LIMIT);
  const [openModal, setOpenModal] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const warningThreshold = isMobile ? WARNING_MOBILE : WARNING_LAPTOP;

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/auth/jwt/login');
    } catch (error) {
      console.error(error);
    }
  }, [logout, navigate]);

  const resetTimer = useCallback(() => {
    setCounter(INACTIVITY_LIMIT);
    if (openModal) {
      setOpenModal(false);
    }
  }, [openModal]);

  useEffect(() => {
    const handleEvents = () => resetTimer();

    window.addEventListener('mousemove', handleEvents);
    window.addEventListener('keypress', handleEvents);
    window.addEventListener('scroll', handleEvents);
    window.addEventListener('mousedown', handleEvents);
    window.addEventListener('touchstart', handleEvents);

    return () => {
      window.removeEventListener('mousemove', handleEvents);
      window.removeEventListener('keypress', handleEvents);
      window.removeEventListener('scroll', handleEvents);
      window.removeEventListener('mousedown', handleEvents);
      window.removeEventListener('touchstart', handleEvents);
    };
  }, [resetTimer]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCounter((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleLogout]);

  useEffect(() => {
    if (counter <= warningThreshold) {
      setOpenModal(true);
    } else {
      setOpenModal(false);
    }
  }, [counter, warningThreshold]);

  const progressValue = (counter / warningThreshold) * 100;

  return (
    <Modal
      open={openModal}
      onClose={(event, reason) => {
        if (reason && reason === 'backdropClick') return;
        setOpenModal(false);
      }}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(10px)',
            backgroundColor: alpha(theme.palette.grey[900], 0.7),
          },
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '94%',
          maxWidth: 440,
          bgcolor: 'background.paper',
          borderRadius: 2.5,
          boxShadow: theme.customShadows?.z24 || theme.shadows[24],
          p: 0,
          overflow: 'hidden',
          textAlign: 'center',
          animation: 'modalSlideUp 0.3s ease-out',
          '@keyframes modalSlideUp': {
            '0%': { transform: 'translateY(20px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        }}
      >
        {/* Header/Banner with Warning Icon */}
        <Box
          sx={{
            py: 4,
            px: 3,
            background: `linear-gradient(to bottom, ${alpha(theme.palette.warning.lighter || '#FFF7CD', 0.5)}, #FFFFFF)`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.warning.main, 0.12),
              color: theme.palette.warning.main,
              mx: 'auto',
              mb: 2,
            }}
          >
            <Iconify icon="solar:clock-circle-bold-duotone" width={36} />
          </Box>
          <Typography variant="h5" fontWeight="800" sx={{ color: theme.palette.text.primary, letterSpacing: -0.5 }}>
            Security Timeout
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            Session security verification in progress
          </Typography>
        </Box>

        {/* Dynamic Countdown Section */}
        <Box sx={{ p: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, mb: 3 }}>
              You will be automatically logged out due to inactivity in:
            </Typography>
            
            <Box sx={{ 
              display: 'inline-flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 120,
              py: 2,
              px: 4,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.grey[100], 0.6),
              border: `1px dashed ${theme.palette.divider}`,
              position: 'relative'
            }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 800, 
                  color: counter <= 10 ? theme.palette.error.main : theme.palette.primary.main,
                  fontFamily: 'monospace',
                  lineHeight: 1
                }}
              >
                {counter < 10 ? `0${counter}` : counter}
              </Typography>
              <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 700, mt: 0.5 }}>
                seconds left
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={resetTimer}
              sx={{
                py: 1.5,
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 16px 0 ${alpha(theme.palette.primary.main, 0.25)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.dark} 100%)`,
                }
              }}
            >
              Extend My Session
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              color="error"
              size="large"
              onClick={handleLogout}
              sx={{
                py: 1.5,
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 1.5,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.05),
                }
              }}
            >
              Logout Now
            </Button>
          </Stack>
        </Box>

        {/* Bottom Progress Bar Indicator */}
        <Box sx={{ 
          height: 6, 
          width: '100%', 
          bgcolor: theme.palette.divider, 
          position: 'relative' 
        }}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              bgcolor: counter <= 10 ? theme.palette.error.main : theme.palette.primary.main,
              transition: 'width 1s linear',
              width: `${(counter / warningThreshold) * 100}%`,
            }}
          />
        </Box>
      </Box>
    </Modal>
  );
}
