import { Helmet } from 'react-helmet-async';
import { MessageCenterView } from 'src/sections/message-center/view';

// ----------------------------------------------------------------------

export default function MessageCenterPage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Message Center | Finvesta</title>
            </Helmet>

            <MessageCenterView />
        </>
    );
}
