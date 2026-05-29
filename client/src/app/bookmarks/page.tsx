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
import { api } from '@/lib/api';
import { walrus } from '@/lib/walrus';
import { useAuth } from '@/components/providers/AuthProvider';

export default function BookmarksPage() {
  const { user: authUser } = useAuth();
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

  const loadBookmarks = async () => {
    if (typeof window !== 'undefined') {
      try {
        const bookmarksRaw = localStorage.getItem('blobcast_bookmarks');
        const bookmarkIds = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
        
        if (bookmarkIds.length === 0) {
          setBookmarkedCasts([]);
          setIsLoading(false);
          return;
        }

        // Fetch each bookmark by ID in parallel
        const fetchedPosts = await Promise.all(
          bookmarkIds.map(async (id: string) => {
            try {
              const res = await api.fetchPostById(id);
              if (res && res.data && res.data.post) {
                const p = res.data.post;

                let text = 'Immutable social post stored on Walrus.';
                let hashtags: string[] = [];
                let mediaUrl: string | undefined = undefined;
                let media: any[] = [];

                if (p.walrusBlobId) {
                  try {
                    const content = await walrus.getBlob(p.walrusBlobId);
                    if (content && typeof content === 'object') {
                      const contentObj = content as any;
                      if (contentObj.content?.text) text = contentObj.content.text;
                      if (contentObj.content?.hashtags) hashtags = contentObj.content.hashtags;
                      if (contentObj.media && contentObj.media.length > 0) {
                        media = contentObj.media;
                        mediaUrl = contentObj.media[0].blob_id;
                      }
                    }
                  } catch (err) {
                    console.warn(`Failed to resolve Walrus content for bookmarked post ${id}:`, err);
                  }
                }

                return {
                  id: p.id,
                  author: {
                    displayName: p.author?.displayName || 'Anonymous Caster',
                    username: p.author?.username || 'anonymous',
                    walletAddress: p.author?.walletAddress || '0x000000...',
                    avatarBlobId: p.author?.avatarBlobId || '',
                    verified: p.author?.verified || false
                  },
                  walrusBlobId: p.walrusBlobId,
                  blobHash: p.blobHash,
                  contentType: p.contentType,
                  text: text,
                  hashtags: hashtags,
                  mediaUrl: mediaUrl,
                  media: media,
                  likeCount: p.likeCount,
                  commentCount: p.commentCount,
                  repostCount: p.repostCount,
                  suiObjectId: p.suiObjectId || undefined,
                  createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                  likes: (p as any).likes || [],
                  reposts: (p as any).reposts || [],
                  repostOf: (p as any).repostOf ? {
                    id: (p as any).repostOf.id,
                    author: {
                      displayName: (p as any).repostOf.author?.displayName || 'Anonymous Caster',
                      username: (p as any).repostOf.author?.username || 'anonymous',
                      walletAddress: (p as any).repostOf.author?.walletAddress || '0x000000...',
                      avatarBlobId: (p as any).repostOf.author?.avatarBlobId || '',
                      verified: (p as any).repostOf.author?.verified || false
                    }
                  } : null
                };
              }
              return null;
            } catch (err) {
              console.warn(`Failed to fetch bookmarked post ${id} from live server, checking mockDb:`, err);
              // Fallback to offline mock DB
              const mockP = mockDb.posts.find(p => p.id === id);
              if (mockP) {
                const u = mockDb.users.find(user => user.id === mockP.authorId) || {
                  displayName: authUser?.displayName || 'Yuriya',
                  username: authUser?.username || 'yuriya',
                  walletAddress: authUser?.walletAddress || '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
                  avatarBlobId: authUser?.avatarBlobId || 'walrus://yuriya-avatar',
                  verified: authUser?.verified || true
                };
                return {
                  id: mockP.id,
                  author: u,
                  walrusBlobId: mockP.walrusBlobId,
                  blobHash: mockP.blobHash,
                  contentType: mockP.contentType,
                  text: mockP.id === 'post-1'
                    ? 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!'
                    : 'Excited about decentralized social layers! Decentralization means true resilience. Check this out: even if our centralized server is powered down, this content remains accessible directly from the Walrus storage aggregator grid!',
                  hashtags: ['decentralized', 'walrus'],
                  mediaUrl: mockP.id === 'post-2' ? 'walrus://blob-post-2-image' : undefined,
                  media: mockP.walrusContent?.media || (mockP.id === 'post-2' ? [{ type: 'image', blob_id: 'walrus://blob-post-2-image' }] : []),
                  walrusContent: mockP.walrusContent,
                  likeCount: mockP.likeCount,
                  commentCount: mockP.commentCount,
                  repostCount: mockP.repostCount,
                  createdAt: mockP.createdAt
                };
              }
              return null;
            }
          })
        );

        const filteredPosts = fetchedPosts.filter(p => p !== null);
        setBookmarkedCasts(filteredPosts);
      } catch (e) {
        console.warn("Failed to load bookmarks:", e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* 2. Middle Content Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        
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
      <aside className="w-80 flex-shrink-0 hidden lg:block h-screen overflow-y-auto scrollbar-cyber">
        <TrendingWidget />
      </aside>

    </div>
  );
}
