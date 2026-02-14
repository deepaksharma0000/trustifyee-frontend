import { Helmet } from 'react-helmet-async';
import ApiCreateView from 'src/sections/api-create/view/api-create-view';

export default function ApiCreatePage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: API Info</title>
            </Helmet>

            <ApiCreateView />
        </>
    );
}
