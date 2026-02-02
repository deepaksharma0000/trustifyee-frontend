import { Helmet } from 'react-helmet-async';
// sections
import { ProductCreateView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

export default function ProductCreatePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Add Strategy</title>
      </Helmet>

      <ProductCreateView />
    </>
  );
}
