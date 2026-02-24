import { Helmet } from 'react-helmet-async';
import { TicketsView } from 'src/sections/tickets/view';

// ----------------------------------------------------------------------

export default function TicketsPage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Tickets | Finvesta</title>
            </Helmet>

            <TicketsView />
        </>
    );
}
