import { useAuthContext } from 'src/auth/hooks/use-auth-context';

export function useAuthUser() {
  const { user } = useAuthContext();
  return { user };
}
