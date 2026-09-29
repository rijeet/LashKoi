import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  adminLogin,
  adminLogout,
  adminMe,
  adminRefresh,
  type AdminUser,
} from '@/services/admin-auth';
import { getAccessToken, getRefreshToken } from '@/services/auth-store';

type AuthState = {
  user: AdminUser | null;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const refreshSession = useCallback(async () => {
    if (getAccessToken()) {
      try {
        const me = await adminMe();
        setUser(me);
        return true;
      } catch {
        /* try refresh */
      }
    }
    if (!getRefreshToken()) return false;
    const refreshed = await adminRefresh();
    if (!refreshed) return false;
    const me = await adminMe();
    setUser(me);
    return true;
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setBootstrapping(false));
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await adminLogin(email, password);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, bootstrapping, login, logout, refreshSession }),
    [user, bootstrapping, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}
