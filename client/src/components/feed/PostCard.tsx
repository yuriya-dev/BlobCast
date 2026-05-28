'use client';

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Repeat2, 
  Coins, 
  BadgeCheck, 
  Database,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Share2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { walrus } from '@/lib/walrus';
import { mockDb } from '@/lib/db';

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

  const [reposts, setReposts] = useState(post.repostCount);
  const [hasReposted, setHasReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Hydrate bookmark state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const bookmarksRaw = localStorage.getItem('blobcast_bookmarks');
        const bookmarks = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
        setIsBookmarked(bookmarks.includes(post.id));
      } catch (e) {
        console.warn("Failed to load bookmarks from localStorage:", e);
      }
    }
  }, [post.id]);

  // Load mock or real comments when thread is opened
  useEffect(() => {
    if (showComments && comments.length === 0) {
      const existingComments = mockDb.comments.filter(c => c.postId === post.id);
      if (existingComments.length > 0) {
        const mapped = existingComments.map(c => {
          const user = mockDb.users.find(u => u.id === c.authorId) || {
            displayName: 'Anonymous Caster',
            username: 'anonymous',
            avatarBlobId: ''
          };
          return {
            id: c.id,
            author: {
              displayName: user.displayName,
              username: user.username,
              avatarBlobId: user.avatarBlobId
            },
            text: (c.walrusBlobId || '').startsWith('walrus://blob-comment-') 
              ? 'Excellent point! Storing this commentary permanently on Walrus as well.' 
              : 'Verifiable sub-blob published on Walrus.',
            createdAt: c.createdAt
          };
        });
        setComments(mapped);
      } else if (post.commentCount > 0) {
        setComments([
          {
            id: `comment_seed_${post.id}`,
            author: {
              displayName: 'Vitalik Buterin',
              username: 'vitalik',
              avatarBlobId: 'walrus://vitalik-avatar'
            },
            text: 'Decentralized social layers are growing rapidly. Incredible interface design here!',
            createdAt: new Date(Date.now() - 3600000)
          }
        ]);
      }
    }
  }, [showComments, post.id, post.commentCount, comments.length]);

  const handleLike = () => {
    if (hasLiked) {
      setLikes(prev => prev - 1);
    } else {
      setLikes(prev => prev + 1);
    }
    setHasLiked(!hasLiked);
  };

  const handleRepost = () => {
    if (hasReposted) {
      setReposts(prev => prev - 1);
    } else {
      setReposts(prev => prev + 1);
      
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00F2FE', '#4FACFE', '#ffffff'],
      });
    }
    setHasReposted(!hasReposted);
  };

  const handleBookmarkToggle = () => {
    if (typeof window !== 'undefined') {
      try {
        const bookmarksRaw = localStorage.getItem('blobcast_bookmarks');
        let bookmarks = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
        if (isBookmarked) {
          bookmarks = bookmarks.filter((id: string) => id !== post.id);
        } else {
          bookmarks.push(post.id);
          
          confetti({
            particleCount: 20,
            angle: 120,
            spread: 45,
            origin: { x: 1 },
            colors: ['#6FE7FF', '#ffffff'],
          });
        }
        localStorage.setItem('blobcast_bookmarks', JSON.stringify(bookmarks));
        setIsBookmarked(!isBookmarked);
      } catch (e) {
        console.error("Failed to update bookmarks:", e);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsPostingComment(true);
    try {
      const commentBlob = {
        version: 1,
        type: 'comment',
        post_id: post.id,
        author_wallet: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
        created_at: Math.floor(Date.now() / 1000),
        content: {
          text: newCommentText
        }
      };

      const walrusUploadInfo = await walrus.uploadBlob(commentBlob);

      mockDb.comments.push({
        id: `comment_${Date.now()}`,
        postId: post.id,
        authorId: 'usr-2-sademir',
        walrusBlobId: walrusUploadInfo.blobId,
        createdAt: new Date()
      });

      setComments(prev => [
        ...prev,
        {
          id: `comment_${Date.now()}`,
          author: {
            displayName: 'Yuriya',
            username: 'yuriya',
            avatarBlobId: 'walrus://yuriya-avatar'
          },
          text: newCommentText,
          createdAt: new Date()
        }
      ]);

      setNewCommentText('');
      
      const originalPost = mockDb.posts.find(p => p.id === post.id);
      if (originalPost) {
        originalPost.commentCount += 1;
      }
      post.commentCount += 1;

    } catch (err) {
      console.error("❌ Failed to upload comment to Walrus:", err);
      alert("Error: Could not publish comment blob to Walrus.");
    } finally {
      setIsPostingComment(false);
    }
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
          <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-bold text-xs font-mono text-sui-cyan relative">
            {post.author.avatarBlobId ? (
              <img 
                src={walrus.resolveImageUrl(post.author.avatarBlobId)} 
                alt={`${post.author.displayName}'s avatar`}
                className="h-full w-full object-cover z-10"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-neon-glow absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 select-none pointer-events-none">
              {(post.author.displayName || post.author.username || 'US').substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 flex flex-col gap-3">
          
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href="/profile" className="font-bold text-sm text-soft-white font-sans hover:underline cursor-pointer">
                {post.author.displayName}
              </Link>
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
            <div className="mt-2 rounded-cyber-md overflow-hidden border border-sui-cyan/10 relative max-h-[350px] bg-walrus-blue/40 flex items-center justify-center">
              {/* Premium overlay badge for Walrus persistence */}
              <div className="absolute top-3 left-3 bg-walrus-blue/80 backdrop-filter backdrop-blur-md px-3 py-1.5 rounded-cyber-sm border border-sui-cyan/20 flex items-center gap-1.5 shadow-lg z-20">
                <Database className="h-3 w-3 text-sui-cyan animate-pulse" />
                <span className="text-[9px] font-mono text-sui-cyan font-bold tracking-wider uppercase">
                  Walrus Immutable Media
                </span>
              </div>
              
              <img 
                src={walrus.resolveImageUrl(post.mediaUrl)} 
                alt="Post media attachment" 
                className="w-full object-cover max-h-[350px] hover:scale-[1.01] transition-transform duration-500 cursor-pointer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
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
              className={`flex items-center gap-1.5 group transition-colors ${hasLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'}`}
            >
              <Heart className={`h-4 w-4 transition-transform group-active:scale-125 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{likes}</span>
            </button>
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 group transition-colors ${showComments ? 'text-sui-cyan font-bold' : 'hover:text-sui-cyan'}`}
            >
              <MessageSquare className={`h-4 w-4 transition-transform group-active:scale-125 ${showComments ? 'fill-sui-cyan/10' : ''}`} />
              <span>{post.commentCount}</span>
            </button>

            <button 
              onClick={handleRepost}
              className={`flex items-center gap-1.5 group transition-colors ${hasReposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-300'}`}
            >
              <Repeat2 className={`h-4 w-4 transition-transform group-active:scale-125 ${hasReposted ? 'rotate-180 text-emerald-400' : ''}`} />
              <span>{reposts}</span>
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

            {/* Bookmark button */}
            <button 
              onClick={handleBookmarkToggle}
              className={`flex items-center gap-1.5 group transition-colors ${isBookmarked ? 'text-sui-cyan' : 'hover:text-sui-cyan'}`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Cast'}
            >
              <Bookmark className={`h-4 w-4 transition-transform group-active:scale-125 ${isBookmarked ? 'fill-sui-cyan' : ''}`} />
            </button>
          </div>

          {/* Expandable Cyberpunk Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4 border-t border-sui-cyan/10 pt-4"
              >
                <div className="flex flex-col gap-3.5">
                  {/* Comments list */}
                  <div className="flex flex-col gap-3">
                    {comments.length === 0 ? (
                      <span className="text-[10px] text-gray-500 font-mono text-center py-2 block">
                        No comments casted yet. Be the first to verify comment!
                      </span>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 bg-walrus-blue/20 border border-sui-cyan/5 rounded-cyber-sm p-3 text-xs">
                          {/* Comment author avatar */}
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
                            <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-[9px] font-bold text-sui-cyan relative">
                              {comment.author.avatarBlobId ? (
                                <img 
                                  src={walrus.resolveImageUrl(comment.author.avatarBlobId)} 
                                  alt={`${comment.author.displayName}'s avatar`}
                                  className="h-full w-full object-cover z-10"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span className="absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 select-none pointer-events-none text-neon-glow font-mono text-[9px]">
                                {comment.author.username.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Comment text body */}
                          <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500">
                              <span className="font-bold text-gray-300">{comment.author.displayName}</span>
                              <span>@{comment.author.username}</span>
                            </div>
                            <p className="text-gray-200 font-sans text-xs leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment submit form */}
                  <form onSubmit={handleCommentSubmit} className="flex gap-3 items-center mt-1">
                    <input 
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Verify dynamic comment on Walrus nodes..."
                      className="flex-1 bg-walrus-blue/30 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2 text-xs text-soft-white outline-none focus:border-sui-cyan/50 font-sans"
                      maxLength={140}
                      required
                    />
                    <button
                      type="submit"
                      disabled={isPostingComment || !newCommentText.trim()}
                      className="px-4 py-2 rounded-cyber-sm bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isPostingComment ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Reply'
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </motion.div>
  );
}
