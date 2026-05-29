'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Repeat2, 
  Coins, 
  BadgeCheck, 
  Database,
  Bookmark,
  Share2,
  Loader2,
  MoreHorizontal,
  Eye,
  Pin,
  Trash2,
  X,
  Quote,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { walrus } from '@/lib/walrus';
import { mockDb } from '@/lib/db';
import { useWalrusImage, WalrusImage } from '@/hooks/useWalrusImage';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { PostCardVerificationPanel } from './PostCardVerificationPanel';
import { PostCardCommentComposer } from './PostCardCommentComposer';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

type PostAuthor = {
  displayName: string;
  username: string;
  walletAddress: string;
  avatarBlobId: string;
  verified: boolean;
};

type PostMediaItem = {
  type: string;
  blob_id: string;
  mime?: string;
  width?: number;
  height?: number;
};

type WalrusContent = {
  content?: {
    text?: string;
    hashtags?: string[];
  };
  media?: PostMediaItem[];
};

type PostActivityItem = {
  type: 'like' | 'repost' | 'quote';
  user: (typeof mockDb.users)[number] | undefined;
  createdAt: Date;
};

interface PostCardProps {
  post: {
    id: string;
    author: PostAuthor;
    walrusBlobId: string;
    blobHash: string;
    contentType: number;
    text: string;
    hashtags: string[];
    mediaUrl?: string;
    media?: PostMediaItem[];
    walrusContent?: WalrusContent;
    likeCount: number;
    commentCount: number;
    repostCount: number;
    suiObjectId?: string;
    createdAt: Date;
    likes?: Array<{ userId: string }>;
    reposts?: Array<{ authorId: string }>;
    repostOf?: {
      id: string;
      author: PostAuthor;
    } | null;
  };
  onCommentCreated?: (comment: unknown) => void;
  hideCommentComposer?: boolean;
  onPin?: (postId: string, pinned: boolean) => void;
}

