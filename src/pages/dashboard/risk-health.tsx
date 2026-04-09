import { Helmet } from 'react-helmet-async';
// sections
import RiskHealthView from 'src/sections/risk-health/view/risk-health-view';

// ----------------------------------------------------------------------

export default function RiskHealthPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Risk Health | Pandit Algo</title>
      </Helmet>

      <RiskHealthView />
    </>
  );
}
