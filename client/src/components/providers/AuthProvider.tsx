'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, type ApiUser } from '@/lib/api';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';

type AuthContextValue = {
  user: ApiUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<ApiUser | null>;
  logout: () => Promise<void>;
  isSessionActive: boolean;
  isAuthorizingSession: boolean;
  authorizeSessionKey: () => Promise<boolean>;
  revokeSessionKey: () => Promise<void>;
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
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAuthorizingSession, setIsAuthorizingSession] = useState(false);

  // Scoped session key validation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeWallet = account?.address;
    if (!activeWallet) {
      setIsSessionActive(false);
      return;
    }

    const expiresVal = localStorage.getItem(`blobcast_session_expires_${activeWallet.toLowerCase()}`);
    const isActive = localStorage.getItem(`blobcast_session_active_${activeWallet.toLowerCase()}`) === 'true';

    if (isActive && expiresVal && parseInt(expiresVal, 10) > Date.now()) {
      setIsSessionActive(true);
    } else {
      setIsSessionActive(false);
      localStorage.removeItem(`blobcast_session_active_${activeWallet.toLowerCase()}`);
      localStorage.removeItem(`blobcast_session_expires_${activeWallet.toLowerCase()}`);
    }
  }, [account?.address]);

  const authorizeSessionKey = async () => {
    if (!account?.address) {
      alert('Connect your Sui wallet to authorize a session.');
      return false;
    }

    setIsAuthorizingSession(true);
    try {
      const messageText = `Authorize BlobCast Session\n\nAddress: ${account.address}\nExpires: 7 Days\nPermissions:\n- Create Post\n- Create Comment\n- Upload Media\n- Follow Users\n- Repost Content`;
      
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(messageText);

      console.log('Signing session authorization message:', messageText);
      await signPersonalMessage({
        message: messageBytes
      });

      const activeWallet = account.address.toLowerCase();
      const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;

      localStorage.setItem(`blobcast_session_active_${activeWallet}`, 'true');
      localStorage.setItem(`blobcast_session_expires_${activeWallet}`, expiresAt.toString());
      setIsSessionActive(true);
      
      console.log('🔒 BlobCast Session authorized successfully!');
      return true;
    } catch (err: any) {
      console.error('❌ BlobCast Session authorization failed:', err);
      alert(`Authorization failed: ${err.message || err}`);
      return false;
    } finally {
      setIsAuthorizingSession(false);
    }
  };

  const revokeSessionKey = async () => {
    if (!account?.address) return;
    const activeWallet = account.address.toLowerCase();
    localStorage.removeItem(`blobcast_session_active_${activeWallet}`);
    localStorage.removeItem(`blobcast_session_expires_${activeWallet}`);
    setIsSessionActive(false);
    console.log('🔓 BlobCast Session Key revoked.');
  };

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

  const value = useMemo(() => ({
    user,
    isLoading,
    refreshSession,
    logout,
    isSessionActive,
    isAuthorizingSession,
    authorizeSessionKey,
    revokeSessionKey
  }), [user, isLoading, isSessionActive, isAuthorizingSession]);

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