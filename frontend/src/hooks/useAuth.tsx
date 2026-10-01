import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setSessionExpiredHandler, tokenStorage } from '../services/api';
import { authService } from '../services/auth.service';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  /** True while we check a saved token on first load. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  /** Re-fetch the user from the server (e.g. after the balance changed). */
  refreshUser: () => Promise<void>;
  /** Locally patch the user with values the server just returned (e.g. newBalance). */
  patchUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(logout);
    if (!tokenStorage.get()) {
      setInitializing(false);
      return;
    }
    authService
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setInitializing(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await authService.login(email, password);
    tokenStorage.set(token);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await authService.me());
  }, []);

  const patchUser = useCallback((patch: Partial<User>) => {
    setUser((u) => (u ? { ...u, ...patch } : u));
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout, refreshUser, patchUser }),
    [user, initializing, login, logout, refreshUser, patchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where each role lands after logging in. */
export const homePathFor = (user: Pick<User, 'role'>) => (user.role === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard');
