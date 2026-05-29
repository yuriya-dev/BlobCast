'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface PostCardVerificationPanelProps {
  showMetadataPop: boolean;
  authorResolved: {
    walletAddress: string;
  };
  walrusBlobId: string;
  blobHash: string;
  suiObjectId?: string;
  truncateWallet: (address: string) => string;
}

export function PostCardVerificationPanel({
  showMetadataPop,
  authorResolved,
  walrusBlobId,
  blobHash,
  suiObjectId,
  truncateWallet
}: PostCardVerificationPanelProps) {
  if (!showMetadataPop) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-walrus-blue/70 border border-sui-cyan/15 rounded-cyber-md p-4 flex flex-col gap-2 font-mono text-[10px] text-gray-400 mt-1">
        <div className="flex items-center justify-between">
          <span>Cryptographic Status:</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED SIGNATURE
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Sui Content Owner:</span>
          <span className="text-gray-300 truncate w-48 text-right" title={authorResolved.walletAddress}>
            {authorResolved.walletAddress}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Aggregator Storage URI:</span>
          <span className="text-sui-cyan truncate w-48 text-right">
            Aggregator::{walrusBlobId.replace('walrus://', '')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Content Hash:</span>
          <span className="text-gray-300 truncate w-48 text-right" title={blobHash}>
            {blobHash}
          </span>
        </div>
        {suiObjectId && (
          <div className="flex items-center justify-between border-t border-sui-cyan/5 pt-2 mt-1">
            <span>Sui Object Reference ID:</span>
            <a href="#" className="text-sui-cyan flex items-center gap-1 hover:underline">
              {truncateWallet(suiObjectId)} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
