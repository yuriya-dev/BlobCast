'use client';

import React from 'react';
import { LogOut, Wallet } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type DisconnectWalletConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
};

export function DisconnectWalletConfirmModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
}: DisconnectWalletConfirmModalProps) {
  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      title="Disconnect Wallet"
      message="Disconnect wallet from BlobCast? You will need to connect again to use the app."
      confirmLabel="Disconnect"
      loadingLabel="Disconnecting..."
      variant="danger"
      titleId="disconnect-wallet-title"
      icon={<Wallet className="h-5 w-5 text-rose-300" />}
    />
  );
}
