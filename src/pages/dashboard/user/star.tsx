import { Helmet } from 'react-helmet-async';
// sections
import { UserStarView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

export default function UserStarPage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Star Clients</title>
            </Helmet>

            <UserStarView />
        </>
    );
}
