import { Helmet } from 'react-helmet-async';
// sections
import MarketAnalysisView from 'src/sections/market-analysis/view/market-analysis-view';

// ----------------------------------------------------------------------

export default function MarketAnalysisPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Market Analysis | Trustifye</title>
      </Helmet>

      <MarketAnalysisView />
    </>
  );
}
