import { Helmet } from 'react-helmet-async';
// sections
import BrokerResponseView from 'src/sections/broker-response/view/broker-response-view';

// ----------------------------------------------------------------------

export default function BrokerResponsePage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Broker Response</title>
            </Helmet>

            <BrokerResponseView />
        </>
    );
}