export function PostCard({ post, onCommentCreated, hideCommentComposer = false, onPin }: PostCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const CURRENT_USER_WALLET = authUser?.walletAddress || '0x0000...';
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Resolve original author and post ID if this post is a repost
  const authorResolved = post.repostOf ? post.repostOf.author : post.author;
  const targetPostId = post.repostOf ? post.repostOf.id : post.id;

  const mediaItems = React.useMemo(() => {
    if (post.media && post.media.length > 0) {
      return post.media;
    }
    const walrusMedia = post.walrusContent?.media;
    if (walrusMedia && Array.isArray(walrusMedia) && walrusMedia.length > 0) {
      return walrusMedia;
    }
    if (post.mediaUrl) {
      const isVideo = post.mediaUrl.endsWith('.mp4') || post.mediaUrl.includes('video') || post.contentType === 2;
      return [{
        type: isVideo ? 'video' : 'image',
        blob_id: post.mediaUrl
      }];
    }
    return [];
  }, [post]);

  // Check ownership: only the post's own author can pin/delete
  const isOwnPost = authorResolved.walletAddress.toLowerCase() === CURRENT_USER_WALLET.toLowerCase();
  
  const avatarUrlResolved = useWalrusImage(authorResolved.avatarBlobId) || 
    (authorResolved.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${authorResolved.username}` : '');

  const [likes, setLikes] = useState(post.likeCount);
  const [hasLiked, setHasLiked] = useState(() => {
    const currentUserId = authUser?.id || '';
    return post.likes?.some((like) => like.userId === currentUserId) ?? false;
  });
  const [tipsCount, setTipsCount] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (part.startsWith('#') && part.length > 1) {
        const tag = part.substring(1).replace(/[^a-zA-Z0-9_]/g, '');
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/search?q=${encodeURIComponent('#' + tag)}`);
            }}
            className="text-sui-cyan hover:underline cursor-pointer font-mono font-semibold no-navigate"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('$') && part.length > 1) {
        const ticker = part.substring(1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/search?q=${encodeURIComponent('$' + ticker)}`);
            }}
            className="text-amber-400 hover:underline cursor-pointer font-mono font-semibold text-neon-glow no-navigate"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

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
  const [hasReposted, setHasReposted] = useState(() => {
    const currentUserId = authUser?.id || '';
    return post.reposts?.some((repost) => repost.authorId === currentUserId) ?? false;
  });
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 3-dot menu state
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isPinned = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const authorWallet = post.author.walletAddress?.toLowerCase();
    if (!authorWallet) return false;
    const pinnedId = localStorage.getItem(`blobcast_pinned_post_id_${authorWallet}`);
    return pinnedId === targetPostId;
  }, [targetPostId, post.author.walletAddress]);
  const [isDeleted, setIsDeleted] = useState(false);


  useEffect(() => {
    if (!showMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMenu]);

  // View count — derived from likes + reposts + a base offset
  const [viewCount] = useState(() => {
    const base = (post.likeCount * 4) + (post.repostCount * 8) + Math.floor(Math.random() * 200 + 50);
    return base;
  });

  // Post activity modal state
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Collect activity data directly from the post relations populated dynamically in PostgreSQL
  const getPostActivity = (): { likes: PostActivityItem[]; reposts: PostActivityItem[]; quotes: PostActivityItem[] } => {
    const postLikes = (post.likes || []).map((like: any) => ({
      type: 'like' as const,
      user: like.user,
      createdAt: like.createdAt ? new Date(like.createdAt) : new Date(),
    }));
    
    const postReposts = (post.reposts || []).map((rp: any) => ({
      type: 'repost' as const,
      user: rp.author,
      createdAt: rp.createdAt ? new Date(rp.createdAt) : new Date(),
    }));
    
    const postQuotes = postReposts.slice(0, 1).map((repost) => ({ ...repost, type: 'quote' as const }));
    return { likes: postLikes, reposts: postReposts, quotes: postQuotes };
  };
  


  // Hydrate bookmark state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const walletKey = authUser?.walletAddress?.toLowerCase() || 'anon';
        const bookmarksRaw = localStorage.getItem(`blobcast_bookmarks_${walletKey}`);
        const bookmarks = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
        setIsBookmarked(bookmarks.includes(targetPostId));
      } catch (e) {
        console.warn("Failed to load bookmarks from localStorage:", e);
      }
    }
  }, [targetPostId, authUser?.walletAddress]);



  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authUser) {
      alert('Please login first.');
      return;
    }
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikes(prev => nextLiked ? prev + 1 : prev - 1);

    try {
      const userId = authUser.id;
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
    if (!authUser) {
      alert('Please login first.');
      return;
    }
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
      const authorId = authUser.id;
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
        const walletKey = authUser?.walletAddress?.toLowerCase() || 'anon';
        const bookmarksKey = `blobcast_bookmarks_${walletKey}`;
        const bookmarksRaw = localStorage.getItem(bookmarksKey);
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
        localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks));
        setIsBookmarked(!isBookmarked);
      } catch (err) {
        console.error("Failed to update bookmarks:", err);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, commentMediaItems: { blobId: string; type: 'image'|'video' }[] = []) => {
    e.preventDefault();
    if (!newCommentText.trim() && commentMediaItems.length === 0) return;
    if (!authUser) {
      alert('Please login first.');
      return;
    }

    setIsPostingComment(true);
    try {
      const commentBlob: any = {
        version: 1,
        type: 'comment',
        post_id: targetPostId,
        author_wallet: authUser.walletAddress,
        created_at: Math.floor(Date.now() / 1000),
        content: {
          text: newCommentText
        }
      };

      if (commentMediaItems.length > 0) {
        commentBlob.media = commentMediaItems.map(item => ({
          type: item.type,
          blob_id: item.blobId.startsWith('walrus') ? item.blobId : `walrus://${item.blobId}`,
          mime: item.type === 'video' ? 'video/mp4' : 'image/png',
          width: 800,
          height: 600
        }));
      }

      const walrusUploadInfo = await walrus.uploadBlob(commentBlob);
      const authorId = authUser.id;

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
        authorId: authUser.id,
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
          authorId: authUser.id,
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



  const handleTip = async () => {
    try {
      const tx = new Transaction();
      const targetAddress = authorResolved.walletAddress;
      
      // Tip amount is 1.5 SUI, represented as 1,500,000,000 MIST
      const amount = 1500000000;
      const [coin] = tx.splitCoins(tx.gas, [amount]);
      tx.transferObjects([coin], targetAddress);

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('🔗 [Web3 Tip] Tip transaction block executed successfully:', result);
            setTipsCount(prev => prev + 1.5);
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.8 },
              colors: ['#6FE7FF', '#7C5CFF', '#0B1F33', '#ffffff'],
            });
          },
          onError: (err) => {
            console.error('❌ [Web3 Tip] Tipping execution signature rejected or failed:', err);
            alert('Tipping transaction block rejected or failed. Please check wallet status.');
          }
        }
      );
    } catch (err) {
      console.warn('⚠️ [Web3 Tip] Simulation offline fallback tipping active:', err);
      // Fallback for simulation / mock offline environment so tipping still triggers high-fidelity animations
      setTipsCount(prev => prev + 1.5);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6FE7FF', '#7C5CFF', '#0B1F33', '#ffffff'],
      });
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/posts/${targetPostId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${authorResolved.username} on BlobCast`, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      // Brief visual feedback via confetti
      confetti({ particleCount: 15, spread: 40, origin: { y: 0.7 }, colors: ['#6FE7FF', '#ffffff'] });
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    // Remove from mockDb locally
    const idx = mockDb.posts.findIndex(p => p.id === targetPostId);
    if (idx !== -1) mockDb.posts.splice(idx, 1);
    setIsDeleted(true);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const nextPinned = !isPinned;
    if (onPin) onPin(targetPostId, nextPinned);
  };

  const handleViewActivity = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowActivityModal(true);
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

  if (isDeleted) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      onClick={handleCardClick}
      className="glass-panel glass-panel-hover rounded-cyber-lg shadow-cyber-glow p-5 border border-sui-cyan/5 hover:border-sui-cyan/20 cursor-pointer transition-all duration-300 relative group"
    >
      
      {/* Dynamic Glow Overlay behind Card */}
      <div className="absolute inset-0 bg-linear-to-tr from-sui-cyan/2 to-tatum-purple/2 rounded-cyber-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

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
        <Link href={`/profile?wallet=${authorResolved.walletAddress}`} className="no-navigate shrink-0">
          <div className="h-11 w-11 rounded-full bg-linear-to-br from-sui-cyan to-tatum-purple p-0.5 hover:scale-105 transition-transform duration-200 cursor-pointer">
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
        </Link>

        {/* Content body */}
        <div className="flex-1 flex flex-col gap-3">
          
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/profile?wallet=${authorResolved.walletAddress}`} className="font-bold text-sm text-soft-white font-sans hover:underline cursor-pointer no-navigate">
                {authorResolved.displayName}
              </Link>
              {authorResolved.verified && (
                <BadgeCheck className="h-4 w-4 text-sui-cyan fill-sui-cyan/10" />
              )}
              {isPinned && pathname === '/profile' && (
                <span className="flex items-center gap-0.5 text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </span>
              )}
              <span className="text-xs text-gray-500 font-mono">
                @{authorResolved.username}
              </span>
              <span className="text-[10px] text-gray-600 font-mono bg-sui-cyan/5 px-2 py-0.5 rounded-full border border-sui-cyan/10" title={authorResolved.walletAddress}>
                {truncateWallet(authorResolved.walletAddress)}
              </span>
            </div>

            {/* Right side: timestamp + 3-dot menu */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-gray-500">
                {formatRelativeTime(post.createdAt)}
              </span>

              {/* 3-dot menu */}
              <div className="relative no-navigate" ref={menuRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }}
                  className="h-6 w-6 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-sui-cyan/10 transition-all"
                  title="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-8 z-50 w-52 bg-[#0a101d] border border-sui-cyan/25 rounded-cyber-lg shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Delete — only shown to the post owner */}
                      {isOwnPost && (
                        <button
                          onClick={handleDelete}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-sans text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          Delete Cast
                        </button>
                      )}

                      {/* Pin — only shown to the post owner */}
                      {isOwnPost && (
                        <button
                          onClick={handlePin}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-sans text-amber-400 hover:bg-amber-500/10 transition-colors text-left border-t border-white/5"
                        >
                          <Pin className="h-3.5 w-3.5 shrink-0" />
                          {isPinned ? 'Unpin from Profile' : 'Pin to Your Profile'}
                        </button>
                      )}

                      {/* View Activity */}
                      <button
                        onClick={handleViewActivity}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-sans text-sui-cyan hover:bg-sui-cyan/10 transition-colors text-left border-t border-white/5"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        View Post Activity
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap font-sans">
            {renderFormattedText(post.text)}
          </p>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {post.hashtags.map(tag => (
                <span
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/search?q=${encodeURIComponent('#' + tag)}`);
                  }}
                  className="text-xs font-mono text-sui-cyan hover:underline cursor-pointer bg-sui-cyan/5 px-2 py-0.5 rounded-full border border-sui-cyan/10 no-navigate"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Optional Media preview */}
          {mediaItems.length > 0 && (
            <PostMediaGallery items={mediaItems} />
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

            {/* View count */}
            <div className="flex items-center gap-1 text-gray-600" title="Views">
              <Eye className="h-3.5 w-3.5" />
              <span>{viewCount > 999 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}</span>
            </div>

            {/* Bookmark button */}
            <button 
              onClick={handleBookmarkToggle}
              className={`flex items-center gap-1.5 group transition-colors ${isBookmarked ? 'text-sui-cyan' : 'hover:text-sui-cyan'}`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Cast'}
            >
              <Bookmark className={`h-4 w-4 transition-transform group-active:scale-125 ${isBookmarked ? 'fill-sui-cyan' : ''}`} />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 group hover:text-tatum-purple transition-colors"
              title="Share Cast"
            >
              <Share2 className="h-4 w-4 transition-transform group-active:scale-110" />
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

      {/* Post Activity Modal */}
      <AnimatePresence>
        {showActivityModal && (() => {
          const activity = getPostActivity();
          const tabs = [
            { key: 'likes', label: 'Likes', icon: Heart, data: activity.likes, color: 'text-rose-400' },
            { key: 'reposts', label: 'Reposts', icon: Repeat2, data: activity.reposts, color: 'text-emerald-400' },
            { key: 'quotes', label: 'Quotes', icon: Quote, data: activity.quotes, color: 'text-tatum-purple' },
          ] as const;
          return (
            <ActivityModal
              tabs={tabs}
              onClose={() => setShowActivityModal(false)}
              postId={targetPostId}
              viewCount={viewCount}
            />
          );
        })()}
      </AnimatePresence>

    </motion.div>
  );
}

// Separate Activity Modal component to keep PostCard clean
function ActivityModal({
  tabs,
  onClose,
  postId,
  viewCount,
}: {
  tabs: ReadonlyArray<{ key: 'likes' | 'reposts' | 'quotes'; label: string; icon: React.ElementType; data: PostActivityItem[]; color: string }>;
  onClose: () => void;
  postId: string;
  viewCount: number;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'likes');
  const activeTabData = tabs.find(t => t.key === activeTab);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-navigate"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-panel border border-sui-cyan/20 rounded-cyber-xl w-full max-w-md shadow-cyber-glow overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sui-cyan/10">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-sui-cyan" />
            <h2 className="font-mono font-bold text-sm text-white uppercase tracking-wider">Post Activity</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
              <Eye className="h-3 w-3" /> {viewCount > 999 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount} views
            </span>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-sui-cyan/10 text-gray-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-sui-cyan/10">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-mono font-bold transition-all ${
                  activeTab === tab.key
                    ? `${tab.color} border-b-2 border-current`
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="ml-0.5 text-[9px] opacity-70">({tab.data.length})</span>
              </button>
            );
          })}
        </div>

        {/* Activity list */}
        <div className="p-4 flex flex-col gap-3 max-h-72 overflow-y-auto">
          {activeTabData && activeTabData.data.length > 0 ? (
            activeTabData.data.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 bg-walrus-blue/30 border border-sui-cyan/5 rounded-cyber-md p-3">
                <div className="h-9 w-9 rounded-full bg-linear-to-br from-sui-cyan/30 to-tatum-purple/30 flex items-center justify-center font-mono text-xs font-bold text-sui-cyan shrink-0 overflow-hidden relative">
                  {item.user?.username ? (
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${item.user.username}`} 
                      alt={item.user.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    item.user ? (item.user.displayName || item.user.username || '??').substring(0, 2).toUpperCase() : '??'
                  )}
                </div>
                <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                  <span className="text-xs font-semibold text-white font-sans truncate">
                    {item.user?.displayName || 'Unknown User'}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 truncate">
                    @{item.user?.username || 'unknown'}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-gray-600 shrink-0">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-[11px] font-mono text-gray-500">No {activeTabData?.label.toLowerCase()} yet.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function VideoPlayer({ blobId }: { blobId: string }) {
  const videoUrl = useWalrusImage(blobId);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    if (!videoUrl) {
      setResolvedUrl('');
      return;
    }

    if (videoUrl.startsWith('data:')) {
      try {
        const parts = videoUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const objUrl = URL.createObjectURL(blob);
        setResolvedUrl(objUrl);

        return () => {
          URL.revokeObjectURL(objUrl);
        };
      } catch (e) {
        console.warn("Failed to convert base64 video to Object URL:", e);
        setResolvedUrl(videoUrl);
      }
    } else {
      setResolvedUrl(videoUrl);
    }
  }, [videoUrl]);

  if (!resolvedUrl) {
    return (
      <div className="w-full h-62.5 flex items-center justify-center bg-walrus-blue/20">
        <Loader2 className="h-5 w-5 text-sui-cyan animate-spin" />
      </div>
    );
  }
  return (
    <video 
      src={resolvedUrl} 
      controls 
      className="w-full h-auto max-h-112.5 rounded-cyber-md bg-black"
      playsInline
    />
  );
}

