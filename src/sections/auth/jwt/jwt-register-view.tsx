import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { m } from 'framer-motion';

// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useSearchParams, useRouter } from 'src/routes/hooks';
// config
import { PATH_AFTER_LOGIN } from 'src/config-global';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { varFade } from 'src/components/animate';

// ----------------------------------------------------------------------

export default function JwtRegisterView() {
  const theme = useTheme();
  const { register } = useAuthContext();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const password = useBoolean();

  const RegisterSchema = Yup.object().shape({
    firstName: Yup.string().required('First name required'),
    lastName: Yup.string().required('Last name required'),
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
    password: Yup.string().required('Password is required'),
  });

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };

  const methods = useForm({
    resolver: yupResolver(RegisterSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await register?.(data.email, data.password, data.firstName, data.lastName);
      router.push(returnTo || PATH_AFTER_LOGIN);
    } catch (error) {
      console.error(error);
      reset();
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  const renderHead = (
    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
      <m.div variants={varFade().inDown}>
        <Typography variant="h3" sx={{
          fontWeight: 800,
          letterSpacing: -0.5,
          lineHeight: 1.1,
          color: '#1C252E',
          fontSize: { md: '2.2rem', lg: '2.8rem' }
        }}>
          Begin Your <span style={{ color: '#00a76f' }}>Journey.</span>
        </Typography>
      </m.div>

      <m.div variants={varFade().inDown}>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380, lineHeight: 1.4, fontWeight: 500 }}>
          Create your account for institutional-grade algorithmic trading.
        </Typography>
      </m.div>
    </Stack>
  );

  const renderTerms = (
    <m.div variants={varFade().inUp}>
      <Typography
        component="div"
        sx={{
          color: 'text.secondary',
          mt: 1.5,
          typography: 'caption',
          textAlign: 'center',
          lineHeight: 1.2
        }}
      >
        {'By signing up, I agree to '}
        <Link underline="always" color="inherit" sx={{ fontWeight: 700 }}>
          Terms
        </Link>
        {' and '}
        <Link underline="always" color="inherit" sx={{ fontWeight: 700 }}>
          Privacy
        </Link>
        .
      </Typography>
    </m.div>
  );

  const renderForm = (
    <Stack spacing={1.5}>
      {!!errorMsg && <Alert severity="error" sx={{ py: 0 }}>{errorMsg}</Alert>}

      <m.div variants={varFade().inUp}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RHFTextField name="firstName" label="First name" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffffcf', borderRadius: 1 } }} />
          <RHFTextField name="lastName" label="Last name" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffffcf', borderRadius: 1 } }} />
        </Stack>
      </m.div>

      <m.div variants={varFade().inUp}>
        <RHFTextField
          name="email"
          label="Email address"
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffffcf', borderRadius: 1 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:letter-bold-duotone" width={22} sx={{ color: '#00cc70' }} />
              </InputAdornment>
            ),
          }}
        />
      </m.div>

      <m.div variants={varFade().inUp}>
        <RHFTextField
          name="password"
          label="Password"
          type={password.value ? 'text' : 'password'}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffffcf', borderRadius: 1 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:lock-password-bold-duotone" width={22} sx={{ color: '#00cc70' }} />
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
        />
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
              boxShadow: `0 8px 16px ${alpha('#00a76f', 0.2)}`,
            }
          }}
        >
          Create My Account
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
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: 1
        }}
      >
        {renderHead}
        {renderForm}
        {renderTerms}

        <m.div variants={varFade().inUp}>
          <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 1.5, mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>Already have an account?</Typography>
            <Link component={RouterLink} href={paths.auth.jwt.login} variant="subtitle2" sx={{ color: '#00cc70', fontSize: 13 }}>
              Sign in
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
              opacity: 0.5,
              fontSize: 9
            }}
          >
            NETWORK SECURE // FINVESTA_ALGO_V5
          </Typography>
        </m.div>
      </Box>
    </FormProvider>
  );
}
