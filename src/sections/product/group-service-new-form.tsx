import * as Yup from 'yup';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import {
    Box,
    Card,
    Grid,
    Stack,
    Button,
    MenuItem,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField, RHFSelect } from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

const SEGMENT_OPTIONS = [
    { value: 'NIFTY', label: 'NIFTY' },
    { value: 'BANKNIFTY', label: 'BANKNIFTY' },
    { value: 'FINNIFTY', label: 'FINNIFTY' },
    { value: 'SENSEX', label: 'SENSEX' },
    { value: 'C', label: 'CASH' },
    { value: 'F', label: 'FUTURE' },
    { value: 'O', label: 'OPTION' },
    { value: 'MF', label: 'MCX FUTURE' },
    { value: 'MO', label: 'MCX OPTION' },
    { value: 'CO', label: 'CURRENCY OPTION' },
    { value: 'CF', label: 'CURRENCY FUTURE' },
    { value: 'FO', label: 'FUTURE OPTION' },
];

const BROKER_OPTIONS = [
    { value: 'ANGELONE', label: 'ANGELONE' },
    { value: 'ZERODHA', label: 'ZERODHA' },
    { value: 'UPSTOX', label: 'UPSTOX' },
    { value: 'ALICEBLUE', label: 'ALICEBLUE' },
];

type Props = {
    onSuccess: () => void;
};

export default function GroupServiceNewForm({ onSuccess }: Props) {
    const { enqueueSnackbar } = useSnackbar();

    const [services, setServices] = useState<any[]>([]);

    const NewGroupSchema = Yup.object().shape({
        name: Yup.string().required('Group Name is required'),
    });

    const defaultValues = {
        name: '',
    };

    const methods = useForm({
        resolver: yupResolver(NewGroupSchema),
        defaultValues,
    });

    const {
        reset,
        handleSubmit,
        formState: { isSubmitting },
    } = methods;

    const handleAddService = () => {
        setServices([
            ...services,
            {
                service_id: Math.random().toString(36).substr(2, 9),
                name: 'ANGELONE',
                segment: 'NIFTY',
                group_qty: 1,
                lotsize: '25',
                product_type: 1,
            },
        ]);
    };

    const handleRemoveService = (index: number) => {
        const newServices = [...services];
        newServices.splice(index, 1);
        setServices(newServices);
    };

    const handleServiceChange = (index: number, field: string, value: any) => {
        const newServices = [...services];
        newServices[index][field] = value;
        setServices(newServices);
    };

    const onSubmit = handleSubmit(async (data) => {
        try {
            const payload = {
                groupdetails: { name: data.name },
                services_id: services,
            };

            const res = await fetch(`${HOST_API}/api/group/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': localStorage.getItem('authToken') || '',
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (json.status) {
                enqueueSnackbar('Group successfully added!');
                reset();
                setServices([]);
                onSuccess();
            } else {
                enqueueSnackbar(json.message || 'Error adding group', { variant: 'error' });
            }
        } catch (error) {
            enqueueSnackbar('Server error', { variant: 'error' });
        }
    });

    return (
        <FormProvider methods={methods} onSubmit={onSubmit}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card sx={{ p: 3 }}>
                        <Stack spacing={3}>
                            <RHFTextField name="name" label="Group Name *" placeholder="Enter Group Name (e.g. Admin, FINVES)" />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1">Assign Services & Segments</Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<Iconify icon="mingcute:add-line" />}
                                    onClick={handleAddService}
                                >
                                    Add Service Line
                                </Button>
                            </Box>

                            {services.length > 0 && (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Broker</TableCell>
                                                <TableCell>Segment</TableCell>
                                                <TableCell>Qty</TableCell>
                                                <TableCell>Lot Size</TableCell>
                                                <TableCell>Type</TableCell>
                                                <TableCell align="right">Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {services.map((service, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <select
                                                            value={service.name}
                                                            onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        >
                                                            {BROKER_OPTIONS.map((opt) => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <select
                                                            value={service.segment}
                                                            onChange={(e) => handleServiceChange(index, 'segment', e.target.value)}
                                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        >
                                                            <option value="">Please Select Segment</option>
                                                            {SEGMENT_OPTIONS.map((opt) => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <input
                                                            type="number"
                                                            value={service.group_qty}
                                                            onChange={(e) => handleServiceChange(index, 'group_qty', Number(e.target.value))}
                                                            style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <input
                                                            type="text"
                                                            value={service.lotsize}
                                                            onChange={(e) => handleServiceChange(index, 'lotsize', e.target.value)}
                                                            style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <select
                                                            value={service.product_type}
                                                            onChange={(e) => handleServiceChange(index, 'product_type', Number(e.target.value))}
                                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        >
                                                            <option value={1}>Intraday</option>
                                                            <option value={2}>Carry Forward</option>
                                                        </select>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton color="error" onClick={() => handleRemoveService(index)}>
                                                            <Iconify icon="solar:trash-bin-trash-bold" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                                    Add Group
                                </LoadingButton>
                            </Stack>
                        </Stack>
                    </Card>
                </Grid>
            </Grid>
        </FormProvider>
    );
}
