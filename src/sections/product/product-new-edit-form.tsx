import * as Yup from 'yup';
import { useMemo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

// @mui
import {
  Paper,
  Stack,
  Grid,
  Typography,
  Divider,
  Button,
  useTheme,
  MenuItem,
} from '@mui/material';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';

// hooks
import { useResponsive } from 'src/hooks/use-responsive';
import { useRouter } from 'src/routes/hooks';
import { useSnackbar } from 'src/components/snackbar';

// hook-form components
import FormProvider, { RHFTextField, RHFSelect } from 'src/components/hook-form';

// types
import { IProductItem } from 'src/types/product';

// ----------------------------------------------------------------------

interface IProductItemWithSegment extends IProductItem {
  segment?: string;
}

type Props = {
  currentProduct?: IProductItemWithSegment;
};

const NewProductSchema = Yup.object({
  strategy_name: Yup.string().required('Strategy Name is required'),
  strategy_description: Yup.string().default(''),
  segment: Yup.string().required('Segment is required'),
});

type ProductFormValues = Yup.InferType<typeof NewProductSchema>;

export default function ProductNewEditForm({ currentProduct }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const mdUp = useResponsive('up', 'md');
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  // -------------------- DEFAULT VALUES --------------------
  const defaultValues = useMemo(
    () => ({
      strategy_name: currentProduct?.name || '',
      strategy_description: currentProduct?.subDescription || '',
      segment: currentProduct?.segment || '',
    }),
    [currentProduct]
  );

  const methods = useForm<ProductFormValues>({
    resolver: yupResolver(NewProductSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentProduct) reset(defaultValues);
  }, [currentProduct, defaultValues, reset]);

  // -------------------- SUBMIT --------------------
  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/strategy/add-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed');

      await response.json();

      reset();
      enqueueSnackbar(
        currentProduct ? 'Strategy updated successfully!' : 'Strategy created successfully!'
      );
      router.push('/');
    } catch (error) {
      enqueueSnackbar('An error occurred. Please try again.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  });

  // -------------------- SIDEBAR INFO --------------------
  const SidebarInfo = () => (
    <Paper
      elevation={3}
      sx={{
        position: mdUp ? 'sticky' : 'static',
        top: mdUp ? theme.spacing(10) : 'auto',
        p: 3,
        borderRadius: 2,
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Strategy Details
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Fields marked with * are required.
      </Typography>
    </Paper>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={4}>
        {mdUp && (
          <Grid md={4}>
            <SidebarInfo />
          </Grid>
        )}

        <Grid xs={12} md={8}>
          <Paper elevation={6} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
            {!mdUp && <CardHeader title="Strategy Details" sx={{ pb: 2 }} />}

            <Stack spacing={4}>
              <RHFTextField
                name="strategy_name"
                label="Strategy Name *"
                placeholder="Enter Strategy Name"
                sx={{
                  '& .MuiInputBase-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 6px ${theme.palette.primary.light}`,
                    },
                  },
                }}
              />

              <RHFTextField
                name="strategy_description"
                label="Strategy Description"
                placeholder="Briefly describe your strategy"
                multiline
                rows={3}
                sx={{
                  '& .MuiInputBase-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 6px ${theme.palette.primary.light}`,
                    },
                  },
                }}
              />

              <RHFSelect
                name="segment"
                label="Select Segment *"
                sx={{
                  '& .MuiInputBase-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 6px ${theme.palette.primary.light}`,
                    },
                  },
                }}
              >
                <MenuItem value="">
                  <em>Please Select Segment</em>
                </MenuItem>
                <MenuItem value="C">CASH</MenuItem>
                <MenuItem value="F">FUTURE</MenuItem>
                <MenuItem value="O">OPTION</MenuItem>
                <MenuItem value="MF">MCX FUTURE</MenuItem>
                <MenuItem value="MO">MCX OPTION</MenuItem>
                <MenuItem value="CO">CURRENCY OPTION</MenuItem>
                <MenuItem value="CF">CURRENCY FUTURE</MenuItem>
                <MenuItem value="FO">FUTURE OPTION</MenuItem>
                <MenuItem value="BC">BSE CASH</MenuItem>
                <MenuItem value="BF">BSE FUTURE</MenuItem>
                <MenuItem value="BO">BSE OPTION</MenuItem>
                <MenuItem value="BFO">BSE FUTURE OPTION</MenuItem>
              </RHFSelect>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="flex-end"
                sx={{ pt: 2 }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => reset(defaultValues)}
                  disabled={loading || isSubmitting}
                >
                  Reset
                </Button>

                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={loading || isSubmitting}
                  loadingIndicator="Saving..."
                >
                  {currentProduct ? 'Update Strategy' : 'Create Strategy'}
                </LoadingButton>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
