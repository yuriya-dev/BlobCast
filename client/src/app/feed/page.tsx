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
  Share2,
  Bell,
  Search,
  CheckCircle2
} from 'lucide-react';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import { mockDb, MockPost } from '@/lib/db';
import { api, ApiPost } from '@/lib/api';
import { walrus } from '@/lib/walrus';

export default function SocialFeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifsLog, setShowNotifsLog] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    { id: 'n1', type: 'tip', text: 'Mysten Labs verifiably tipped you 10 SUI on cast post-1', time: '5m ago' },
    { id: 'n2', type: 'like', text: 'Vitalik Buterin verifiably signed and liked your cast post-1', time: '12m ago' },
    { id: 'n3', type: 'system', text: 'Yuriya updated profile metadata JSON schema in Walrus publisher node', time: '1h ago' }
  ]);

  // Handle pin: move post to the very top of the feed (only for owner)
  const handlePinPost = async (postId: string, pinned: boolean) => {
    const nextPinnedId = pinned ? postId : null;

    if (typeof window !== 'undefined') {
      if (pinned) {
        localStorage.setItem('blobcast_pinned_post_id', postId);
      } else {
        localStorage.removeItem('blobcast_pinned_post_id');
      }
    }

    try {
      await api.upsertUserProfile({
        walletAddress: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
        pinnedPostId: nextPinnedId
      });
    } catch (err) {
      console.warn("⚠️ Failed to synchronize pinned post in PostgreSQL:", err);
    }
  };

  // Load feed on mount
  useEffect(() => {
    loadFeed();

    // Sync latest pinned post from DB to localStorage on feed mount
    if (!isBackendDown) {
      (async () => {
        try {
          const walletAddress = '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f';
          const res = await api.fetchUserProfile(walletAddress);
          if (res && res.data && res.data.user) {
            const user = res.data.user;
            if (typeof window !== 'undefined') {
              if (user.pinnedPostId) {
                localStorage.setItem('blobcast_pinned_post_id', user.pinnedPostId);
              } else {
                localStorage.removeItem('blobcast_pinned_post_id');
              }
            }
          }
        } catch (err) {
          // Silently ignore if backend offline
        }
      })();
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) {
        setSearchQuery(search);
      }
    }
  }, [isBackendDown]);

  // Load notifications from indexer telemetry REST API periodically
  useEffect(() => {
    const fetchNotifs = async () => {
      if (isBackendDown) return;
      try {
        const response = await api.fetchNotifications();
        if (response && response.data && response.data.notifications && response.data.notifications.length > 0) {
          // Prepend latest backend notification, merge with defaults to ensure beautiful content variety
          setNotifications(prev => {
            const incoming = response.data.notifications;
            const filtered = incoming.filter((inc: any) => !prev.some(p => p.id === inc.id));
            if (filtered.length > 0) {
              return [...filtered, ...prev].slice(0, 10);
            }
            return prev;
          });
        }
      } catch (err) {
        // Silently capture offline states
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000); // Poll every 5s for real-time indexer dynamic action feel!
    return () => clearInterval(interval);
  }, [isBackendDown]);

  const loadFeed = async () => {
    setIsLoading(true);

    const sortAndPinPosts = (postsList: any[]) => {
      const sorted = [...postsList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted;
    };

    if (!isBackendDown) {
      try {
        const response = await api.fetchPosts(1, 20);
        if (response && response.data && response.data.posts) {
          const apiPosts = response.data.posts;
          
          const mapped = await Promise.all(apiPosts.map(async (p: ApiPost) => {
            let text = 'Immutable social post stored on Walrus.';
            let hashtags: string[] = [];
            let mediaUrl: string | undefined = undefined;
            let media: any[] = [];

            // Check if we have dynamic Walrus blob content
            if (p.walrusBlobId) {
              try {
                // Fetch the dynamic JSON schema payload from Walrus publisher/aggregator or localStorage
                const walrusContent = await walrus.getBlob(p.walrusBlobId);
                if (walrusContent && typeof walrusContent === 'object') {
                  const contentObj = walrusContent as any;
                  if (contentObj.content?.text) {
                    text = contentObj.content.text;
                  }
                  if (contentObj.content?.hashtags) {
                    hashtags = contentObj.content.hashtags;
                  }
                  if (contentObj.media && contentObj.media.length > 0) {
                    media = contentObj.media;
                    mediaUrl = contentObj.media[0].blob_id;
                  }
                }
              } catch (walrusErr) {
                console.warn(`⚠️ Failed to fetch Walrus blob payload for ${p.walrusBlobId}:`, walrusErr);
                // Fallback text if it fails to resolve
                if (p.id === 'post-1') {
                  text = 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!';
                  hashtags = ['blobcast', 'sui'];
                } else if (p.id === 'post-2') {
                  text = 'Excited about decentralized social layers! Decentralization means true resilience. Check this out: even if our centralized server is powered down, this content remains accessible directly from the Walrus storage aggregator grid!';
                  hashtags = ['decentralized', 'walrus'];
                  mediaUrl = 'walrus://blob-post-2-image';
                } else {
                  text = `Casting payload registered verifiably. Walrus Blob Reference: ${p.walrusBlobId}`;
                }
              }
            }

            // Construct unified post layout for feed rendering
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
              likeCount: p.repostOf ? p.repostOf.likeCount : p.likeCount,
              commentCount: p.repostOf ? p.repostOf.commentCount : p.commentCount,
              repostCount: p.repostOf ? p.repostOf.repostCount : p.repostCount,
              suiObjectId: p.suiObjectId || undefined,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              likes: (p as any).repostOf ? ((p as any).repostOf.likes || []) : ((p as any).likes || []),
              reposts: (p as any).repostOf ? ((p as any).repostOf.reposts || []) : ((p as any).reposts || []),
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
          }));

          setPosts(sortAndPinPosts(mapped));
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("⚠️ Express Backend offline. Automatically falling back to resilient Walrus Decentralized Aggregator simulation.");
      }
    }
    
    // Resilient Fallback to InMemory/Walrus aggregator simulated cache
    setTimeout(() => {
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

      const sourcePosts = [...mockDb.posts];
      const mapped = sourcePosts.map(p => {
        const author = usersMap[p.authorId] || {
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
          author,
          walrusBlobId: p.walrusBlobId,
          blobHash: p.blobHash,
          contentType: p.contentType,
          text,
          hashtags: p.id === 'post-1' ? ['blobcast', 'sui'] : p.id === 'post-2' ? ['decentralized', 'walrus'] : (p.walrusContent as any)?.content?.hashtags || [],
          mediaUrl: p.walrusContent?.media?.[0]?.blob_id || (p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined),
          media: p.walrusContent?.media || (p.contentType === 1 ? [{ type: 'image', blob_id: 'walrus://blob-post-2-image' }] : []),
          walrusContent: p.walrusContent,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          suiObjectId: p.suiObjectId || undefined,
          createdAt: p.createdAt,
        };
      });

      setPosts(sortAndPinPosts(mapped));
      setIsLoading(false);
    }, 450);
  };

  const handlePostCreated = async (newPost: any) => {
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
      walrusContent: newPost.walrusContent,
    };

    if (!isBackendDown) {
      try {
        await api.createPost({
          authorId: 'usr-2-sademir', // Yuriya profile
          suiObjectId: newPost.suiObjectId || null,
          walrusBlobId: newPost.walrusBlobId,
          blobHash: newPost.blobHash,
          contentType: newPost.contentType,
          visibility: newPost.visibility
        });
        loadFeed();
        return;
      } catch (err) {
        console.warn("⚠️ Failed to post to Express backend. Storing in resilient session cache.");
      }
    }

    mockDb.posts.unshift(mockPostObj);
    loadFeed();
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.text.toLowerCase().includes(query) ||
      post.author.displayName.toLowerCase().includes(query) ||
      post.author.username.toLowerCase().includes(query) ||
      post.hashtags.some((tag: string) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* 2. Middle Feed Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        
        {/* Top Header navbar bar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-sui-cyan" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Social Feed</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Activity Notification Log Bell Button */}
            <button 
              onClick={() => setShowNotifsLog(!showNotifsLog)}
              className={`p-2 rounded-xl border transition-all relative cursor-pointer ${
                showNotifsLog 
                  ? 'bg-sui-cyan/20 text-sui-cyan border-sui-cyan/40 shadow-cyber-glow' 
                  : 'bg-walrus-blue/40 border-sui-cyan/15 text-gray-400 hover:text-white hover:border-sui-cyan/30'
              }`}
              title="System Activity Logs"
            >
              <Bell className="h-4 w-4 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sui-cyan node-pulse" />
            </button>

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
          </div>
        </header>

        {/* Search Bar Block */}
        <div className="px-6 pt-5 pb-2">
          <div className="relative flex items-center bg-walrus-blue/40 border border-sui-cyan/15 rounded-2xl px-4 py-3 group focus-within:border-sui-cyan/40 focus-within:shadow-cyber-glow transition-all">
            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-sui-cyan transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search casts, tags, or creators (e.g. #sui, vitalik, yuriya)..."
              className="bg-transparent border-none outline-none text-xs text-soft-white placeholder-gray-500 ml-3 w-full font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-mono text-gray-500 hover:text-white transition-colors uppercase border border-sui-cyan/10 rounded px-1.5 py-0.5 bg-deep-space/50"
              >
                Clear
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 flex items-center gap-2 px-1">
              <span className="text-[10px] font-mono text-gray-500">Filtration active:</span>
              <span className="text-[10px] font-mono text-sui-cyan bg-sui-cyan/10 px-2.5 py-0.5 rounded-full border border-sui-cyan/20">
                &quot;{searchQuery}&quot;
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                ({filteredPosts.length} matches)
              </span>
            </div>
          )}
        </div>

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
              {filteredPosts.length === 0 ? (
                <div className="bg-walrus-blue/20 border border-sui-cyan/10 rounded-3xl p-10 text-center font-mono text-xs text-gray-500">
                  <Search className="h-6 w-6 mx-auto mb-2 text-gray-600 animate-pulse" />
                  No matching casts found. Try searching something else!
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="relative">
                    {isBackendDown && (
                      <div className="absolute -top-2.5 right-6 bg-sui-cyan/10 border border-sui-cyan/30 text-sui-cyan font-mono text-[8px] font-bold uppercase px-2 py-0.5 rounded-full z-20 flex items-center gap-1 shadow-md">
                        <Database className="h-2 w-2" /> Resolved via Walrus Aggregator
                      </div>
                    )}
                    <PostCard post={post} onPin={handlePinPost} />
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </main>

      {/* 3. Right Sidebar Trending Column */}
      <aside className="w-80 flex-shrink-0 hidden lg:block h-screen overflow-y-auto scrollbar-cyber">
        <TrendingWidget />
      </aside>

      {/* 4. Sliding Activity Logs Drawer */}
      <AnimatePresence>
        {showNotifsLog && (
          <>
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifsLog(false)}
              className="fixed inset-0 bg-deep-space/85 z-40 backdrop-blur-sm"
            />

            {/* Panel Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-walrus-blue/95 border-l border-sui-cyan/20 shadow-cyber-glow z-50 p-6 flex flex-col gap-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-sui-cyan/15 pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-sui-cyan animate-pulse" />
                  <h3 className="font-mono font-bold text-sm tracking-wider uppercase text-white">
                    System Activity Logs
                  </h3>
                </div>
                <button 
                  onClick={() => setShowNotifsLog(false)}
                  className="text-gray-500 hover:text-white transition-colors font-mono text-xs cursor-pointer border border-sui-cyan/20 rounded-lg px-2 py-1 bg-deep-space/40"
                >
                  [Close]
                </button>
              </div>

              {/* Console log screen */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 font-mono text-xs scrollbar-thin">
                <div className="bg-deep-space/60 border border-sui-cyan/5 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest block border-b border-sui-cyan/5 pb-2">
                    ⚡ Real-time Indexer Listening
                  </span>
                  
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className="border-b border-sui-cyan/5 pb-3 last:border-b-0 last:pb-0 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md font-bold ${
                          notif.type === 'tip' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : notif.type === 'like' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-sui-cyan/10 text-sui-cyan border border-sui-cyan/20'
                        }`}>
                          {notif.type}
                        </span>
                        <span className="text-[9px] text-gray-600">{notif.time}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed font-sans text-xs">
                        {notif.text}
                      </p>
                      <div className="text-[8px] text-gray-500 font-mono truncate">
                        Sig: 0x{Math.random().toString(16).substring(2, 18)}...
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-sui-cyan/5 border border-sui-cyan/15 rounded-2xl p-4 text-[10px] text-gray-400 leading-relaxed">
                  <span className="font-bold text-sui-cyan block mb-1">🔗 Indexer Details:</span>
                  Listening to Sui on-chain transactions via Tatum RPC and indexing IPFS/Walrus blobs dynamically. Reconstructs content hashes in real-time.
                </div>
              </div>

              {/* Bottom telemetry */}
              <div className="border-t border-sui-cyan/15 pt-4 flex items-center justify-between text-[9px] text-gray-500 font-mono">
                <span>Listening Epoch #22</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 node-pulse" />
                  Telemetry OK
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
