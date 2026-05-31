'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDisconnectWallet } from '@mysten/dapp-kit';
import { useAuth } from '@/components/providers/AuthProvider';

export function useWalletDisconnect() {
  const router = useRouter();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { logout, revokeSessionKey } = useAuth();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(async (options?: { redirectToLogin?: boolean }) => {
    const redirectToLogin = options?.redirectToLogin ?? true;
    setIsDisconnecting(true);
    setError(null);
    try {
      await revokeSessionKey();
      await logout();
      disconnectWallet();
      if (redirectToLogin) {
        router.replace('/login');
      }
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError('Could not disconnect wallet. Please try again.');
      throw err;
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnectWallet, logout, revokeSessionKey, router]);

  return { disconnect, isDisconnecting, error, clearError: () => setError(null) };
}
