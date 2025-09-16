'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import type { UserDTO } from '@/lib/types';
import { getApiBase } from '@/lib/env';

// Lightweight local session helpers (shim for missing '@/lib/session')
const TOKEN_KEY = 'auth.token';
const tokenEvents = new EventTarget();
export function getToken(): string | null {
  try {
    if (typeof window !== 'undefined') return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    // noop
  }
  return null;
}
export function setToken(t: string | null) {
  try {
    if (typeof window !== 'undefined') {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
      tokenEvents.dispatchEvent(new Event('change'));
    }
  } catch (e) {
    // noop
  }
}
export function onTokenChange(cb: () => void) {
  const handler = () => cb();
  tokenEvents.addEventListener('change', handler);
  return () => tokenEvents.removeEventListener('change', handler);
}
export function apiBase() {
  return getApiBase();
}
const persistToken = setToken;

interface AuthContextValue {
  token: string | null;
  user: UserDTO | null;
  loading: boolean;
  setToken: (t: string | null) => void;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(token: string): Promise<UserDTO | null> {
  const res = await fetch(`${apiBase()}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; user?: UserDTO };
  return data.ok && data.user ? data.user : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const setAuthToken = useCallback((t: string | null) => {
    setTokenState(t);
    persistToken(t);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    setLoading(true);
    try {
      const u = await fetchMe(token);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const signOut = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, [setAuthToken]);

  useEffect(() => {
    void refresh();
    const off = onTokenChange(() => {
      setTokenState(getToken());
      void refresh();
    });
    return off;
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      setToken: setAuthToken,
      refresh,
      signOut,
    }),
    [token, user, loading, setAuthToken, refresh, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

