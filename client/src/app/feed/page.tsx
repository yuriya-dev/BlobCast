'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Tv, 
  Activity, 
  Bell,
  Search
} from 'lucide-react';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import { SearchInputWithRecommendations } from '@/components/feed/SearchInputWithRecommendations';
import { mockDb, MockPost } from '@/lib/db';
import { api, ApiPost } from '@/lib/api';
import { walrus } from '@/lib/walrus';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SocialFeedPage() {
  const { user: authUser } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle pin: move post to the very top of the feed (only for owner)
  const handlePinPost = async (postId: string, pinned: boolean) => {
    const nextPinnedId = pinned ? postId : null;
    const walletKey = authUser?.walletAddress?.toLowerCase();

    if (typeof window !== 'undefined' && walletKey) {
      if (pinned) {
        localStorage.setItem(`blobcast_pinned_post_id_${walletKey}`, postId);
      } else {
        localStorage.removeItem(`blobcast_pinned_post_id_${walletKey}`);
      }
    }

    if (!authUser) return;

    try {
      await api.upsertUserProfile({
        walletAddress: authUser.walletAddress,
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
    if (authUser) {
      (async () => {
        try {
          const res = await api.fetchUserProfile(authUser.walletAddress);
          if (res && res.data && res.data.user) {
            const user = res.data.user;
            const walletKey = authUser.walletAddress.toLowerCase();
            if (typeof window !== 'undefined') {
              if (user.pinnedPostId) {
                localStorage.setItem(`blobcast_pinned_post_id_${walletKey}`, user.pinnedPostId);
              } else {
                localStorage.removeItem(`blobcast_pinned_post_id_${walletKey}`);
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
  }, [authUser]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNewPost = () => {
      loadFeed();
    };

    window.addEventListener('blobcast:new-post', handleNewPost);
    return () => {
      window.removeEventListener('blobcast:new-post', handleNewPost);
    };
  }, []);



  const loadFeed = async () => {
    setIsLoading(true);

    const sortAndPinPosts = (postsList: any[]) => {
      const sorted = [...postsList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted;
    };

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
                
                // Support nested content.text or flat text
                if (contentObj.content?.text) {
                  text = contentObj.content.text;
                } else if (contentObj.text) {
                  text = contentObj.text;
                } else if (contentObj.content && typeof contentObj.content === 'string') {
                  text = contentObj.content;
                }

                // Support nested or flat hashtags
                if (contentObj.content?.hashtags) {
                  hashtags = contentObj.content.hashtags;
                } else if (contentObj.hashtags) {
                  hashtags = contentObj.hashtags;
                }

                // Support nested or flat media attachments
                const mediaList = contentObj.media || contentObj.content?.media || [];
                if (mediaList && mediaList.length > 0) {
                  media = mediaList;
                  mediaUrl = mediaList[0].blob_id || mediaList[0].blobUrl || mediaList[0].url;
                }
              } else if (typeof walrusContent === 'string' && walrusContent.length > 0) {
                // Plain text content
                text = walrusContent;
              }
            } catch (walrusErr) {
              console.warn(`⚠️ Failed to fetch Walrus blob payload for ${p.walrusBlobId}:`, walrusErr);
              // Generic fallback — show author name and timestamp so the post isn't a confusing stub
              text = `Cast by ${p.author?.displayName || p.author?.username || 'Anonymous'} · Stored on Walrus`;
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

      if (authUser) {
        usersMap[authUser.id] = {
          displayName: authUser.displayName,
          username: authUser.username,
          walletAddress: authUser.walletAddress,
          avatarBlobId: authUser.avatarBlobId,
          verified: authUser.verified
        };
      }

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

    if (authUser) {
      try {
        await api.createPost({
          authorId: authUser.id,
          suiObjectId: newPost.suiObjectId || null,
          walrusBlobId: newPost.walrusBlobId,
          blobHash: newPost.blobHash,
          contentType: newPost.contentType,
          visibility: newPost.visibility,
          mentions: newPost.walrusContent?.content?.mentions || []
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
          </div>
        </header>



        {/* Feed Scroll Content */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          
          {/* Post composer wrapper */}
          <PostComposer onPostCreated={handlePostCreated} />

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
        <div className="px-4 pt-4 pb-0">
          <SearchInputWithRecommendations placeholder="Search BlobCast..." />
        </div>
        <TrendingWidget />
      </aside>

    </div>
  );
}
