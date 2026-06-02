'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, type ApiUser } from '@/lib/api';
import { useCurrentAccount, useSignPersonalMessage, useCurrentWallet } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

type AuthContextValue = {
  user: ApiUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<ApiUser | null>;
  logout: () => Promise<void>;
  isSessionActive: boolean;
  isAuthorizingSession: boolean;
  authorizeSessionKey: (explicitAddress?: string) => Promise<boolean>;
  revokeSessionKey: () => Promise<void>;
  isConnectionLost: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_CACHE_KEY = 'blobcast_auth_user';

const publicAuthRoutes = ['/login', '/register'];
const protectedRoutePrefixes = ['/feed', '/profile', '/bookmarks', '/messages', '/wallet', '/settings', '/explore', '/search', '/posts', '/dev'];

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
  const { connectionStatus } = useCurrentWallet();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isAuthorizingSession, setIsAuthorizingSession] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);

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

  const authorizeSessionKey = async (explicitAddress?: string) => {
    const targetAddress = explicitAddress || account?.address;
    if (!targetAddress) {
      console.warn('⚠️ [Session Key] Cannot authorize session: No active account address.');
      return false;
    }

    setIsAuthorizingSession(true);
    try {
      // 1. Generate local Ed25519 Keypair as the ephemeral Session Key!
      const sessionKeypair = new Ed25519Keypair();
      const secretKeyStr = sessionKeypair.getSecretKey(); // Bech32 encoded suiprivkey...
      const sessionAddress = sessionKeypair.getPublicKey().toSuiAddress();

      const messageText = `Authorize BlobCast Session\n\nAddress: ${targetAddress}\nSession Key: ${sessionAddress}\nExpires: 7 Days\nPermissions:\n- Create Post\n- Create Comment\n- Upload Media\n- Follow Users\n- Repost Content`;
      
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(messageText);

      console.log('Signing session authorization message:', messageText);
      await signPersonalMessage({
        message: messageBytes
      });

      const activeWallet = targetAddress.toLowerCase();
      const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;

      // 2. Save active session details and the session private key securely in localStorage!
      localStorage.setItem(`blobcast_session_active_${activeWallet}`, 'true');
      localStorage.setItem(`blobcast_session_expires_${activeWallet}`, expiresAt.toString());
      localStorage.setItem(`blobcast_session_private_key_${activeWallet}`, secretKeyStr);
      localStorage.setItem(`blobcast_session_key_address_${activeWallet}`, sessionAddress);
      
      setIsSessionActive(true);
      
      console.log(`🔒 BlobCast Session Key authorized! Session address: ${sessionAddress}`);
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
    localStorage.removeItem(`blobcast_session_private_key_${activeWallet}`);
    localStorage.removeItem(`blobcast_session_key_address_${activeWallet}`);
    setIsSessionActive(false);
    console.log('🔓 BlobCast Session Key revoked.');
  };

  const refreshSession = async () => {
    try {
      const response = await api.fetchCurrentSession();
      setUser(response.data.user);
      storeCachedUser(response.data.user);
      setIsConnectionLost(false);
      return response.data.user;
    } catch (error) {
      // Check if token was explicitly wiped by api.ts (meaning it's a true 401 INVALID_TOKEN)
      const tokenWiped = typeof window !== 'undefined' && !window.localStorage.getItem('blobcast_token');

      if (tokenWiped) {
        setUser(null);
        storeCachedUser(null);
        setIsConnectionLost(false);
        return null;
      }

      // If the token is still in localStorage, it means we had a transient infrastructure error
      // (network drop, 502/504 gateway, DB cold start, server restart). Preserve the active session
      // and load the cached user for seamless UX.
      console.warn('📡 [Auth Provider] Server connection lost or transient error. Preserving active session.');
      setIsConnectionLost(true);
      
      const cachedUser = readCachedUser();
      setUser(cachedUser);
      return cachedUser;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-retry server connection every 5 seconds when connection is lost
  useEffect(() => {
    if (!isConnectionLost) return;

    const interval = setInterval(() => {
      console.log('🔄 [Auth Provider] Retrying server connection...');
      refreshSession();
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnectionLost]);

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
    // 1. If the wallet is explicitly disconnected, invalidate the current session
    if (user && connectionStatus === 'disconnected') {
      console.log('🔄 [Auth Provider] Wallet disconnected. Logging out.');
      logout();
      return;
    }

    // 2. If the wallet changes, invalidate the current session
    const activeWallet = account?.address;
    if (user && activeWallet && user.walletAddress.toLowerCase() !== activeWallet.toLowerCase()) {
      console.log('🔄 [Auth Provider] Wallet changed. Logging out.');
      logout();
    }
  }, [account?.address, connectionStatus, user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    refreshSession,
    logout,
    isSessionActive,
    isAuthorizingSession,
    authorizeSessionKey,
    revokeSessionKey,
    isConnectionLost
  }), [user, isLoading, isSessionActive, isAuthorizingSession, isConnectionLost]);

  return (
    <AuthContext.Provider value={value}>
      {isConnectionLost && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 backdrop-blur-md text-slate-900 font-mono text-xs font-semibold py-2 px-4 text-center border-b border-amber-400/20 shadow-lg flex items-center justify-center gap-2 animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-slate-900 animate-ping"></span>
          📡 Connection lost. Re-establishing secure server link, retrying in 5 seconds...
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
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