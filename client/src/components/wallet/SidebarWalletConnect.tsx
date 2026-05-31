'use client';

import React, { useState } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { DisconnectWalletConfirmModal } from './DisconnectWalletConfirmModal';
import { useWalletDisconnect } from '@/hooks/useWalletDisconnect';

const connectButtonClass =
  'w-full rounded-cyber-md! bg-linear-to-r! from-sui-cyan! to-tatum-purple! text-deep-space! font-mono! text-xs! font-bold! py-3! px-4! shadow-md! hover:opacity-90! transition-all! cursor-pointer!';

export function SidebarWalletConnect() {
  const account = useCurrentAccount();
  const isWalletConnected = !!account?.address;
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const { disconnect, isDisconnecting } = useWalletDisconnect();

  const handleConfirmDisconnect = async () => {
    try {
      await disconnect();
      setIsDisconnectModalOpen(false);
      setShowDisconnect(false);
    } catch {
      // Error surfaced via hook; keep modal open
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="custom-wallet-connect-wrapper">
        <ConnectButton connectText="Connect Wallet" className={connectButtonClass} />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 bg-walrus-blue/50 border border-sui-cyan/15 rounded-cyber-md p-3">
        <button
          type="button"
          onClick={() => setShowDisconnect((open) => !open)}
          className="flex items-center gap-2.5 min-w-0 w-full text-left hover:opacity-90 transition-opacity cursor-pointer"
          aria-expanded={showDisconnect}
        >
          <Wallet className="h-4 w-4 text-sui-cyan shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] font-mono uppercase text-gray-500 tracking-wider">Connected</span>
            <span className="text-[10px] font-mono text-gray-200 truncate" title={account!.address}>
              {account!.address.slice(0, 6)}...{account!.address.slice(-4)}
            </span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-gray-500 shrink-0 transition-transform ${showDisconnect ? 'rotate-180' : ''}`}
          />
        </button>

        {showDisconnect && (
          <button
            type="button"
            onClick={() => setIsDisconnectModalOpen(true)}
            disabled={isDisconnecting}
            className="w-full py-2 px-2 rounded-cyber-md border border-rose-500/30 bg-rose-950/30 hover:bg-rose-600/80 hover:border-rose-500 text-rose-300 font-mono text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
          >
            <LogOut className="h-3 w-3" />
            Disconnect
          </button>
        )}
      </div>

      <DisconnectWalletConfirmModal
        open={isDisconnectModalOpen}
        onClose={() => !isDisconnecting && setIsDisconnectModalOpen(false)}
        onConfirm={handleConfirmDisconnect}
        isLoading={isDisconnecting}
      />
    </>
  );
}
