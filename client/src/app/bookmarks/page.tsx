'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Database,
  Loader2
} from 'lucide-react';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostCard } from '@/components/feed/PostCard';
import { mockDb } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';

export default function BookmarksPage() {
  const [bookmarkedCasts, setBookmarkedCasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
    
    // Set up a listener for storage events to update real-time
    const handleStorageChange = () => {
      loadBookmarks();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadBookmarks = () => {
    if (typeof window !== 'undefined') {
      try {
        const bookmarksRaw = localStorage.getItem('blobcast_bookmarks');
        const bookmarkIds = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
        
        // Map users
        const usersMap: Record<string, any> = {};
        mockDb.users.forEach(u => {
          usersMap[u.id] = u;
        });

        // Filter mock DB posts
        const sourcePosts = mockDb.posts.filter(p => bookmarkIds.includes(p.id));
        
        const mapped = sourcePosts.map(p => {
          const user = usersMap[p.authorId] || {
            displayName: 'Anonymous Caster',
            username: 'anonymous',
            walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000000',
            avatarBlobId: '',
            verified: false
          };

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
            author: {
              displayName: user.displayName || 'Yuriya',
              username: user.username || 'yuriya',
              walletAddress: user.walletAddress || '0x91abc6f3e1b7...',
              avatarBlobId: user.avatarBlobId || '',
              verified: user.verified || false
            },
            walrusBlobId: p.walrusBlobId,
            blobHash: p.blobHash,
            contentType: p.contentType,
            text,
            hashtags: p.id === 'post-1' ? ['blobcast', 'sui'] : p.id === 'post-2' ? ['decentralized', 'walrus'] : (p.walrusContent as any)?.content?.hashtags || [],
            mediaUrl: p.walrusContent?.media?.[0]?.blob_id || (p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined),
            likeCount: p.likeCount,
            commentCount: p.commentCount,
            repostCount: p.repostCount,
            suiObjectId: p.suiObjectId || undefined,
            createdAt: p.createdAt,
          };
        });

        // Seed with a default mock bookmark if no user bookmarks exist yet
        if (mapped.length === 0 && bookmarkIds.length === 0) {
          setBookmarkedCasts([
            {
              id: 'post-1',
              author: {
                displayName: 'Vitalik Buterin',
                username: 'vitalik',
                walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
                avatarBlobId: 'walrus://vitalik-avatar',
                verified: true
              },
              text: 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!',
              walrusBlobId: 'walrus://vitalik-post-1-schema',
              blobHash: 'sha256-07a82fb91ac48f32da6e5f1a3a41cd8d9e2b10aef73145610b',
              contentType: 0,
              hashtags: ['blobcast', 'sui'],
              likeCount: 142,
              commentCount: 38,
              repostCount: 12,
              createdAt: new Date(Date.now() - 7200000)
            }
          ]);
        } else {
          setBookmarkedCasts(mapped);
        }
      } catch (e) {
        console.warn("Failed to load bookmarks:", e);
      } finally {
        setIsLoading(false);
      }
    }
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

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center p-16"
              >
                <Loader2 className="h-6 w-6 animate-spin text-sui-cyan" />
              </motion.div>
            ) : bookmarkedCasts.length === 0 ? (
              <motion.div 
                key="empty"
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
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-6"
              >
                {bookmarkedCasts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </motion.div>
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
