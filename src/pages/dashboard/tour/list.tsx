import { Helmet } from 'react-helmet-async';
// sections
import { TourListView } from 'src/sections/tour/view';

// ----------------------------------------------------------------------

export default function TourListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: T L</title>
      </Helmet>

      <TourListView />
    </>
  );
}
