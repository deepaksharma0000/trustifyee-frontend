import { Helmet } from 'react-helmet-async';
// sections
import GroupServiceView from 'src/sections/product/view/group-service-view';

// ----------------------------------------------------------------------

export default function GroupServicePage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Group Service Management</title>
            </Helmet>

            <GroupServiceView />
        </>
    );
}
