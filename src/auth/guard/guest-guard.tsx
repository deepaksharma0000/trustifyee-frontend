import { Navigate, useLocation } from 'react-router-dom';

type Props = {
  children: React.ReactNode;
};

export default function GuestGuard({ children }: Props) {
  const location = useLocation();
  const token = localStorage.getItem('authToken');

  if (token) {
    const returnTo =
      (location.state as any)?.returnTo || '/dashboard';

    return <Navigate to={returnTo} replace />;
  }

  return <>{children}</>;
}
