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

export default function RegisterPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { user: authUser, refreshSession, isSessionActive, authorizeSessionKey } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!account?.address) {
        setUsername('');
        setDisplayName('');
        setSuccessMessage('');
        setErrorMessage('');
        return;
      }

      setIsLoadingProfile(true);
      setErrorMessage('');
      setSuccessMessage('');

      if (authUser && authUser.walletAddress.toLowerCase() === account.address.toLowerCase()) {
        setUsername(authUser.username || '');
        setDisplayName(authUser.displayName || '');
        if (authUser.username && authUser.displayName) {
          setSuccessMessage('Profile loaded from active session. Redirecting to feed...');
          router.push('/feed');
        }
        setIsLoadingProfile(false);
        return;
      }

      try {
        const response = await api.fetchUserProfile(account.address);
        if (!active) return;

        const user = response.data.user;
        setUsername(user.username || '');
        setDisplayName(user.displayName || '');
        
        if (user.username && user.displayName) {
          setIsSubmitting(true);
          try {
            let signatureSuccess = true;
            
            // Check if we already have an active session in local storage for this wallet
            const localActive = localStorage.getItem(`blobcast_session_active_${account.address.toLowerCase()}`) === 'true';
            const localExpires = localStorage.getItem(`blobcast_session_expires_${account.address.toLowerCase()}`);
            const hasValidLocalSession = localActive && localExpires && parseInt(localExpires, 10) > Date.now();

            if (!isSessionActive && !hasValidLocalSession) {
              setSuccessMessage('Profile already registered. Authorizing secure session key in your wallet...');
              signatureSuccess = await authorizeSessionKey(account.address);
            }

            if (!signatureSuccess) {
              setErrorMessage('Session key authorization rejected. Please connect wallet again or save manually.');
              setIsSubmitting(false);
              return;
            }

            setSuccessMessage('Logging in and redirecting to feed...');
            await api.loginWithWallet(account.address);
            await refreshSession();
            router.push('/feed');
          } catch {
            setErrorMessage('Auto-redirect failed. Please click Save profile to continue.');
          } finally {
            setIsSubmitting(false);
          }
        }
      } catch {
        if (!active) return;

        setUsername('');
        setDisplayName('');
      } finally {
        if (active) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [account?.address, authUser]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!account?.address) {
      setErrorMessage('Connect a wallet first.');
      return;
    }

    const nextUsername = username.trim();
    const nextDisplayName = displayName.trim();

    if (!nextUsername || !nextDisplayName) {
      setErrorMessage('Username and display name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      let signatureSuccess = true;
      const localActive = localStorage.getItem(`blobcast_session_active_${account.address.toLowerCase()}`) === 'true';
      const localExpires = localStorage.getItem(`blobcast_session_expires_${account.address.toLowerCase()}`);
      const hasValidLocalSession = localActive && localExpires && parseInt(localExpires, 10) > Date.now();

      if (!isSessionActive && !hasValidLocalSession) {
        setSuccessMessage('Profile details validated. Please sign the secure session key in your wallet...');
        signatureSuccess = await authorizeSessionKey(account.address);
      }

      if (!signatureSuccess) {
        setErrorMessage('Session key authorization rejected.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Saving profile...');
      await api.registerWithWallet({
        walletAddress: account.address,
        username: nextUsername,
        displayName: nextDisplayName,
      });

      await refreshSession();

      setSuccessMessage('Profile saved successfully.');
      router.push('/feed');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen walrus-orb-bg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-140 h-140 rounded-full bg-tatum-purple/5 blur-3xl pointer-events-none rotating-orb" />
      <div className="absolute bottom-0 left-0 w-130 h-130 rounded-full bg-sui-cyan/5 blur-3xl pointer-events-none rotating-orb" style={{ animationDirection: 'reverse' }} />

      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-sui-cyan to-tatum-purple p-0.5 group-hover:rotate-6 transition-all duration-300">
            <div className="h-full w-full rounded-xl bg-walrus-blue flex items-center justify-center font-bold text-sui-cyan font-mono text-sm">BC</div>
          </div>
          <div>
            <p className="font-mono font-black text-sm tracking-[0.3em] text-white text-neon-glow">BLOBCAST</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">Register</p>
          </div>
        </Link>

        <Link href="/login" className="text-xs font-mono text-gray-400 hover:text-sui-cyan transition-colors hidden sm:inline-flex items-center gap-1.5 bg-walrus-blue/40 border border-sui-cyan/10 px-3 py-2 rounded-xl">
          <Sparkles className="h-3 w-3" /> Login
        </Link>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-panel rounded-cyber-xl border border-sui-cyan/10 p-6 md:p-8">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-tatum-purple">
            <CircleCheckBig className="h-3.5 w-3.5" /> Create profile
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-start">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold font-mono text-white leading-tight">Create your profile.</h1>
              <p className="mt-4 text-sm md:text-base text-gray-400 leading-relaxed max-w-xl">
                Connect your wallet, then choose a username and display name. Both fields are required before you can use BlobCast.
              </p>

              <div className="mt-6 rounded-2xl border border-sui-cyan/10 bg-walrus-blue/40 p-4 text-sm text-gray-300 leading-relaxed">
                Your wallet will be used as the primary identity. The profile data is stored through the existing app registry, and you can update it later from your profile page.
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
                {isLoadingProfile ? 'Loading profile...' : account?.address ? 'Wallet connected. Fill the form below.' : 'Connect your wallet to start registration.'}
              </div>

              {errorMessage ? <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div> : null}
              {successMessage ? <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{successMessage}</div> : null}

              <div className="mt-5">
                <ConnectButton connectText="Connect Wallet" className="rounded-xl! bg-linear-to-r! from-sui-cyan! to-tatum-purple! text-deep-space! font-mono! text-xs! font-bold! py-2! px-4! shadow-md!" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-gray-500 mb-2">Username *</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={!account?.address}
                placeholder="yourhandle"
                className="w-full rounded-2xl bg-walrus-blue/70 border border-sui-cyan/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-sui-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-gray-500 mb-2">Display name *</label>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={!account?.address}
                placeholder="Your Display Name"
                className="w-full rounded-2xl bg-walrus-blue/70 border border-sui-cyan/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-sui-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={!account?.address || !username.trim() || !displayName.trim() || isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sui-cyan to-tatum-purple px-5 py-3.5 text-sm font-mono font-bold text-deep-space transition-all hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving profile...' : 'Save profile'}
                <ArrowRight className="h-4 w-4" />
              </button>

            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
