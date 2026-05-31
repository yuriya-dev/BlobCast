'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Heart, 
  UserPlus, 
  Coins, 
  AtSign, 
  MessageSquare, 
  Repeat,
  Loader2, 
  Database,
  ExternalLink,
  CheckCircle,
  Inbox
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { SearchInputWithRecommendations } from '@/components/feed/SearchInputWithRecommendations';
import { useAuth } from '@/components/providers/AuthProvider';
import { api } from '@/lib/api';
import { useWalrusImage } from '@/hooks/useWalrusImage';

// Helper to format relative time
function formatRelativeTime(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function NotificationActorAvatar({ actor }: { actor: any }) {
  const avatarUrl = useWalrusImage(actor?.avatarBlobId || null);
  const finalAvatar = avatarUrl || (actor?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${actor.username}` : '');
  
  if (!finalAvatar) {
    return (
      <span className="text-neon-glow inset-0 flex items-center justify-center bg-walrus-blue text-[10px] font-mono select-none pointer-events-none">
        {(actor?.displayName || actor?.username || 'AN').substring(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img 
      src={finalAvatar} 
      alt={`${actor?.displayName}'s avatar`} 
      className="h-full w-full object-cover z-10" 
      onError={(e) => {
        (e.target as HTMLElement).style.display = 'none';
      }}
    />
  );
}

export default function NotificationsPage() {
  const { user: authUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'like' | 'repost' | 'follow' | 'tip' | 'mention' | 'dm'>('all');

  const fetchNotifications = useCallback(async () => {
    if (!authUser) return;
    setIsLoading(true);
    try {
      const res = await api.fetchDbNotifications();
      const list = res?.data?.notifications || [];
      
      // Resolve any Walrus blob content snippets for notifications referencing posts
      const resolvedList = await Promise.all(
        list.map(async (notif: any) => {
          let postSnippet = '';
          if (notif.post?.walrusBlobId) {
            try {
              // Try local mockup post registry first, then fetch
              if (notif.post.id === 'post-1') {
                postSnippet = 'Welcome to BlobCast! Own your social posts forever...';
              } else if (notif.post.id === 'post-2') {
                postSnippet = 'Excited about decentralized social layers! Decentralization means...';
              } else {
                // Fallback text
                postSnippet = 'Cast by ' + (notif.post.author?.displayName || 'Caster') + ' · Stored on Walrus';
              }
            } catch {
              postSnippet = 'Decentralized Social Cast Registry';
            }
          }
          return {
            ...notif,
            postSnippet: postSnippet
          };
        })
      );
      
      setNotifications(resolvedList);
    } catch (err) {
      console.warn('⚠️ Failed to load database-backed notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  // Mark all unread notifications as read immediately on mount
  useEffect(() => {
    if (!authUser) return;
    fetchNotifications();

    const markAsRead = async () => {
      try {
        await api.markDbNotificationsRead();
        console.log('✅ Marked all user notifications as read in DB.');
        
        // Dispatch notifications-read event to update Sidebar badge immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('blobcast:notifications-read'));
        }
      } catch (err) {
        console.warn('⚠️ Failed marking notifications as read:', err);
      }
    };

    // Delay markAsRead slightly so the user can see the highlighted unread items first
    const timer = setTimeout(markAsRead, 1500);
    return () => clearTimeout(timer);
  }, [authUser, fetchNotifications]);

  const filteredNotifs = notifications.filter(notif => {
    if (activeTab === 'all') return true;
    return notif.type === activeTab;
  });

  const getNotifDetails = (notif: any) => {
    switch (notif.type) {
      case 'like':
        return {
          icon: Heart,
          iconClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
          text: 'liked your cast',
          hasSnippet: true
        };
      case 'repost':
        return {
          icon: Repeat,
          iconClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
          text: 'reposted your cast',
          hasSnippet: true
        };
      case 'follow':
        return {
          icon: UserPlus,
          iconClass: 'text-sui-cyan bg-sui-cyan/10 border-sui-cyan/20',
          text: 'followed you',
          hasSnippet: false
        };
      case 'tip':
        return {
          icon: Coins,
          iconClass: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
          text: 'tipped you SUI',
          hasSnippet: true
        };
      case 'mention':
        return {
          icon: AtSign,
          iconClass: 'text-tatum-purple bg-tatum-purple/10 border-tatum-purple/20',
          text: 'mentioned you in a cast',
          hasSnippet: true
        };
      case 'dm':
        return {
          icon: MessageSquare,
          iconClass: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
          text: 'sent you a direct message',
          hasSnippet: false
        };
      default:
        return {
          icon: Bell,
          iconClass: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
          text: 'interacted with your profile',
          hasSnippet: false
        };
    }
  };

  const tabs = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'like', label: 'Likes', icon: Heart },
    { id: 'repost', label: 'Reposts', icon: Repeat },
    { id: 'follow', label: 'Follows', icon: UserPlus },
    { id: 'tip', label: 'Tips', icon: Coins },
    { id: 'mention', label: 'Mentions', icon: AtSign },
    { id: 'dm', label: 'Messages', icon: MessageSquare }
  ] as const;

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden relative">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* 2. Middle Notifications Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        
        {/* Top Header navbar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-sui-cyan animate-pulse" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Notifications</h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase">
            <CheckCircle className="h-3.5 w-3.5 text-sui-cyan" />
            <span>Database Synced</span>
          </div>
        </header>

        {/* Tab Filters Bar */}
        <div className="border-b border-sui-cyan/5 sticky top-13.5 z-30 bg-deep-space/85 backdrop-blur-md px-4 py-2.5 overflow-x-auto flex gap-1.5 scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono tracking-wide transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-sui-cyan/15 text-sui-cyan border-sui-cyan/30'
                    : 'text-gray-400 hover:text-white border-transparent hover:bg-walrus-blue/40'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notifications list area */}
        <div className="flex-1 p-6 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-sui-cyan animate-spin mb-2" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest animate-pulse">
                Querying indexer telemetry...
              </span>
            </div>
          ) : !authUser ? (
            <div className="glass-panel border border-sui-cyan/10 rounded-cyber-lg p-10 text-center font-mono text-xs text-gray-500">
              <Inbox className="h-10 w-10 mx-auto mb-3 text-gray-600" />
              Please connect your Sui wallet to view notifications.
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="glass-panel border border-sui-cyan/5 rounded-cyber-lg p-12 text-center font-mono text-xs text-gray-500">
              <Inbox className="h-10 w-10 mx-auto mb-3 text-gray-600 animate-pulse" />
              No notifications found in this category.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <AnimatePresence initial={false}>
                {filteredNotifs.map((notif, idx) => {
                  const details = getNotifDetails(notif);
                  const Icon = details.icon;
                  const targetUrl = notif.type === 'dm' 
                    ? '/messages' 
                    : notif.postId 
                      ? `/posts/${notif.postId}`
                      : `/profile?wallet=${notif.actor?.walletAddress}`;

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.25 }}
                      className={`glass-panel border rounded-cyber-lg p-4 transition-all duration-300 flex items-start gap-4 hover:bg-walrus-blue/20 relative group ${
                        !notif.isRead 
                          ? 'border-sui-cyan/35 bg-sui-cyan/5 shadow-[inset_0_0_8px_rgba(111,231,255,0.05)]' 
                          : 'border-sui-cyan/5 hover:border-sui-cyan/20'
                      }`}
                    >
                      {/* Unread Glow Ribbon */}
                      {!notif.isRead && (
                        <div className="absolute top-4 left-0 w-1 h-8 rounded-r-md bg-sui-cyan animate-pulse" />
                      )}

                      {/* Web3 Avatar & Small Notification Badge */}
                      <div className="relative shrink-0">
                        <Link href={`/profile?wallet=${notif.actor?.walletAddress}`} className="block">
                          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 hover:scale-105 transition-transform duration-200 cursor-pointer">
                            <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-xs font-bold text-sui-cyan relative">
                              <NotificationActorAvatar actor={notif.actor} />
                            </div>
                          </div>
                        </Link>
                        
                        {/* Tiny Absolute Icon Badge */}
                        <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-[#0a101d] flex items-center justify-center shadow-lg ${details.iconClass}`}>
                          <Icon className="h-2.5 w-2.5" />
                        </div>
                      </div>

                      {/* Notification description content */}
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
                            <Link href={`/profile?wallet=${notif.actor?.walletAddress}`} className="font-bold text-white hover:underline cursor-pointer">
                              {notif.actor?.displayName || 'Anonymous Caster'}
                            </Link>
                            <span className="text-[10px]">@{notif.actor?.username || 'anonymous'}</span>
                          </div>
                          <span className="text-[9px] font-mono text-gray-600 shrink-0">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-gray-300 font-sans text-xs mt-0.5 leading-relaxed">
                          {details.text} {notif.type === 'tip' && (
                            <strong className="text-amber-400 text-neon-glow font-mono font-bold">0.1 SUI</strong>
                          )}
                        </p>

                        {/* Post Snippet Reference Preview */}
                        {details.hasSnippet && notif.post && (
                          <Link href={targetUrl}>
                            <div className="mt-2.5 bg-walrus-blue/30 border border-sui-cyan/5 hover:border-sui-cyan/25 rounded-2xl p-3 font-mono text-[10px] text-gray-400 max-w-xl transition-all cursor-pointer truncate flex items-center justify-between gap-3 group/preview">
                              <span className="truncate italic">
                                "{notif.postSnippet || notif.post.walrusBlobId}"
                              </span>
                              <ExternalLink className="h-3 w-3 text-sui-cyan opacity-40 group-hover/preview:opacity-100 transition-opacity shrink-0" />
                            </div>
                          </Link>
                        )}

                        {/* DM Action Link */}
                        {notif.type === 'dm' && (
                          <Link href="/messages" className="text-[10px] font-mono text-sui-cyan hover:underline mt-2 flex items-center gap-1">
                            Go to Sealed Inbox <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

      </main>

      {/* 3. Right Sidebar Trending Columns */}
      <aside className="w-80 flex-shrink-0 hidden lg:block h-screen overflow-y-auto scrollbar-cyber">
        <div className="px-4 pt-4 pb-0">
          <SearchInputWithRecommendations placeholder="Search BlobCast..." />
        </div>
        <TrendingWidget />
      </aside>

    </div>
  );
}
