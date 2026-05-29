'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, type ApiUser } from '@/lib/api';
import { useCurrentAccount } from '@mysten/dapp-kit';

type AuthContextValue = {
  user: ApiUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<ApiUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_CACHE_KEY = 'blobcast_auth_user';

const publicAuthRoutes = ['/login', '/register'];
const protectedRoutePrefixes = ['/feed', '/profile', '/bookmarks', '/messages', '/wallet', '/explore', '/search', '/posts', '/dev'];

function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function readCachedUser() {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
    return null;
  }
}

function storeCachedUser(user: ApiUser | null) {
  if (typeof window === 'undefined') return;

  if (!user) {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const response = await api.fetchCurrentSession();
      setUser(response.data.user);
      storeCachedUser(response.data.user);
      return response.data.user;
    } catch (error) {
      const isNotAuthenticated = error instanceof Error && 
        (error.message.includes('Not authenticated') || error.message.includes('expired') || error.message.includes('Authentication required') || error.message.includes('invalid') || error.message.includes('session'));

      if (isNotAuthenticated) {
        setUser(null);
        storeCachedUser(null);
        return null;
      }

      // If it's a network outage or other backend error, fall back to cached user for offline resiliency
      const cachedUser = readCachedUser();
      setUser(cachedUser);
      return cachedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Clear client cache even if the backend is unavailable.
    } finally {
      setUser(null);
      storeCachedUser(null);
    }
  };

  useEffect(() => {
    const cachedUser = readCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    refreshSession();
  }, []);

  useEffect(() => {
    // If the wallet changes or is disconnected, invalidate the current session
    const activeWallet = account?.address;
    if (user && (!activeWallet || user.walletAddress.toLowerCase() !== activeWallet.toLowerCase())) {
      logout();
    }
  }, [account?.address, user]);

  const value = useMemo(() => ({ user, isLoading, refreshSession, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isProtected = isProtectedPath(pathname);
  const isPublicAuth = publicAuthRoutes.includes(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (isProtected && !user) {
      router.replace('/login');
      return;
    }

    if (isPublicAuth && user) {
      router.replace('/feed');
    }
  }, [isLoading, isProtected, isPublicAuth, router, user]);

  if (isLoading && isProtected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-space text-white font-mono text-sm">
        Checking session...
      </div>
    );
  }

  return children;
}