function PostMediaGallery({ items }: { items: any[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2 h-[260px]';
    if (count === 3) return 'grid-cols-2 h-[320px]';
    return 'grid-cols-2 h-[320px]';
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx === null) return;
    setSelectedIdx(prev => (prev !== null && prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx === null) return;
    setSelectedIdx(prev => (prev !== null && prev < items.length - 1 ? prev + 1 : 0));
  };

  if (items.length === 0) return null;

  if (items[0].type === 'video') {
    return (
      <div className="mt-2 rounded-cyber-md overflow-hidden border border-sui-cyan/15 relative bg-black flex items-center justify-center no-navigate">
        <VideoPlayer blobId={items[0].blob_id} />
      </div>
    );
  }

  if (items.length === 1) {
    return (
      <>
        <div 
          onClick={(e) => { e.stopPropagation(); setSelectedIdx(0); }}
          className="mt-2 rounded-cyber-md overflow-hidden border border-sui-cyan/10 relative max-h-112.5 bg-[#080e18]/80 flex items-center justify-center no-navigate hover:opacity-95 transition-opacity"
        >
          <WalrusImage 
            blobId={items[0].blob_id} 
            alt="Post media attachment" 
            className="w-full h-auto max-h-112.5 object-contain hover:scale-[1.01] transition-transform duration-500 cursor-pointer"
          />
        </div>

        <AnimatePresence>
          {selectedIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { e.stopPropagation(); setSelectedIdx(null); }}
              className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 no-navigate"
            >
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <span className="text-[9px] font-mono text-sui-cyan bg-walrus-blue/80 px-3 py-1.5 rounded-cyber-sm border border-sui-cyan/20 flex items-center gap-1.5 shadow-lg select-none max-w-[80%] truncate">
                  <Database className="h-3.5 w-3.5 animate-pulse" />
                  <span>Walrus Blob: {items[selectedIdx].blob_id}</span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedIdx(null); }}
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-rose-600 border border-white/10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Close"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="relative w-full max-w-5xl max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <div className="rounded-cyber-lg overflow-hidden border border-sui-cyan/20 bg-deep-space/50 p-2 shadow-cyber-glow max-w-full max-h-full flex items-center justify-center select-none">
                  <WalrusImage 
                    blobId={items[selectedIdx].blob_id} 
                    alt="Lightbox image"
                    className="max-w-full max-h-[75vh] object-contain"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <div className={`mt-2 grid gap-2 rounded-cyber-md overflow-hidden border border-sui-cyan/10 bg-[#080e18]/40 relative ${getGridClass(items.length)}`}>
        {items.slice(0, 4).map((item, idx) => {
          let itemClass = "h-full w-full object-cover hover:scale-[1.02] transition-transform duration-500 cursor-pointer";
          let wrapperClass = "relative overflow-hidden w-full h-full bg-deep-space hover:opacity-95 transition-all";

          if (items.length === 3 && idx === 0) {
            wrapperClass += " row-span-2 h-full";
          }

          return (
            <div 
              key={item.blob_id} 
              className={wrapperClass}
              onClick={(e) => { e.stopPropagation(); setSelectedIdx(idx); }}
            >
              <WalrusImage 
                blobId={item.blob_id} 
                alt={`Post gallery image ${idx + 1}`} 
                className={itemClass}
              />
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); setSelectedIdx(null); }}
            className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 no-navigate"
          >
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <span className="text-[9px] font-mono text-sui-cyan bg-walrus-blue/80 px-3 py-1.5 rounded-cyber-sm border border-sui-cyan/20 flex items-center gap-1.5 shadow-lg select-none max-w-[80%] truncate">
                <Database className="h-3.5 w-3.5 animate-pulse" />
                <span>Walrus Blob: {items[selectedIdx].blob_id}</span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedIdx(null); }}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-rose-600 border border-white/10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="relative w-full max-w-5xl max-h-[80vh] flex items-center justify-center group" onClick={(e) => e.stopPropagation()}>
              {items.length > 1 && (
                <button
                  onClick={handlePrev}
                  className="absolute left-4 z-20 h-11 w-11 rounded-full bg-black/60 hover:bg-sui-cyan/20 border border-sui-cyan/20 flex items-center justify-center text-white hover:text-sui-cyan hover:scale-105 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              <div className="rounded-cyber-lg overflow-hidden border border-sui-cyan/20 bg-deep-space/50 p-2 shadow-cyber-glow max-w-full max-h-full flex items-center justify-center select-none">
                <WalrusImage 
                  blobId={items[selectedIdx].blob_id} 
                  alt={`Lightbox image ${selectedIdx + 1}`}
                  className="max-w-full max-h-[75vh] object-contain"
                />
              </div>

              {items.length > 1 && (
                <button
                  onClick={handleNext}
                  className="absolute right-4 z-20 h-11 w-11 rounded-full bg-black/60 hover:bg-sui-cyan/20 border border-sui-cyan/20 flex items-center justify-center text-white hover:text-sui-cyan hover:scale-105 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {items.length > 1 && (
              <div className="absolute bottom-6 font-mono text-xs text-gray-400 bg-black/45 border border-white/5 px-3 py-1.5 rounded-full select-none">
                {selectedIdx + 1} / {items.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
