import { Helmet } from 'react-helmet-async';
// sections
import MarketIntelligenceView from 'src/sections/market-intelligence/view/market-intelligence-view';

// ----------------------------------------------------------------------

export default function MarketIntelligencePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Market Intelligence | Trustifye</title>
      </Helmet>

      <MarketIntelligenceView />
    </>
  );
}
