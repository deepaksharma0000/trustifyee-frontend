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
        role: 'user',
        full_name: userData.full_name,
        user_name: userData.user_name,
        email: userData.email,
        licence: userData.licence,
        broker: userData.broker || '',
        trading_status: userData.trading_status,
        broker_connected: false
      }));

      navigate('/dashboard');

    } catch (error: any) {
      console.error('Login error:', error.message);
      alert(error.message || 'Login failed');
    }
  });

  const renderHead = (
    <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
      <m.div variants={varFade().inDown}>
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
          Welcome back
        </Typography>
      </m.div>

      <m.div variants={varFade().inDown}>
        <Stack direction="row" spacing={0.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>New user?</Typography>
          <Link component={RouterLink} href={paths.authDemo.classic.register} variant="subtitle2" sx={{ color: '#00cc70' }}>
            Create an account
          </Link>
        </Stack>
      </m.div>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={3}>
      <m.div variants={varFade().inUp}>
        <RHFTextField
          name="email"
          label="Email or Username"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-bold-duotone" width={24} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: alpha(theme.palette.grey[500], 0.04),
            }
          }}
        />
      </m.div>

      <m.div variants={varFade().inUp}>
        <RHFTextField
          name="password"
          label="Password"
          type={password.value ? 'text' : 'password'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:lock-password-bold-duotone" width={24} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={password.onToggle} edge="end">
                  <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: alpha(theme.palette.grey[500], 0.04),
            }
          }}
        />
      </m.div>

      <m.div variants={varFade().inUp}>
        <Link
          component={RouterLink}
          href={paths.authDemo.classic.forgotPassword}
          variant="body2"
          color="inherit"
          underline="always"
          sx={{ alignSelf: 'flex-end', display: 'block', mb: 1 }}
        >
          Forgot password?
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
            borderRadius: 1.5,
            bgcolor: '#00a76f',
            color: '#fff',
            '&:hover': {
              bgcolor: '#008b5c',
              boxShadow: `0 8px 16px ${alpha('#00a76f', 0.24)}`,
            }
          }}
        >
          Unlock Terminal
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
          <Typography
            variant="caption"
            sx={{
              mt: 5,
              display: 'block',
              textAlign: 'center',
              color: 'text.disabled',
            }}
          >
            Institutional grade security enabled. All sessions are encrypted.
          </Typography>
        </m.div>
      </Box>
    </FormProvider>
  );
}
