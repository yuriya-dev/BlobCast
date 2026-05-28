'use client';

import React, { useState } from 'react';
import { 
  Bookmark, 
  Database, 
  ExternalLink,
  ShieldCheck, 
  Share2, 
  Heart,
  MessageSquare,
  Repeat2,
  BadgeCheck
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { motion, AnimatePresence } from 'framer-motion';

export default function BookmarksPage() {
  const [bookmarkedCasts, setBookmarkedCasts] = useState<any[]>([
    {
      id: 'post-1',
      author: {
        displayName: 'Vitalik Buterin',
        username: 'vitalik',
        walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
        avatarInitials: 'VB',
        verified: true
      },
      text: 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!',
      walrusBlobId: 'walrus://vitalik-post-1-schema',
      blobHash: 'sha256-07a82fb91ac48f32da6e5f1a3a41cd8d9e2b10aef73145610b',
      likeCount: 142,
      commentCount: 38,
      repostCount: 12,
      time: '2h ago'
    }
  ]);

  const removeBookmark = (id: string) => {
    setBookmarkedCasts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto min-h-screen">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* 2. Middle Content Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col min-h-screen">
        
        {/* Header Toolbar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-5 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-sui-cyan" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Bookmarks Archive</h2>
          </div>

          <span className="text-[10px] font-mono text-gray-500 bg-sui-cyan/5 px-2.5 py-0.5 rounded-full border border-sui-cyan/10">
            PERMANENT ARCHIVE
          </span>
        </header>

        {/* Bookmarks List Scroll Content */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
            🔒 Verifiably Bookmarked Permanent Blobs (Decentralized Session)
          </span>

          <AnimatePresence>
            {bookmarkedCasts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-walrus-blue/20 border border-dashed border-sui-cyan/15 rounded-3xl p-16 text-center font-mono text-xs text-gray-500"
              >
                <Bookmark className="h-8 w-8 mx-auto mb-3 text-gray-600 animate-pulse" />
                No saved bookmarks found.
                <br />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Bookmark permanent casts in your home feed to populate this grid!
                </span>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-6">
                {bookmarkedCasts.map((post) => (
                  <motion.div 
                    key={post.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="glass-panel rounded-cyber-lg p-5 border border-sui-cyan/5 transition-all duration-300 relative group flex gap-4"
                  >
                    {/* Avatar initials */}
                    <div className="h-10 w-10 rounded-cyber-md bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
                      <div className="h-full w-full rounded-cyber-md bg-walrus-blue flex items-center justify-center font-mono font-bold text-xs text-sui-cyan">
                        {post.author.avatarInitials}
                      </div>
                    </div>

                    {/* Post content body */}
                    <div className="flex-1 flex flex-col gap-3">
                      
                      {/* Header metadata info */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-soft-white font-sans">
                            {post.author.displayName}
                          </span>
                          {post.author.verified && (
                            <BadgeCheck className="h-4 w-4 text-sui-cyan fill-sui-cyan/10" />
                          )}
                          <span className="text-xs text-gray-500 font-mono">
                            @{post.author.username}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-gray-500">
                          {post.time}
                        </span>
                      </div>

                      {/* Post body content text */}
                      <p className="text-xs leading-relaxed text-gray-200 font-sans">
                        {post.text}
                      </p>

                      {/* Walrus details box */}
                      <div className="flex items-center justify-between gap-4 mt-2 bg-walrus-blue/40 border border-sui-cyan/5 rounded-cyber-md p-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Database className="h-4 w-4 text-sui-cyan" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[8px] text-gray-400 font-mono uppercase tracking-wider">Walrus Blob Reference</span>
                            <span className="text-[9px] font-mono text-sui-cyan truncate w-56" title={post.walrusBlobId}>
                              {post.walrusBlobId}
                            </span>
                          </div>
                        </div>

                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/5 px-2 py-0.5 border border-emerald-400/25 uppercase font-bold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> VERIFIED
                        </span>
                      </div>

                      {/* Action footer */}
                      <div className="flex items-center justify-between mt-2 text-gray-500 text-[10px] font-mono border-t border-sui-cyan/5 pt-3">
                        <button className="flex items-center gap-1.5 hover:text-rose-400 transition-colors">
                          <Heart className="h-3.5 w-3.5 fill-rose-500/10" />
                          <span>{post.likeCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-sui-cyan transition-colors">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{post.commentCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                          <Repeat2 className="h-3.5 w-3.5" />
                          <span>{post.repostCount}</span>
                        </button>

                        <button 
                          onClick={() => removeBookmark(post.id)}
                          className="text-[9px] text-rose-400 hover:text-rose-300 font-mono border border-rose-500/10 hover:border-rose-500/40 rounded px-2.5 py-1 bg-rose-500/5 transition-all"
                        >
                          Remove Bookmark
                        </button>
                      </div>

                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

        </div>

      </main>

      {/* 3. Right Sidebar Columns */}
      <aside className="w-80 flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 h-screen">
          <TrendingWidget />
        </div>
      </aside>

    </div>
  );
}
