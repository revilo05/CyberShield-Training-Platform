import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

type AuthContextValue = {
  user: User | null; loading: boolean;
  login(email: string): Promise<void>; logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('cybershield_token')) { setLoading(false); return; }
    api.me().then(setUser).catch(() => localStorage.removeItem('cybershield_token')).finally(() => setLoading(false));
  }, []);

  async function login(email: string) {
    const session = await api.login(email);
    localStorage.setItem('cybershield_token', session.token);
    setUser(session.user);
  }

  function logout() {
    localStorage.removeItem('cybershield_token');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
