import { Helmet } from 'react-helmet-async';
// sections
import HelpCenterView from 'src/sections/help-center/view/help-center-view';

// ----------------------------------------------------------------------

export default function HelpCenterPage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Help Center</title>
            </Helmet>

            <HelpCenterView />
        </>
    );
}
