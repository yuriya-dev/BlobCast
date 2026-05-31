'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Home, 
  Terminal, 
  Compass, 
  Bell, 
  User, 
  Zap, 
  MessageSquareShare,
  Bookmark,
  Wallet,
  MessageCircle
} from 'lucide-react';
import { ConnectButton } from '@mysten/dapp-kit';
import { PostComposer } from './PostComposer';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { mockDb, type MockPost } from '@/lib/db';
import { useAuth } from '@/components/providers/AuthProvider';

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const data = await api.fetchTotalUnreadCount();
        const count = data?.data?.unreadCount ?? 0;
        setUnreadCount(count);
        console.log('Fetched unread count:', count);
      } catch {
        setUnreadCount(0);
        console.log('Failed to fetch unread count');
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);

    // Re-fetch immediately when user reads a conversation
    const handleMessagesRead = () => fetchUnread();
    window.addEventListener('blobcast:messages-read', handleMessagesRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('blobcast:messages-read', handleMessagesRead);
    };
  }, [user?.id]);

  const handleComposerPost = async (newPost: any) => {
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

    try {
      await api.createPost({
        authorId: newPost.authorId,
        suiObjectId: newPost.suiObjectId || null,
        walrusBlobId: newPost.walrusBlobId,
        blobHash: newPost.blobHash,
        contentType: newPost.contentType,
        visibility: newPost.visibility,
      });
    } catch (err) {
      console.warn('⚠️ Failed to post via API. Storing in local session cache.', err);
      mockDb.posts.unshift(mockPostObj);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('blobcast:new-post'));
    }
  };

  const navigation = [
    { name: 'Home', href: '/feed', icon: Home },
    { name: 'Explore', href: '/explore', icon: Compass },
    { name: 'Messages', href: '/messages', icon: MessageCircle, ...(unreadCount > 0 ? { badge: unreadCount } : {}) },
    { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    // { name: 'Diagnostics', href: '/dev', icon: Terminal },
  ];

  return (
    <div className={`flex flex-col gap-6 h-full p-4 border-r border-sui-cyan/5 ${isComposeOpen ? 'relative z-9999' : ''}`}>
      
      {/* Dynamic Cyber Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 py-1 group mb-4">
        <div className="h-9 w-9 rounded-cyber-md p-0.5 shrink-0 group-hover:rotate-6 transition-all duration-300">
          <img src="/logo.svg" alt="BlobCast" width={32} height={32} className="rounded-md" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono font-black text-sm tracking-widest text-white text-neon-glow leading-none">
            BLOBCAST
          </span>
          <span className="text-[9px] font-mono text-gray-500 mt-0.5 uppercase tracking-wider leading-none">
            Own Your Posts Forever
          </span>
        </div>
      </Link>
      
      {/* Navigation items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navigation.map((item) => {
          let isActive = false;
          if (item.href === '/profile') {
            const isProfilePath = pathname === '/profile';
            const walletQuery = searchParams.get('wallet');
            const isOwnProfile = !walletQuery || (user?.walletAddress
              ? walletQuery.toLowerCase() === user.walletAddress.toLowerCase()
              : false);
            isActive = !!(isProfilePath && isOwnProfile);
          } else {
            isActive = pathname === item.href;
          }
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-cyber-md text-sm font-mono tracking-wide transition-all ${
                isActive 
                  ? 'bg-sui-cyan/15 text-sui-cyan border border-sui-cyan/15' 
                  : 'text-gray-400 hover:text-white hover:bg-walrus-blue/40'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="h-4.5 min-w-4.5 px-1 bg-sui-cyan rounded-full text-[9px] font-bold text-deep-space flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom wallet connections */}
      <div className="mt-auto border-t border-sui-cyan/5 pt-6 flex flex-col gap-3">
        
        {/* Tatum RPC status tracker indicator */}
        <div className="flex items-center gap-2 bg-walrus-blue/50 border border-sui-cyan/10 rounded-cyber-md p-3 text-xs font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-400 node-pulse" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-gray-500">Tatum RPC</span>
            <span className="text-gray-300 font-semibold mt-0.5">Sui Gateway Active</span>
          </div>
        </div>

        {/* Sui Wallet DappKit Connect Button */}
        <div className="custom-wallet-connect-wrapper">
          <ConnectButton 
            connectText="Connect Wallet"
            className="w-full rounded-cyber-md! bg-linear-to-r! from-sui-cyan! to-tatum-purple! text-deep-space! font-mono! text-xs! font-bold! py-3! px-4! shadow-md! hover:opacity-90! transition-all! cursor-pointer!"
          />
        </div>

        {/* Glowing Neon Compose Button */}
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="w-full py-3 px-4 rounded-cyber-md border border-sui-cyan/20 hover:border-sui-cyan/50 bg-sui-cyan/10 text-sui-cyan font-mono text-xs font-bold tracking-wide hover:bg-sui-cyan/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-cyber-glow"
        >
          <MessageSquareShare className="h-4 w-4" />
          <span>New Cast</span>
        </button>

      </div>

      {/* Compose Modal Overlay */}
      {isComposeOpen && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-deep-space/80 backdrop-filter backdrop-blur-md p-4"
          onClick={() => setIsComposeOpen(false)}
        >
          <div
            className="glass-panel bg-walrus-blue rounded-cyber-lg shadow-cyber-glow max-w-lg w-full max-h-[90vh] overflow-y-auto border border-sui-cyan/25 relative flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsComposeOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white font-mono text-xs hover:underline cursor-pointer"
            >
              [Close]
            </button>
            <div className="mb-4">
              <h3 className="font-mono font-bold text-sm tracking-wider text-sui-cyan uppercase flex items-center gap-1.5">
                <MessageSquareShare className="h-4.5 w-4.5" /> Compose Verified Cast
              </h3>
              <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">
                Content will package verifiably into a Walrus JSON payload
              </p>
            </div>
            <PostComposer onPostCreated={(newPost) => {
              setIsComposeOpen(false);
              handleComposerPost(newPost);
            }} />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
