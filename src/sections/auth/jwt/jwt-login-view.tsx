import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';

// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

import { useBoolean } from 'src/hooks/use-boolean';

import Iconify from 'src/components/iconify';


import { BACKEND_API } from 'src/config-global';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

type LoginFormValues = {
  email: string;
  password: string;
};

export default function ClassicLoginView() {
  const password = useBoolean();
  const navigate = useNavigate();

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

      // ===============================
      // 1️⃣ TRY ADMIN LOGIN FIRST
      // ===============================
      const adminRes = await fetch(`${BACKEND_API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (adminRes.ok) {
        const adminResult = await adminRes.json();

        // ✅ CONFIRM ADMIN ROLE FROM DB
        if (adminResult?.data?.role === 'admin') {
          result = adminResult;

          localStorage.setItem('authToken', result.access.token);
          localStorage.setItem(
            'authUser',
            JSON.stringify({
              ...result.data,
              role: 'admin',
            })
          );

          console.log('✅ Admin logged in');

          navigate('/dashboard');
          return;
        }
      }

      // ===============================
      // 2️⃣ IF NOT ADMIN → TRY USER LOGIN
      // ===============================
      const userRes = await fetch(`${BACKEND_API}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: data.email, // 👈 same input field reuse
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

      // ✅ USER LOGIN SUCCESS
      const userData = userResult.data;

      localStorage.setItem('authToken', userResult.access.token);

      localStorage.setItem(
        'authUser',
        JSON.stringify({
          // ❗ role sirf internal use ke liye
          role: 'user',

          // basic identity
          full_name: userData.full_name,
          user_name: userData.user_name,
          email: userData.email,

          // 🔥 algo trading control fields
          licence: userData.licence,               // Live | Demo
          broker: userData.broker || '',            // AngelOne / empty
          trading_status: userData.trading_status,  // enabled | disabled

          // temporary logic (jab tak backend flag na ho)
          // broker_connected: !!userData.broker,
          broker_connected: false

        })
      );


      console.log('✅ User logged in');

      navigate('/dashboard');

    } catch (error: any) {
      console.error('Login error:', error.message);
      alert(error.message || 'Login failed');
    }
  });


  // ----------------------------------------------------------------------

  const renderHead = (
    <Stack spacing={2} sx={{ mb: 5 }}>
      <Typography variant="h4">Sign in to Trustify Algo Solution</Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2">New user?</Typography>
        <Link
          component={RouterLink}
          href={paths.authDemo.classic.register}
          variant="subtitle2"
        >
          Create an account
        </Link>
      </Stack>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2.5}>
      <RHFTextField name="email" label="Email" />

      <RHFTextField
        name="password"
        label="Password"
        type={password.value ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={password.onToggle} edge="end">
                <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Link
        component={RouterLink}
        href={paths.authDemo.classic.forgotPassword}
        variant="body2"
        color="inherit"
        underline="always"
        sx={{ alignSelf: 'flex-end' }}
      >
        Forgot password?
      </Link>

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
      >
        Login
      </LoadingButton>
    </Stack>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      {renderHead}
      {renderForm}
    </FormProvider>
  );
}
