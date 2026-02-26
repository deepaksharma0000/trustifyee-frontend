import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';

// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { HOST_API } from 'src/config-global';

import { useBoolean } from 'src/hooks/use-boolean';

import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { varFade } from 'src/components/animate';

// ----------------------------------------------------------------------

type LoginFormValues = {
  email: string;
  password: string;
};

export default function ClassicLoginView() {
  const theme = useTheme();
  const password = useBoolean();
  const navigate = useNavigate();
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

  // ✅ Validation
  const LoginSchema = Yup.object().shape({
    email: Yup.string().required('Email is required'),
    password: Yup.string().required('Password is required'),
  });

  const methods = useForm<LoginFormValues>({
    resolver: yupResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // ✅ MAIN LOGIN HANDLER
  const onSubmit = handleSubmit(async (data) => {
    try {
      let result: any = null;

      // 1️⃣ TRY ADMIN LOGIN
      const adminRes = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (adminRes.ok) {
        const adminResult = await adminRes.json();
        if (adminResult?.data?.role === 'admin') {
          result = adminResult;
          localStorage.setItem('authToken', result.access.token);
          localStorage.setItem('authUser', JSON.stringify({ ...result.data, role: 'admin' }));
          navigate('/dashboard');
          return;
        }
      }

      // 2️⃣ TRY USER LOGIN
      const userRes = await fetch(`${API_BASE}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: data.email,
          password: data.password,
        }),
      });

      if (!userRes.ok) {
        throw new Error('Invalid username or password');
      }

      const userResult = await userRes.json();
      if (!userResult.status) {
        throw new Error(userResult.message || 'Login failed');
      }

      const userData = userResult.data;
      localStorage.setItem('authToken', userResult.access.token);
      localStorage.setItem('authUser', JSON.stringify({
        _id: userData._id,
        role: 'user',
        full_name: userData.full_name,
        user_name: userData.user_name,
        email: userData.email,
        licence: userData.licence,
        broker: userData.broker || '',
        trading_status: userData.trading_status,
        client_key: userData.client_key || '',
        api_key: userData.api_key || '',
        broker_connected: !!(userData.client_key && userData.client_key.length > 0)
      }));

      navigate('/dashboard');

    } catch (error: any) {
      console.error('Login error:', error.message);
      alert(error.message || 'Login failed');
    }
  });

  const renderHead = (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <m.div variants={varFade().inDown}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00cc70' }} />
          <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 1, fontWeight: 800, fontSize: 11 }}>
            Enterprise Security Verified
          </Typography>
        </Stack>
        <Typography variant="h3" sx={{
          fontWeight: 800,
          letterSpacing: -1,
          lineHeight: 1.1,
          color: '#1C252E',
          fontSize: { md: '2.2rem', lg: '2.8rem' }
        }}>
          Pure <span style={{ color: '#00a76f' }}>Intelligence.</span> <br />
          Zero Emotion.
        </Typography>
      </m.div>

      <m.div variants={varFade().inDown}>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380, lineHeight: 1.4, fontWeight: 500 }}>
          Experience institutional-grade algorithmic trading with sub-millisecond precision.
        </Typography>
      </m.div>

      <m.div variants={varFade().inDown}>
        <Stack direction="row" spacing={3} sx={{ mt: 0.5 }}>
          {[
            { value: '99.9%', label: 'Uptime', icon: 'solar:bolt-bold-duotone' },
            { value: '< 2ms', label: 'Latency', icon: 'solar:stopwatch-bold-duotone' },
          ].map((stat) => (
            <Stack key={stat.label} direction="row" alignItems="center" spacing={1}>
              <Iconify icon={stat.icon} width={18} sx={{ color: '#00cc70' }} />
              <Stack spacing={0}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{stat.value}</Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', fontWeight: 800, fontSize: 8, letterSpacing: 0.5 }}>{stat.label}</Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </m.div>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2}>
      <m.div variants={varFade().inUp}>
        <RHFTextField
          name="email"
          label="Identifier"
          placeholder="Email or Username"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-id-bold-duotone" width={22} sx={{ color: '#00cc70' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#ffffffcf',
              borderRadius: 1,
              '&.Mui-focused': {
                bgcolor: '#ffffffcf',
                boxShadow: `0 0 0 2px ${alpha('#00cc70', 0.1)}`,
              }
            }
          }}
        />
      </m.div>

      <m.div variants={varFade().inUp}>
        <RHFTextField
          name="password"
          label="Security Key"
          placeholder="Enter password"
          type={password.value ? 'text' : 'password'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:key-square-bold-duotone" width={22} sx={{ color: '#00cc70' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={password.onToggle} edge="end" size="small" sx={{ color: 'text.disabled' }}>
                  <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#ffffffcf',
              borderRadius: 1,
              '&.Mui-focused': {
                bgcolor: '#ffffffcf',
                boxShadow: `0 0 0 2px ${alpha('#00cc70', 0.1)}`,
              }
            }
          }}
        />
      </m.div>

      <m.div variants={varFade().inUp} style={{ textAlign: 'right', marginTop: 4 }}>
        <Link
          component={RouterLink}
          href={paths.authDemo.classic.forgotPassword}
          variant="caption"
          color="text.disabled"
          sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, '&:hover': { color: '#00cc70' } }}
        >
          Recover Access?
        </Link>
      </m.div>

      <m.div variants={varFade().inUp}>
        <LoadingButton
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting}
          sx={{
            py: 1.5,
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 1,
            bgcolor: '#00a76f',
            color: '#fff',
            '&:hover': {
              bgcolor: '#008b5c',
              boxShadow: `0 12px 24px ${alpha('#00a76f', 0.2)}`,
            }
          }}
        >
          Sign In to Terminal
        </LoadingButton>
      </m.div>
    </Stack>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Box
        component={m.div}
        initial="initial"
        animate="animate"
        variants={{
          animate: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {renderHead}
        {renderForm}

        <m.div variants={varFade().inUp}>
          <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 4, mb: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>New user?</Typography>
            <Link component={RouterLink} href={paths.authDemo.classic.register} variant="subtitle2" sx={{ color: '#00cc70' }}>
              Create an account
            </Link>
          </Stack>
        </m.div>

        <m.div variants={varFade().inUp}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: 'text.disabled',
              fontFamily: 'monospace',
              fontWeight: 600,
              letterSpacing: 1,
              opacity: 0.6,
              fontSize: 10
            }}
          >
            NETWORK SECURE // FINVESTA_ALGO_V5
          </Typography>
        </m.div>
      </Box>
    </FormProvider>
  );
}
