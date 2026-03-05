import { Helmet } from 'react-helmet-async';
import { Container, Typography } from '@mui/material';
import SubscriptionRequestListView from 'src/sections/subscription/view/subscription-request-list-view';

export default function SubscriptionRequestsPage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Subscription Requests</title>
            </Helmet>

            <Container maxWidth="xl">
                <Typography variant="h4" sx={{ mb: 5 }}>
                    Subscription Upgrade Requests
                </Typography>

                <SubscriptionRequestListView />
            </Container>
        </>
    );
}
