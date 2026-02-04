import { Helmet } from 'react-helmet-async';
// routes
import { useParams } from 'src/routes/hooks';
// sections
import { PostDetailsHomeView } from 'src/sections/blog/view';

// ----------------------------------------------------------------------

export default function PostDetailsHomePage() {
  const { title } = useParams();

  if (!title) return null; // or redirect

  return (
    <>
      <Helmet>
        <title>Post: Details</title>
      </Helmet>

      <PostDetailsHomeView title={title} />
    </>
  );
}
