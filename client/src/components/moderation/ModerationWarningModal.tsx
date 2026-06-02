'use client';

import React from 'react';
import { ShieldAlert, Info, AlertTriangle, ExternalLink } from 'lucide-react';

type ModerationWarningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  reason?: string;
  walrusBlobId?: string;
};

export function ModerationWarningModal({
  isOpen,
  onClose,
  message,
  reason,
  walrusBlobId,
}: ModerationWarningModalProps) {
  if (!isOpen) return null;

  const getReasonLabel = (r?: string) => {
    if (!r) return 'Content Guidelines';
    const mapping: Record<string, string> = {
      scam: 'Scam / Financial Fraud',
      spam: 'Spam / Commercial Promotion',
      hate: 'Hate Speech / Harassment',
      explicit: 'Explicit / NSFW Content',
      phishing: 'Phishing / Credential Theft',
      malware: 'Malware / Harmful Downloads',
    };
    return mapping[r.toLowerCase()] || r.toUpperCase();
  };

  const cleanBlobId = walrusBlobId?.replace(/^walrus:\/\//, '');

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-deep-space/80 backdrop-filter backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Card */}
      <div 
        className="relative max-w-md w-full bg-slate-950/95 border-2 border-rose-500/40 rounded-cyber-lg p-6 shadow-[0_0_50px_rgba(244,63,94,0.15)] flex flex-col gap-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 rounded-t-md" />

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-cyber-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-mono font-bold text-sm tracking-widest text-rose-200 uppercase">
              Moderation Warning
            </h3>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
              Automated Safety Protocol
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 text-sm leading-relaxed">
          <p className="text-gray-300 font-sans">
            {message || 'Your cast was processed but violates BlobCast community standards.'}
          </p>

          {/* Reason Badge */}
          {reason && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-cyber-md bg-rose-950/20 border border-rose-500/10 font-mono text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Reason: <strong>{getReasonLabel(reason)}</strong></span>
            </div>
          )}

          {/* Walrus Immutable Notice */}
          <div className="rounded-cyber-md bg-walrus-blue/20 border border-sui-cyan/15 p-3 flex flex-col gap-1.5 text-xs text-gray-400">
            <div className="flex items-center gap-1.5 text-sui-cyan font-mono text-[10px] font-bold uppercase tracking-wider">
              <Info className="h-3 w-3" />
              <span>Walrus Decoupled Architecture</span>
            </div>
            <p className="font-sans leading-relaxed text-[11px]">
              Because BlobCast uses decentralized storage, your raw JSON post has been successfully written to <strong>Walrus permanent nodes</strong>. However, to keep our main feed safe, the reference has been hidden from the public timeline.
            </p>
            {cleanBlobId && (
              <a
                href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${cleanBlobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-[10px] font-mono text-sui-cyan hover:underline self-start bg-sui-cyan/5 px-2 py-0.5 rounded border border-sui-cyan/10"
              >
                <span>View Immutable Walrus Blob</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-cyber-md bg-rose-950/40 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/70 text-rose-200 font-mono text-xs font-bold tracking-wide active:scale-[0.97] transition-all cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
