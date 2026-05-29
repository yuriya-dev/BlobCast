'use client';

import React, { useState, useEffect, use } from 'react';
import { ArrowLeft, Loader2, Terminal, ShieldCheck, Database, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostCard } from '@/components/feed/PostCard';
import { WalrusImage } from '@/hooks/useWalrusImage';
import { api } from '@/lib/api';
import { walrus } from '@/lib/walrus';
import { mockDb } from '@/lib/db';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PostDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [post, setPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPostAndComments();
  }, [id]);

  const loadPostAndComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.fetchPostById(id);
      if (response && response.data && response.data.post) {
        const p = response.data.post;

        let text = 'Immutable social post stored on Walrus.';
        let hashtags: string[] = [];
        let mediaUrl: string | undefined = undefined;

        if (p.walrusBlobId) {
          try {
            const content = await walrus.getBlob(p.walrusBlobId);
            if (content && typeof content === 'object') {
              const contentObj = content as any;
              if (contentObj.content?.text) text = contentObj.content.text;
              if (contentObj.content?.hashtags) hashtags = contentObj.content.hashtags;
              if (contentObj.media && contentObj.media.length > 0) {
                mediaUrl = contentObj.media[0].blob_id;
              }
            }
          } catch (err) {
            console.warn("⚠️ Failed to load Walrus payload:", err);
          }
        }

        const mappedPost = {
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

        const mappedComments = p.comments || [];

        setPost(mappedPost);
        setComments(mappedComments);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("⚠️ API server offline. Falling back to offline database cache.", err);
    }

    // Offline DB fallback
    const offlinePost = mockDb.posts.find(p => p.id === id);
    if (offlinePost) {
      const author = mockDb.users.find(u => u.id === offlinePost.authorId) || {
        displayName: 'Yuriya',
        username: 'yuriya',
        walletAddress: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
        avatarBlobId: 'walrus://yuriya-avatar',
        verified: true
      };

      setPost({
        id: offlinePost.id,
        author: {
          displayName: author.displayName,
          username: author.username,
          walletAddress: author.walletAddress,
          avatarBlobId: author.avatarBlobId,
          verified: author.verified
        },
        walrusBlobId: offlinePost.walrusBlobId,
        blobHash: offlinePost.blobHash,
        contentType: offlinePost.contentType,
        text: offlinePost.id === 'post-1'
          ? 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!'
          : 'Excited about decentralized social layers! Decentralization means true resilience. Check this out: even if our centralized server is powered down, this content remains accessible directly from the Walrus storage aggregator grid!',
        hashtags: ['decentralized', 'walrus'],
        mediaUrl: offlinePost.id === 'post-2' ? 'walrus://blob-post-2-image' : undefined,
        likeCount: offlinePost.likeCount,
        commentCount: offlinePost.commentCount,
        repostCount: offlinePost.repostCount,
        createdAt: offlinePost.createdAt
      });

      // Load offline comments
      const existingComments = mockDb.comments.filter(c => c.postId === id);
      const mappedComments = existingComments.map(c => {
        const u = mockDb.users.find(user => user.id === c.authorId) || {
          displayName: 'Vitalik Buterin',
          username: 'vitalik',
          avatarBlobId: 'walrus://vitalik-avatar'
        };
        return {
          id: c.id,
          author: u,
          text: (c.walrusBlobId || '').startsWith('walrus://blob-comment-')
            ? 'Excellent point! Storing this commentary permanently on Walrus as well.'
            : 'Verifiable sub-blob published on Walrus.',
          createdAt: c.createdAt
        };
      });

      setComments(mappedComments);
      setIsLoading(false);
    } else {
      setError("Verifiable Cast Details not found in the decentralized registry.");
      setIsLoading(false);
    }
  };

  const handleCommentSubmit = (newComment: any) => {
    // Reload thread to show new comments dynamically
    loadPostAndComments();
  };

  return (
    <div className="min-h-screen bg-deep-space text-soft-white font-sans selection:bg-sui-cyan/30 selection:text-white relative overflow-hidden">
      
      {/* Visual cyber background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sui-cyan/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-tatum-purple/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto h-screen flex">
        
        {/* Left Sidebar navigation column */}
        <div className="w-64 hidden md:block flex-shrink-0 h-full">
          <Sidebar />
        </div>

        {/* Center detailed feed timeline layout */}
        <main className="flex-1 flex flex-col border-r border-sui-cyan/5 overflow-y-auto h-full scrollbar-cyber">
          
          {/* Header navigation bar */}
          <header className="sticky top-0 z-30 glass-panel border-b border-sui-cyan/5 px-6 py-4 flex items-center gap-4">
            <Link 
              href="/feed"
              className="p-2 rounded-cyber-sm border border-sui-cyan/15 hover:border-sui-cyan/40 hover:bg-sui-cyan/10 transition-all text-sui-cyan flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex flex-col">
              <h1 className="font-mono font-bold text-sm tracking-wider uppercase text-white text-neon-glow">
                Cast Thread
              </h1>
              <span className="text-[9px] font-mono text-gray-500 uppercase mt-0.5">
                Decentralized on-chain verified commentary index
              </span>
            </div>
          </header>

          <div className="p-6 flex flex-col gap-6">
            {isLoading ? (
              <div className="flex flex-col gap-3 items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-sui-cyan animate-spin" />
                <span className="font-mono text-xs text-sui-cyan animate-pulse uppercase tracking-widest">
                  Querying Shard Registry...
                </span>
              </div>
            ) : error ? (
              <div className="glass-panel border border-rose-500/15 rounded-cyber-lg p-8 flex flex-col items-center justify-center text-center gap-3">
                <Terminal className="h-12 w-12 text-rose-500 animate-pulse" />
                <h3 className="font-mono font-bold text-soft-white uppercase">Registry Sync Error</h3>
                <p className="text-xs text-gray-400 max-w-md">{error}</p>
                <Link href="/feed" className="mt-4 px-4 py-2 border border-sui-cyan/20 hover:border-sui-cyan/50 text-xs font-mono rounded-cyber-sm text-sui-cyan uppercase transition-all">
                  Back to Feed
                </Link>
              </div>
            ) : (
              <>
                {/* Parent social cast rendering */}
                {post && (
                  <PostCard post={{ ...post, commentCount: comments.length }} />
                )}

                {/* Subtitle comment count index */}
                <div className="flex items-center gap-2 border-b border-sui-cyan/5 pb-2 mt-2">
                  <MessageSquare className="h-4 w-4 text-sui-cyan" />
                  <span className="font-mono text-xs text-sui-cyan uppercase tracking-wider font-bold">
                    Comments List ({comments.length})
                  </span>
                </div>

                {/* Comments thread list */}
                <div className="flex flex-col gap-4">
                  {comments.length === 0 ? (
                    <div className="glass-panel border border-sui-cyan/5 rounded-cyber-md p-6 text-center text-xs text-gray-500 font-mono">
                      No verified commentary blobs found on this post. Be the first to reply!
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="glass-panel rounded-cyber-md p-4 border border-sui-cyan/5 flex gap-3.5 hover:border-sui-cyan/15 transition-all">
                        {/* Comment author avatar */}
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
                          <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-xs font-bold text-sui-cyan relative">
                            <WalrusImage 
                              blobId={comment.author?.avatarBlobId} 
                              alt={`${comment.author?.displayName}'s avatar`}
                              className="h-full w-full object-cover z-10"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 text-neon-glow font-mono text-[10px]">
                              {(comment.author?.displayName || comment.author?.username || 'AN').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Comment content body */}
                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                              <span className="font-bold text-gray-200">{comment.author?.displayName || 'Anonymous Caster'}</span>
                              <span>@{comment.author?.username || 'anonymous'}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-600">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="text-gray-200 font-sans text-xs leading-relaxed mt-1">
                            {comment.text}
                          </p>

                          {/* Cryptographic sub-verification info indicator */}
                          {comment.walrusBlobId && (
                            <div className="flex items-center gap-1.5 mt-2 bg-walrus-blue/30 border border-sui-cyan/5 rounded p-1.5 font-mono text-[8px] text-gray-500 w-fit">
                              <ShieldCheck className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400/90 font-bold uppercase">Verified Sub-Blob:</span>
                              <span className="text-gray-400 font-semibold truncate w-36" title={comment.walrusBlobId}>
                                {comment.walrusBlobId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

        </main>

        {/* Right Trending column */}
        <div className="w-80 hidden lg:block flex-shrink-0 h-full p-6 border-l border-sui-cyan/5">
          <TrendingWidget />
        </div>

      </div>

    </div>
  );
}
