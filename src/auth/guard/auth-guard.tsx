import { useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

type Props = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: Props) {
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    setChecked(true);
  }, []);

  if (!checked) {
    return null;
  }

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
