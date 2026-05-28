'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Tv, 
  Terminal, 
  Database, 
  Activity, 
  AlertTriangle,
  Server,
  CloudLightning,
  Sparkles,
  Share2
} from 'lucide-react';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import { mockDb, MockPost } from '@/lib/db';

export default function SocialFeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load feed on mount
  useEffect(() => {
    loadFeed();
  }, [isBackendDown]);

  const loadFeed = () => {
    setIsLoading(true);
    
    // Simulate loading duration
    setTimeout(() => {
      // Map mock DB posts to detailed post model structure required by PostCard
      const usersMap: Record<string, any> = {
        'usr-1-vitalik': {
          displayName: 'Vitalik Buterin',
          username: 'vitalik',
          walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
          avatarBlobId: 'walrus://vitalik-avatar',
          verified: true
        },
        'usr-2-sademir': {
          displayName: 'Yuriya',
          username: 'yuriya',
          walletAddress: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
          avatarBlobId: 'walrus://yuriya-avatar',
          verified: true
        },
        'usr-3-mysten': {
          displayName: 'Mysten Labs',
          username: 'mystenlabs',
          walletAddress: '0x81b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
          avatarBlobId: 'walrus://mysten-avatar',
          verified: true
        }
      };

      // If backend is simulated DOWN, we load directly from the Walrus Decentralized Aggregator
      // (simulating direct wallet/aggregator indexing bypassing standard server db indexes!).
      const sourcePosts = [...mockDb.posts];
      
      const mapped = sourcePosts.map(p => {
        const author = usersMap[p.authorId] || {
          displayName: 'Anonymous Caster',
          username: 'anonymous',
          walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000000',
          avatarBlobId: '',
          verified: false
        };

        // Standard text mapped
        let text = 'Immutable social post stored on Walrus.';
        if (p.id === 'post-1') {
          text = 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!';
        } else if (p.id === 'post-2') {
          text = 'Excited about decentralized social layers! Decentralization means true resilience. Check this out: even if our centralized server is powered down, this content remains accessible directly from the Walrus storage aggregator grid!';
        } else if (p.walrusContent) {
          text = (p.walrusContent as any).content?.text || text;
        }

        return {
          id: p.id,
          author,
          walrusBlobId: p.walrusBlobId,
          blobHash: p.blobHash,
          contentType: p.contentType,
          text,
          hashtags: p.id === 'post-1' ? ['blobcast', 'sui'] : p.id === 'post-2' ? ['decentralized', 'walrus'] : (p.walrusContent as any)?.content?.hashtags || [],
          mediaUrl: p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          suiObjectId: p.suiObjectId || undefined,
          createdAt: p.createdAt,
        };
      });

      // Sort by score/created date
      setPosts(mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setIsLoading(false);
    }, 450);
  };

  const handlePostCreated = (newPost: any) => {
    // Append to mock DB so it persists in the session
    const mockPostObj: MockPost = {
      id: newPost.id,
      authorId: newPost.authorId,
      suiObjectId: newPost.suiObjectId,
      walrusBlobId: newPost.walrusBlobId,
      blobHash: newPost.blobHash,
      contentType: newPost.contentType,
      visibility: newPost.visibility,
      replyToId: newPost.replyToId,
      repostOfId: newPost.repostOfId,
      likeCount: newPost.likeCount,
      commentCount: newPost.commentCount,
      repostCount: newPost.repostCount,
      score: newPost.score,
      createdAt: newPost.createdAt,
    };

    mockDb.posts.unshift(mockPostObj);
    loadFeed();
  };

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto min-h-screen">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* 2. Middle Feed Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col min-h-screen">
        
        {/* Top Header navbar bar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-sui-cyan" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Social Feed Feed</h2>
          </div>

          {/* DEMO SLIDE MOMENT TRIGGER CONTROL */}
          <div className="flex items-center gap-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-2xl transition-all">
            <input 
              type="checkbox" 
              id="outage-toggle"
              checked={isBackendDown}
              onChange={(e) => setIsBackendDown(e.target.checked)}
              className="accent-rose-500 cursor-pointer"
            />
            <label htmlFor="outage-toggle" className="text-[10px] font-mono font-bold text-rose-400 cursor-pointer select-none">
              DEMO: OUTAGE MODE
            </label>
          </div>
        </header>

        {/* DEMO OUTAGE BANNER */}
        <AnimatePresence>
          {isBackendDown && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border-b border-rose-500/20 px-6 py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1 font-mono text-[10px] text-gray-300">
                  <span className="text-rose-400 font-bold uppercase block mb-0.5">
                    ⚠️ CRITICAL: Centralized Backend Server Outage Simulated
                  </span>
                  Database connection closed. Standard web queries terminated. 
                  <span className="text-sui-cyan font-semibold block mt-1">
                    ➡️ Live feed resolved exclusively via Walrus Storage node aggregators & decentralized cryptography!
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feed Scroll Content */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          
          {/* Post composer wrapper */}
          {!isBackendDown && (
            <PostComposer onPostCreated={handlePostCreated} />
          )}

          {isBackendDown && (
            <div className="bg-walrus-blue/30 border border-dashed border-rose-500/25 rounded-3xl p-5 text-center font-mono text-xs text-rose-400/80">
              <CloudLightning className="h-6 w-6 mx-auto mb-2 text-rose-400" />
              Posting composer offline: Server transactions halted. 
              <br />
              <span className="text-gray-500 text-[10px] block mt-1">Decentralized storage read-mode remains 100% operational.</span>
            </div>
          )}

          {/* Posts container list */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-t-transparent border-sui-cyan animate-spin" />
                <span className="text-xs font-mono text-gray-500">Querying Walrus blob storage...</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map((post) => (
                <div key={post.id} className="relative">
                  {isBackendDown && (
                    <div className="absolute -top-2.5 right-6 bg-sui-cyan/10 border border-sui-cyan/30 text-sui-cyan font-mono text-[8px] font-bold uppercase px-2 py-0.5 rounded-full z-20 flex items-center gap-1 shadow-md">
                      <Database className="h-2 w-2" /> Resolved via Walrus Aggregator
                    </div>
                  )}
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}

        </div>

      </main>

      {/* 3. Right Sidebar Trending Column */}
      <aside className="w-80 flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 h-screen">
          <TrendingWidget />
        </div>
      </aside>

    </div>
  );
}
