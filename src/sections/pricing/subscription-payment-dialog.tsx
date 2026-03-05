import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Stack,
    TextField,
    Box,
    Divider,
    Alert,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { HOST_API } from 'src/config-global';
import Iconify from 'src/components/iconify';

type Props = {
    open: boolean;
    onClose: VoidFunction;
    plan: {
        subscription: string;
        price: number;
        duration: number;
    } | null;
};

export default function SubscriptionPaymentDialog({ open, onClose, plan }: Props) {
    const { enqueueSnackbar } = useSnackbar();
    const [step, setStep] = useState(1);
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);

    if (!plan) return null;

    const upiId = "0820akash@ybl"; // User should replace this with their real UPI ID
    const upiUrl = `upi://pay?pa=${upiId}&pn=AlgoTrading&am=${plan.price}&cu=INR&tn=Subscription_${plan.subscription}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

    const handleSubmit = async () => {
        if (!transactionId) {
            enqueueSnackbar('Please enter Transaction ID', { variant: 'error' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(`${HOST_API}/api/subscriptions/submit`, {
                planId: plan.subscription.toLowerCase(),
                planName: plan.subscription,
                amount: plan.price,
                durationMonths: plan.duration,
                transactionId,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.ok) {
                enqueueSnackbar('Request submitted! Admin will verify and activate your account.', { variant: 'success', autoHideDuration: 6000 });
                onClose();
                setStep(1);
                setTransactionId('');
            }
        } catch (error: any) {
            enqueueSnackbar(error.response?.data?.message || 'Submission failed', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                {step === 1 ? 'Upgrade to Live Plan' : 'Enter Payment Details'}
            </DialogTitle>

            <DialogContent>
                {step === 1 ? (
                    <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
                        <Alert severity="info" sx={{ width: '100%' }}>
                            Scan the QR code below using any UPI App (GPay, PhonePe, Paytm) to pay <strong>₹{plan.price}</strong> for the <strong>{plan.subscription}</strong>.
                        </Alert>

                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #eee' }}>
                            <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: 220, height: 220 }} />
                        </Box>

                        <Typography variant="subtitle1" fontWeight="bold">
                            Payable Amount: ₹{plan.price}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                            <Iconify icon="mdi:upi" width={24} />
                            <Typography variant="caption">UPI ID: {upiId}</Typography>
                        </Stack>
                    </Stack>
                ) : (
                    <Stack spacing={3} sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            After successful payment, please enter the 12-digit UPI Transaction ID (UTR Number) below for verification.
                        </Typography>

                        <TextField
                            fullWidth
                            label="UPI Transaction ID / UTR"
                            placeholder="e.g. 123456789012"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            inputProps={{ maxLength: 16 }}
                        />

                        <Alert severity="warning">
                            Incorrect details may lead to rejection. Verification takes 10-30 minutes during market hours.
                        </Alert>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button color="inherit" onClick={onClose}>Cancel</Button>
                {step === 1 ? (
                    <Button variant="contained" onClick={() => setStep(2)}>I have paid</Button>
                ) : (
                    <LoadingButton variant="contained" onClick={handleSubmit} loading={loading}>Submit for Verification</LoadingButton>
                )}
            </DialogActions>
        </Dialog>
    );
}
