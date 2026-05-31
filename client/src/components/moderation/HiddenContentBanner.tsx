'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { HIDDEN_CONTENT_MESSAGE } from '@/lib/moderation';

type HiddenContentBannerProps = {
  compact?: boolean;
  className?: string;
};

export function HiddenContentBanner({ compact = false, className = '' }: HiddenContentBannerProps) {
  return (
    <div
      className={`rounded-cyber-md border border-rose-500/25 bg-rose-950/20 flex items-start gap-3 ${
        compact ? 'p-3' : 'p-4'
      } ${className}`}
      role="status"
    >
      <ShieldAlert className={`text-rose-300 shrink-0 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
      <div className="flex flex-col gap-1 min-w-0">
        <p className={`font-mono font-bold uppercase text-rose-200 tracking-wider ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Content Hidden
        </p>
        <p className={`text-gray-400 font-sans leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
          {HIDDEN_CONTENT_MESSAGE}
        </p>
        <p className="text-[10px] font-mono text-gray-500 mt-0.5">
          The Walrus blob remains permanent and verifiable on-chain.
        </p>
      </div>
    </div>
  );
}
