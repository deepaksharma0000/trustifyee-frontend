import { Helmet } from 'react-helmet-async';
// sections
import ApiInfoView from 'src/sections/api-info/view/api-info-view';

// ----------------------------------------------------------------------

export default function ApiInfoPage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: Api Info | Trustifyee</title>
            </Helmet>

            <ApiInfoView />
        </>
    );
}
