'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Loader2, Wallet } from 'lucide-react';

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
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-deep-space/80 backdrop-blur-md"
          onClick={() => !isLoading && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            className="glass-panel rounded-cyber-xl p-6 border border-rose-500/25 w-full max-w-md shadow-cyber-glow relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-wallet-title"
          >
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-5 w-5 text-rose-300" />
              <h3
                id="disconnect-wallet-title"
                className="font-mono font-bold text-sm uppercase text-white tracking-wider"
              >
                Disconnect Wallet
              </h3>
            </div>

            <p className="text-sm text-gray-300 font-sans leading-relaxed mb-6">
              Disconnect wallet from BlobCast? You will need to connect again to use the app.
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end font-mono">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-cyber-md border border-sui-cyan/20 text-gray-400 hover:text-white hover:border-sui-cyan/40 text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-cyber-md bg-rose-950/50 border border-rose-500/40 hover:bg-rose-600 hover:border-rose-500 hover:text-white text-rose-300 font-bold text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5" />
                    Disconnect
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
