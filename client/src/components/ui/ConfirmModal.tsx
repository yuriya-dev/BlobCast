'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export type ConfirmModalVariant = 'danger' | 'default';

export type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: ConfirmModalVariant;
  icon?: React.ReactNode;
  titleId?: string;
};

const variantStyles: Record<
  ConfirmModalVariant,
  { panel: string; confirm: string }
> = {
  danger: {
    panel: 'border-rose-500/25',
    confirm:
      'bg-rose-950/50 border-rose-500/40 hover:bg-rose-600 hover:border-rose-500 hover:text-white text-rose-300',
  },
  default: {
    panel: 'border-sui-cyan/25',
    confirm:
      'bg-gradient-to-r from-sui-cyan to-tatum-purple border-transparent hover:opacity-95 text-deep-space',
  },
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  loadingLabel,
  variant = 'danger',
  icon,
  titleId = 'confirm-modal-title',
}: ConfirmModalProps) {
  if (typeof window === 'undefined') return null;

  const styles = variantStyles[variant];

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
            className={`glass-panel rounded-cyber-xl p-6 border w-full max-w-md shadow-cyber-glow relative ${styles.panel}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex items-center gap-2 mb-3">
              {icon}
              <h3
                id={titleId}
                className="font-mono font-bold text-sm uppercase text-white tracking-wider"
              >
                {title}
              </h3>
            </div>

            <p className="text-sm text-gray-300 font-sans leading-relaxed mb-6">{message}</p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end font-mono">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-cyber-md border border-sui-cyan/20 text-gray-400 hover:text-white hover:border-sui-cyan/40 text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={isLoading}
                className={`px-4 py-2.5 rounded-cyber-md border font-bold text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${styles.confirm}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {loadingLabel ?? confirmLabel}
                  </>
                ) : (
                  confirmLabel
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
