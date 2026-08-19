'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AuthUser } from './api';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('shipboard_token');
    const storedUser = localStorage.getItem('shipboard_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setReady(true);
  }, []);

  function setSession(newToken: string, newUser: AuthUser) {
    localStorage.setItem('shipboard_token', newToken);
    localStorage.setItem('shipboard_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('shipboard_token');
    localStorage.removeItem('shipboard_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, ready, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
