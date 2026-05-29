'use client';

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Repeat2, 
  Coins, 
  BadgeCheck, 
  Database,
  Bookmark,
  Share2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { walrus } from '@/lib/walrus';
import { mockDb } from '@/lib/db';
import { useWalrusImage, WalrusImage } from '@/hooks/useWalrusImage';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PostCardVerificationPanel } from './PostCardVerificationPanel';
import { PostCardCommentComposer } from './PostCardCommentComposer';

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
    likes?: any[];
    reposts?: any[];
    repostOf?: {
      id: string;
      author: {
        displayName: string;
        username: string;
        walletAddress: string;
        avatarBlobId: string;
        verified: boolean;
      };
    } | null;
  };
  onCommentCreated?: (comment: any) => void;
  hideCommentComposer?: boolean;
}

export function PostCard({ post, onCommentCreated, hideCommentComposer = false }: PostCardProps) {
  const router = useRouter();
  
  // Resolve original author and post ID if this post is a repost
  const authorResolved = post.repostOf ? post.repostOf.author : post.author;
  const targetPostId = post.repostOf ? post.repostOf.id : post.id;
  
  const avatarUrlResolved = useWalrusImage(authorResolved.avatarBlobId);
  const mediaUrlResolved = useWalrusImage(post.mediaUrl);

  const [likes, setLikes] = useState(post.likeCount);
  const [hasLiked, setHasLiked] = useState(false);
  const [tipsCount, setTipsCount] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('input') || 
      target.closest('.no-navigate')
    ) {
      return;
    }
    router.push(`/posts/${targetPostId}`);
  };
  const [showMetadataPop, setShowMetadataPop] = useState(false);

  const [reposts, setReposts] = useState(post.repostCount);
  const [hasReposted, setHasReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Hydrate likes & reposts persistence states on mount
  useEffect(() => {
    const currentUserId = 'usr-2-sademir'; // Default Caster
    
    if (post.likes && Array.isArray(post.likes)) {
      const likedByMe = post.likes.some((l: any) => l.userId === currentUserId);
      setHasLiked(likedByMe);
    }
    
    if (post.reposts && Array.isArray(post.reposts)) {
      const repostedByMe = post.reposts.some((r: any) => r.authorId === currentUserId);
      setHasReposted(repostedByMe);
    }
  }, [post.likes, post.reposts]);
  


  // Hydrate bookmark state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const bookmarksRaw = localStorage.getItem('blobcast_bookmarks');
        const bookmarks = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
        setIsBookmarked(bookmarks.includes(targetPostId));
      } catch (e) {
        console.warn("Failed to load bookmarks from localStorage:", e);
      }
    }
  }, [targetPostId]);



  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikes(prev => nextLiked ? prev + 1 : prev - 1);

    try {
      const userId = 'usr-2-sademir';
      const res = await api.likePost(targetPostId, userId);
      if (res && res.data) {
        setLikes(res.data.likeCount);
        if (res.status === 'success' && typeof res.liked === 'boolean') {
          setHasLiked(res.liked);
        }
      }
    } catch (err) {
      console.warn("⚠️ API offline. Retaining local mock like state.");
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextReposted = !hasReposted;
    setHasReposted(nextReposted);
    setReposts(prev => nextReposted ? prev + 1 : prev - 1);

    if (!hasReposted) {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00F2FE', '#4FACFE', '#ffffff'],
      });
    }

    try {
      const authorId = 'usr-2-sademir';
      const res = await api.repostPost(targetPostId, authorId);
      if (res && res.data) {
        setReposts(res.data.repostCount);
        if (res.status === 'success' && typeof res.reposted === 'boolean') {
          setHasReposted(res.reposted);
        }
      }
    } catch (err) {
      console.warn("⚠️ API offline. Retaining local mock repost state.");
    }
  };

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      try {
        const bookmarksRaw = localStorage.getItem('blobcast_bookmarks');
        let bookmarks = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
        if (isBookmarked) {
          bookmarks = bookmarks.filter((id: string) => id !== targetPostId);
        } else {
          bookmarks.push(targetPostId);
          
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
      } catch (err) {
        console.error("Failed to update bookmarks:", err);
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
        post_id: targetPostId,
        author_wallet: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
        created_at: Math.floor(Date.now() / 1000),
        content: {
          text: newCommentText
        }
      };

      const walrusUploadInfo = await walrus.uploadBlob(commentBlob);
      const authorId = 'usr-2-sademir';

      try {
        const response = await api.createComment(targetPostId, authorId, walrusUploadInfo.blobId);
        if (response && response.data && response.data.comment) {
          const com = response.data.comment;
          setNewCommentText('');
          post.commentCount += 1;
          setShowComments(false);
          
          if (onCommentCreated) {
            onCommentCreated(com);
          }
          return;
        }
      } catch (apiErr) {
        console.warn("⚠️ API offline. Comment falling back to local cache.");
      }

      mockDb.comments.push({
        id: `comment_${Date.now()}`,
        postId: targetPostId,
        authorId: 'usr-2-sademir',
        walrusBlobId: walrusUploadInfo.blobId,
        createdAt: new Date()
      });

      setNewCommentText('');
      post.commentCount += 1;
      setShowComments(false);

      if (onCommentCreated) {
        onCommentCreated({
          id: `comment_${Date.now()}`,
          postId: targetPostId,
          authorId: 'usr-2-sademir',
          createdAt: new Date()
        });
      }

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
      onClick={handleCardClick}
      className="glass-panel glass-panel-hover rounded-cyber-lg shadow-cyber-glow p-5 border border-sui-cyan/5 hover:border-sui-cyan/20 cursor-pointer transition-all duration-300 relative group"
    >
      
      {/* Dynamic Glow Overlay behind Card */}
      <div className="absolute inset-0 bg-gradient-to-tr from-sui-cyan/2 to-tatum-purple/2 rounded-cyber-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Repost Indicator Header */}
      {post.repostOf && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 mb-3 relative z-10 pl-1 border-b border-sui-cyan/5 pb-2">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{post.author.displayName} reposted</span>
        </div>
      )}

      {/* Main post layout */}
      <div className="flex gap-4 relative z-10">
        
        {/* Avatar */}
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
          <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-bold text-xs font-mono text-sui-cyan relative">
            {avatarUrlResolved ? (
              <img 
                src={avatarUrlResolved} 
                alt={`${authorResolved.displayName}'s avatar`}
                className="h-full w-full object-cover z-10"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-neon-glow absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 select-none pointer-events-none">
              {(authorResolved.displayName || authorResolved.username || 'US').substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 flex flex-col gap-3">
          
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href="/profile" className="font-bold text-sm text-soft-white font-sans hover:underline cursor-pointer">
                {authorResolved.displayName}
              </Link>
              {authorResolved.verified && (
                <BadgeCheck className="h-4 w-4 text-sui-cyan fill-sui-cyan/10" />
              )}
              <span className="text-xs text-gray-500 font-mono">
                @{authorResolved.username}
              </span>
              <span className="text-[10px] text-gray-600 font-mono bg-sui-cyan/5 px-2 py-0.5 rounded-full border border-sui-cyan/10" title={authorResolved.walletAddress}>
                {truncateWallet(authorResolved.walletAddress)}
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
          {mediaUrlResolved && (
            <div className="mt-2 rounded-cyber-md overflow-hidden border border-sui-cyan/10 relative max-h-[350px] bg-walrus-blue/40 flex items-center justify-center">
              {/* Premium overlay badge for Walrus persistence */}
              <div className="absolute top-3 left-3 bg-walrus-blue/80 backdrop-filter backdrop-blur-md px-3 py-1.5 rounded-cyber-sm border border-sui-cyan/20 flex items-center gap-1.5 shadow-lg z-20">
                <Database className="h-3 w-3 text-sui-cyan animate-pulse" />
                <span className="text-[9px] font-mono text-sui-cyan font-bold tracking-wider uppercase">
                  Walrus Immutable Media
                </span>
              </div>
              
              <img 
                src={mediaUrlResolved} 
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
            <PostCardVerificationPanel
              showMetadataPop={showMetadataPop}
              authorResolved={authorResolved}
              walrusBlobId={post.walrusBlobId}
              blobHash={post.blobHash}
              suiObjectId={post.suiObjectId}
              truncateWallet={truncateWallet}
            />
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
              onClick={(e) => { 
                e.stopPropagation(); 
                if (hideCommentComposer) {
                  const inputEl = document.getElementById('detail-comment-textarea');
                  if (inputEl) {
                    inputEl.focus();
                    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                } else {
                  setShowComments(!showComments); 
                }
              }}
              className={`flex items-center gap-1.5 group transition-colors ${showComments && !hideCommentComposer ? 'text-sui-cyan font-bold' : 'hover:text-sui-cyan'}`}
              title="Comment on Cast"
            >
              <MessageSquare className={`h-4 w-4 transition-transform group-active:scale-125 ${showComments && !hideCommentComposer ? 'fill-sui-cyan/10' : ''}`} />
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
              onClick={(e) => { e.stopPropagation(); handleTip(); }}
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

          {/* Comment submit form inside PostCard */}
          <AnimatePresence>
            <PostCardCommentComposer
              showComments={showComments}
              hideCommentComposer={hideCommentComposer}
              newCommentText={newCommentText}
              setNewCommentText={setNewCommentText}
              isPostingComment={isPostingComment}
              handleCommentSubmit={handleCommentSubmit}
            />
          </AnimatePresence>



        </div>

      </div>

    </motion.div>
  );
}
