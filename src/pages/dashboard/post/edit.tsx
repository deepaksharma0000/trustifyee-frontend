import { Helmet } from 'react-helmet-async';
// routes
import { useParams } from 'src/routes/hooks';
// sections
import { PostEditView } from 'src/sections/blog/view';

// ----------------------------------------------------------------------

export default function PostEditPage() {
  const { title } = useParams();

  if (!title) return null; // or redirect / loader

  return (
    <>
      <Helmet>
        <title>Dashboard: Post Edit</title>
      </Helmet>

      <PostEditView title={title} />
    </>
  );
}
