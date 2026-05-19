'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  /** Returns true if the current user has at least one of the given roles. */
  hasRole: (...roles: string[]) => boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  logout: async () => {},
  hasRole: () => false,
});

export function useAuth(): AuthContextValue {
  return React.useContext(AuthContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await apiFetch('/api/auth/me');
        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.user) {
            setUser(json.data.user as AuthUser);
          } else {
            // Malformed response — treat as unauthenticated
            router.replace('/login');
          }
        } else {
          // apiFetch already handles 401 → refresh → retry or redirect
          // If we reach here with a non-200, just redirect
          if (res.status === 401) {
            router.replace('/login');
          }
        }
      } catch {
        if (!cancelled) router.replace('/login');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkSession();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasRole = React.useCallback((...roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const logout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      router.replace('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
