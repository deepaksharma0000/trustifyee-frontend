import { useEffect, useState } from 'react';

export type AuthUser = {
  role?: 'admin' | 'user';

  // basic
  full_name?: string;
  user_name?: string;
  email?: string;

  // 🔥 algo trading control
  licence?: 'Live' | 'Demo';
  broker?: string;
  trading_status?: 'enabled' | 'disabled';

  // optional (future)
  broker_connected?: boolean;
};


export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return { user };
}
