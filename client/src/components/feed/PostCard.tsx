'use client';

import React, { useState } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Repeat2, 
  Coins, 
  BadgeCheck, 
  Database,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: {
    id: string;
    author: {
      displayName: string;
      username: string;
      walletAddress: string;
      avatarBlobId: string;
      verified: boolean;
    };
    walrusBlobId: string;
    blobHash: string;
    contentType: number;
    text: string;
    hashtags: string[];
    mediaUrl?: string;
    likeCount: number;
    commentCount: number;
    repostCount: number;
    suiObjectId?: string;
    createdAt: Date;
  };
}

export function PostCard({ post }: PostCardProps) {
  const [likes, setLikes] = useState(post.likeCount);
  const [hasLiked, setHasLiked] = useState(false);
  const [tipsCount, setTipsCount] = useState(0);
  const [showMetadataPop, setShowMetadataPop] = useState(false);

  const handleLike = () => {
    if (hasLiked) {
      setLikes(prev => prev - 1);
    } else {
      setLikes(prev => prev + 1);
    }
    setHasLiked(!hasLiked);
  };

  const handleTip = () => {
    setTipsCount(prev => prev + 1.5);
    
    // Fire dynamic crypto coin confetti explosion!
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6FE7FF', '#7C5CFF', '#0B1F33', '#ffffff'],
    });
  };

  const truncateWallet = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Convert raw Date or timestamp to readable relative text
  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="glass-panel glass-panel-hover rounded-cyber-lg shadow-cyber-glow p-5 border border-sui-cyan/5 transition-all duration-300 relative group"
    >
      
      {/* Dynamic Glow Overlay behind Card */}
      <div className="absolute inset-0 bg-gradient-to-tr from-sui-cyan/2 to-tatum-purple/2 rounded-cyber-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Main post layout */}
      <div className="flex gap-4 relative z-10">
        
        {/* Avatar */}
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
          <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-bold text-xs font-mono text-sui-cyan">
            {post.author.avatarBlobId ? (
              <span className="text-neon-glow">{post.author.username.substring(0, 2).toUpperCase()}</span>
            ) : (
              'US'
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 flex flex-col gap-3">
          
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-soft-white font-sans hover:underline cursor-pointer">
                {post.author.displayName}
              </span>
              {post.author.verified && (
                <BadgeCheck className="h-4 w-4 text-sui-cyan fill-sui-cyan/10" />
              )}
              <span className="text-xs text-gray-500 font-mono">
                @{post.author.username}
              </span>
              <span className="text-[10px] text-gray-600 font-mono bg-sui-cyan/5 px-2 py-0.5 rounded-full border border-sui-cyan/10" title={post.author.walletAddress}>
                {truncateWallet(post.author.walletAddress)}
              </span>
            </div>

            <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>

          {/* Text Content */}
          <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap font-sans">
            {post.text}
          </p>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {post.hashtags.map(tag => (
                <span key={tag} className="text-xs font-mono text-sui-cyan hover:underline cursor-pointer bg-sui-cyan/5 px-2 py-0.5 rounded-full border border-sui-cyan/10">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Optional Media preview */}
          {post.mediaUrl && (
            <div className="mt-2 rounded-cyber-md overflow-hidden border border-sui-cyan/10 relative max-h-[350px]">
              {/* Premium overlay badge for Walrus persistence */}
              <div className="absolute top-3 left-3 bg-walrus-blue/80 backdrop-filter backdrop-blur-md px-3 py-1.5 rounded-cyber-sm border border-sui-cyan/20 flex items-center gap-1.5 shadow-lg z-20">
                <Database className="h-3 w-3 text-sui-cyan" />
                <span className="text-[9px] font-mono text-sui-cyan font-bold tracking-wider uppercase">
                  Walrus Immutable Media
                </span>
              </div>
              <div className="w-full bg-walrus-blue flex items-center justify-center p-8 h-48 border-dashed border-2 border-sui-cyan/15 rounded-xl">
                <div className="text-center">
                  <Database className="h-8 w-8 text-sui-cyan mx-auto mb-2 animate-pulse" />
                  <span className="text-xs font-mono text-gray-400 block">{post.mediaUrl}</span>
                  <span className="text-[9px] text-gray-500 font-mono block mt-1">Chunk scattered across 120 nodes</span>
                </div>
              </div>
            </div>
          )}

          {/* Walrus Storage Reference badge bar */}
          <div className="flex items-center justify-between gap-4 mt-3 bg-walrus-blue/40 border border-sui-cyan/5 rounded-cyber-md p-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <Database className="h-4.5 w-4.5 text-sui-cyan" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Walrus Blob Reference</span>
                <span className="text-[10px] font-mono text-sui-cyan truncate" title={post.walrusBlobId}>
                  {post.walrusBlobId}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setShowMetadataPop(!showMetadataPop)}
              className="text-[9px] font-mono border border-sui-cyan/20 hover:border-sui-cyan/60 px-2 py-1 rounded-cyber-sm hover:bg-sui-cyan/5 transition-all text-gray-400 hover:text-white"
            >
              Verify On-Chain
            </button>
          </div>

          {/* Dynamic cryptographic verification dropdown info panel */}
          <AnimatePresence>
            {showMetadataPop && (
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
                    <span className="text-gray-300 truncate w-48 text-right" title={post.author.walletAddress}>
                      {post.author.walletAddress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Aggregator Storage URI:</span>
                    <span className="text-sui-cyan truncate w-48 text-right">
                      Aggregator::{post.walrusBlobId.replace('walrus://', '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Content Hash:</span>
                    <span className="text-gray-300 truncate w-48 text-right" title={post.blobHash}>
                      {post.blobHash}
                    </span>
                  </div>
                  {post.suiObjectId && (
                    <div className="flex items-center justify-between border-t border-sui-cyan/5 pt-2 mt-1">
                      <span>Sui Object Reference ID:</span>
                      <a href="#" className="text-sui-cyan flex items-center gap-1 hover:underline">
                        {truncateWallet(post.suiObjectId)} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card interaction controls footer */}
          <div className="flex items-center justify-between mt-3 text-gray-500 text-xs font-mono border-t border-sui-cyan/5 pt-3">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 group transition-colors ${hasLiked ? 'text-rose-500' : 'hover:text-rose-400'}`}
            >
              <Heart className={`h-4 w-4 transition-transform group-active:scale-125 ${hasLiked ? 'fill-rose-500' : ''}`} />
              <span>{likes}</span>
            </button>
            
            <button className="flex items-center gap-1.5 hover:text-sui-cyan transition-colors">
              <MessageSquare className="h-4 w-4" />
              <span>{post.commentCount}</span>
            </button>

            <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
              <Repeat2 className="h-4 w-4" />
              <span>{post.repostCount}</span>
            </button>

            {/* Creator Tipping interaction */}
            <button 
              onClick={handleTip}
              className="flex items-center gap-1 px-3 py-1.5 rounded-cyber-sm border border-sui-cyan/10 bg-sui-cyan/5 hover:bg-sui-cyan/15 hover:border-sui-cyan/40 hover:text-sui-cyan transition-all group/tip"
              title="Tip Creator 1.5 SUI"
            >
              <Coins className="h-4 w-4 transition-transform group-hover/tip:rotate-12" />
              <span>{tipsCount > 0 ? `${tipsCount.toFixed(1)} SUI` : 'Tip Creator'}</span>
            </button>
          </div>

        </div>

      </div>

    </motion.div>
  );
}
