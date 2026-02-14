import { Helmet } from 'react-helmet-async';
import FaqView from 'src/sections/faq/view/faq-view';

export default function FaqPage() {
    return (
        <>
            <Helmet>
                <title> Dashboard: FAQ</title>
            </Helmet>

            <FaqView />
        </>
    );
}
