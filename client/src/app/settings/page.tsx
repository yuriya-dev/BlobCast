'use client';

import React, { useState } from 'react';
import { Settings, Wallet, LogOut } from 'lucide-react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { SearchInputWithRecommendations } from '@/components/feed/SearchInputWithRecommendations';
import { SessionSecurityPanel } from '@/components/settings/SessionSecurityPanel';
import { DisconnectWalletConfirmModal } from '@/components/wallet/DisconnectWalletConfirmModal';
import { useWalletDisconnect } from '@/hooks/useWalletDisconnect';

export default function SettingsPage() {
  const account = useCurrentAccount();
  const walletAddress = account?.address || null;
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const { disconnect, isDisconnecting } = useWalletDisconnect();

  const handleConfirmDisconnect = async () => {
    try {
      await disconnect();
      setIsDisconnectModalOpen(false);
    } catch {
      // Keep modal open on failure
    }
  };

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden relative">
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center gap-2">
          <Settings className="h-5 w-5 text-sui-cyan" />
          <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Settings</h2>
        </header>

        <div className="p-6 flex flex-col gap-6 max-w-2xl">
          <SessionSecurityPanel walletAddress={walletAddress} />

          <div className="glass-panel rounded-cyber-xl p-5 border border-rose-500/20 bg-rose-950/10 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-rose-500/10 pb-3">
              <Wallet className="h-4.5 w-4.5 text-rose-300" />
              <h3 className="font-mono font-bold text-xs uppercase text-white tracking-wider">
                Wallet Connection
              </h3>
            </div>

            {walletAddress ? (
              <>
                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                  Connected as{' '}
                  <span className="font-mono text-gray-200 break-all">{walletAddress}</span>.
                  Disconnecting clears your app session and unlinks this wallet from BlobCast.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDisconnectModalOpen(true)}
                  disabled={isDisconnecting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-cyber-md bg-rose-950/50 border border-rose-500/40 hover:bg-rose-600 hover:border-rose-500 hover:text-white text-rose-300 font-mono font-bold text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect Wallet
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-mono">
                  No wallet connected. Connect below or use the sidebar.
                </p>
                <div className="custom-wallet-connect-wrapper max-w-xs">
                  <ConnectButton
                    connectText="Connect Wallet"
                    className="w-full rounded-cyber-md! bg-linear-to-r! from-sui-cyan! to-tatum-purple! text-deep-space! font-mono! text-xs! font-bold! py-3! px-4! shadow-md! hover:opacity-90! transition-all! cursor-pointer!"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <aside className="w-80 flex-shrink-0 hidden lg:block h-screen overflow-y-auto scrollbar-cyber">
        <div className="px-4 pt-4 pb-0">
          <SearchInputWithRecommendations placeholder="Search BlobCast..." />
        </div>
        <TrendingWidget />
      </aside>

      <DisconnectWalletConfirmModal
        open={isDisconnectModalOpen}
        onClose={() => !isDisconnecting && setIsDisconnectModalOpen(false)}
        onConfirm={handleConfirmDisconnect}
        isLoading={isDisconnecting}
      />
    </div>
  );
}
