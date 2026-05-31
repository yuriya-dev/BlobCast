'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, CircleCheckBig, Sparkles, Wallet } from 'lucide-react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { api } from '@/lib/api';
import { formatWalletAddress } from '@/lib/onboarding';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { user: authUser, refreshSession, isSessionActive, authorizeSessionKey } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connect your wallet to continue.');
  const [errorMessage, setErrorMessage] = useState('');
  const [profileFound, setProfileFound] = useState(false);

  useEffect(() => {
    let active = true;

    const checkProfile = async () => {
      if (!account?.address) {
        setStatusMessage('Connect your wallet to continue.');
        setProfileFound(false);
        setErrorMessage('');
        return;
      }

      setIsChecking(true);
      setErrorMessage('');

      if (authUser && authUser.walletAddress.toLowerCase() === account.address.toLowerCase()) {
        const found = Boolean(authUser.username && authUser.displayName);
        if (!active) return;
        setProfileFound(found);
        if (found) {
          setStatusMessage('Active session found. Redirecting...');
          router.push('/feed');
        } else {
          setStatusMessage('Session detected. Finish your profile registration next.');
          router.push('/register');
        }
        setIsChecking(false);
        return;
      }

      try {
        const response = await api.fetchUserProfile(account.address);
        if (!active) return;

        const user = response.data.user;
        const found = Boolean(user.username && user.displayName);
        setProfileFound(found);
        
        if (found) {
          setIsChecking(true);
          try {
            let signatureSuccess = true;
            
            // Check if we already have an active session in local storage for this wallet
            const localActive = localStorage.getItem(`blobcast_session_active_${account.address.toLowerCase()}`) === 'true';
            const localExpires = localStorage.getItem(`blobcast_session_expires_${account.address.toLowerCase()}`);
            const hasValidLocalSession = localActive && localExpires && parseInt(localExpires, 10) > Date.now();

            if (!isSessionActive && !hasValidLocalSession) {
              setStatusMessage('Profile found. Authorizing secure session key in your wallet...');
              signatureSuccess = await authorizeSessionKey(account.address);
            }

            if (!signatureSuccess) {
              setErrorMessage('Session key authorization rejected. Please connect wallet again or login manually.');
              setIsChecking(false);
              return;
            }

            setStatusMessage('Logging in and redirecting to feed...');
            await api.loginWithWallet(account.address);
            await refreshSession();
            router.push('/feed');
          } catch {
            setErrorMessage('Auto-redirect failed. Please click Login to continue.');
          } finally {
            setIsChecking(false);
          }
        } else {
          setStatusMessage('Wallet connected. Finish your profile registration next.');
          router.push('/register');
        }
      } catch {
        if (!active) return;

        setProfileFound(false);
        setStatusMessage('Wallet connected. Finish your profile registration next.');
        router.push('/register');
      } finally {
        if (active) {
          setIsChecking(false);
        }
      }
    };

    checkProfile();

    return () => {
      active = false;
    };
  }, [account?.address, authUser]);

  const handleContinue = async () => {
    if (!account?.address) {
      setErrorMessage('Connect a wallet first.');
      return;
    }

    setIsChecking(true);
    setErrorMessage('');

    try {
      const localActive = localStorage.getItem(`blobcast_session_active_${account.address.toLowerCase()}`) === 'true';
      const localExpires = localStorage.getItem(`blobcast_session_expires_${account.address.toLowerCase()}`);
      const hasValidLocalSession = localActive && localExpires && parseInt(localExpires, 10) > Date.now();

      if (!isSessionActive && !hasValidLocalSession) {
        setStatusMessage('Authorizing secure session key...');
        const signatureSuccess = await authorizeSessionKey(account.address);
        if (!signatureSuccess) {
          setErrorMessage('Session key authorization rejected.');
          setIsChecking(false);
          return;
        }
      }

      setStatusMessage('Logging in...');
      const response = await api.loginWithWallet(account.address);
      const user = response.data.user;
      const ready = Boolean(user.username && user.displayName);
      if (!ready) {
        router.push('/register');
        return;
      }

      await refreshSession();
      router.push('/feed');
    } catch {
      try {
        const response = await api.fetchUserProfile(account.address);
        const user = response.data.user;
        
        let signatureSuccess = true;
        const localActive = localStorage.getItem(`blobcast_session_active_${account.address.toLowerCase()}`) === 'true';
        const localExpires = localStorage.getItem(`blobcast_session_expires_${account.address.toLowerCase()}`);
        const hasValidLocalSession = localActive && localExpires && parseInt(localExpires, 10) > Date.now();

        if (user.username && user.displayName && !isSessionActive && !hasValidLocalSession) {
          setStatusMessage('Authorizing secure session key...');
          signatureSuccess = await authorizeSessionKey(account.address);
        }

        if (!signatureSuccess) {
          setErrorMessage('Session key authorization rejected.');
          setIsChecking(false);
          return;
        }

        router.push(user.username && user.displayName ? '/feed' : '/register');
        return;
      } catch {
        router.push('/register');
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen walrus-orb-bg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-140 h-140 rounded-full bg-tatum-purple/5 blur-3xl pointer-events-none rotating-orb" />
      <div className="absolute bottom-0 left-0 w-130 h-130 rounded-full bg-sui-cyan/5 blur-3xl pointer-events-none rotating-orb" style={{ animationDirection: 'reverse' }} />

      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-sui-cyan to-tatum-purple p-0.5 group-hover:rotate-6 transition-all duration-300">
            <div className="h-full w-full rounded-xl bg-walrus-blue flex items-center justify-center font-bold text-sui-cyan font-mono text-sm">
              BC
            </div>
          </div>
          <div>
            <p className="font-mono font-black text-sm tracking-[0.3em] text-white text-neon-glow">BLOBCAST</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">Login</p>
          </div>
        </Link>

        <Link href="/register" className="text-xs font-mono text-gray-400 hover:text-sui-cyan transition-colors hidden sm:inline-flex items-center gap-1.5 bg-walrus-blue/40 border border-sui-cyan/10 px-3 py-2 rounded-xl">
          <Sparkles className="h-3 w-3" /> Register
        </Link>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-panel rounded-cyber-xl border border-sui-cyan/10 p-6 md:p-8">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-sui-cyan">
            <CircleCheckBig className="h-3.5 w-3.5" /> Secure login
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-[1.15fr_0.85fr] items-start">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold font-mono text-white leading-tight">Welcome back.</h1>
              <p className="mt-4 text-sm md:text-base text-gray-400 leading-relaxed max-w-xl">
                Connect your wallet and we will send you to the right place. If your profile is already set up, you go straight to the feed. If not, we send you to registration.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-[0.25em] text-gray-400">
                <span className="rounded-full border border-sui-cyan/10 bg-walrus-blue/50 px-3 py-1.5">No password</span>
                <span className="rounded-full border border-sui-cyan/10 bg-walrus-blue/50 px-3 py-1.5">Wallet identity</span>
                <span className="rounded-full border border-sui-cyan/10 bg-walrus-blue/50 px-3 py-1.5">Fast route check</span>
              </div>
            </div>

            <div className="rounded-cyber-lg border border-sui-cyan/10 bg-walrus-blue/50 p-5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-gray-500">
                <Wallet className="h-4 w-4 text-sui-cyan" /> Wallet session
              </div>

              <div className="mt-4 rounded-2xl border border-sui-cyan/10 bg-deep-space/50 p-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">Current address</p>
                <p className="mt-2 text-sm font-mono text-sui-cyan break-all">{formatWalletAddress(account?.address)}</p>
              </div>

              <div className="mt-4 text-sm text-gray-300 leading-relaxed">
                {statusMessage}
              </div>

              {errorMessage ? <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div> : null}

              <div className="mt-5 flex flex-col gap-3">
                <ConnectButton connectText="Connect Wallet" className="rounded-xl! bg-linear-to-r! from-sui-cyan! to-tatum-purple! text-deep-space! font-mono! text-xs! font-bold! py-2! px-4! shadow-md!" />
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!account?.address || isChecking}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sui-cyan to-tatum-purple px-4 py-3 text-sm font-mono font-bold text-deep-space disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isChecking ? 'Checking profile...' : profileFound ? 'Login' : 'Continue to registration'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 text-center text-xs font-mono text-gray-500">
          Need a new account? <Link href="/register" className="text-sui-cyan hover:underline">Create your profile</Link>
        </div>
      </main>
    </div>
  );
}
