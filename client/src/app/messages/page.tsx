'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Send,
  Image,
  Paperclip,
  MoreHorizontal,
  Phone,
  Video,
  BadgeCheck,
  ChevronLeft,
  Smile,
  Lock,
  Shield,
  Database,
  Zap,
  UserPlus,
  Loader2,
  AlertCircle,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWalrusImage } from '@/hooks/useWalrusImage';
import { useDMWebSocket } from '@/hooks/useDMWebSocket';
import { api, ApiConversation, ApiDirectMessage } from '@/lib/api';
import { 
  sealEncryptMessage, 
  sealDecryptMessage, 
  isSealAvailable, 
  createClientSessionKey, 
  getSealPackageId 
} from '@/lib/seal';
import { useSignAndExecuteTransaction, useCurrentAccount, useSignPersonalMessage, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SessionKey } from '@mysten/seal';

// ─── Avatar Helper ────────────────────────────────────────────────────────────

function MessageUserAvatar({ user, className }: { user: any; className?: string }) {
  const imageUrl = useWalrusImage(user?.avatarBlobId);
  const finalUrl = imageUrl || (user?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}` : '');

  return (
    <div className={`rounded-full bg-linear-to-br from-sui-cyan/30 to-tatum-purple/30 flex items-center justify-center font-mono text-xs font-bold text-white relative overflow-hidden shrink-0 ${className || 'h-11 w-11'}`}>
      {finalUrl ? (
        <img
          src={finalUrl}
          alt={user?.displayName}
          className="h-full w-full object-cover z-10"
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 select-none pointer-events-none font-mono">
        {(user?.displayName || user?.username || 'US').substring(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

// ─── Utility: format relative time ───────────────────────────────────────────

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user: authUser } = useAuth();

  // Sui Wallet and Walrus Seal Hooks/States
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMessageAsync } = useSignPersonalMessage();

  const sealActive = isSealAvailable();
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [isAuthorizingSeal, setIsAuthorizingSeal] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState<ApiDirectMessage[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Conversations state
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);

  // Active conversation state
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiDirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  // Sending state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  // New chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [creatingConv, setCreatingConv] = useState(false);

  // WebSocket connection status
  const [wsConnected, setWsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // ─── Load conversations ─────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      setConvError(null);
      const res = await api.fetchConversations();
      setConversations(res.data.conversations);
    } catch (err: any) {
      setConvError(err.message || 'Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Load messages when active conversation changes ─────────────────────────

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    setMsgError(null);
    try {
      const res = await api.fetchMessages(convId);
      setMessages(res.data.messages);
      // Mark as read
      api.markConversationRead(convId).then(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('blobcast:messages-read'));
        }
      }).catch(() => {});
      // Reset unread count locally
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (err: any) {
      setMsgError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId, loadMessages]);

  // ─── WebSocket: real-time incoming messages ─────────────────────────────────

  const handleNewWSMessage = useCallback((incomingMsg: ApiDirectMessage) => {
    // Only append if it's from the other user (our own messages are already appended optimistically)
    if (incomingMsg.senderId === authUser?.id) return;

    setMessages(prev => {
      // Deduplicate
      if (prev.some(m => m.id === incomingMsg.id)) return prev;
      return [...prev, incomingMsg];
    });

    // Update conversation list last message
    setConversations(prev =>
      prev.map(c => {
        if (c.id === incomingMsg.conversationId) {
          return {
            ...c,
            lastMessage: {
              id: incomingMsg.id,
              senderId: incomingMsg.senderId,
              text: incomingMsg.text,
              createdAt: incomingMsg.createdAt,
              isRead: false,
            },
            lastMessageAt: incomingMsg.createdAt,
            // Only increment unread if this is NOT the active conversation
            unreadCount: activeConvId === incomingMsg.conversationId ? 0 : c.unreadCount + 1,
          };
        }
        return c;
      })
    );

    // Auto-mark as read if this conversation is active
    if (activeConvId === incomingMsg.conversationId) {
      api.markConversationRead(incomingMsg.conversationId).then(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('blobcast:messages-read'));
        }
      }).catch(() => {});
    }
  }, [authUser?.id, activeConvId]);

  useDMWebSocket({
    conversationId: activeConvId,
    onNewMessage: handleNewWSMessage,
    enabled: Boolean(authUser),
  });

  // ─── Scroll to bottom ───────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [decryptedMessages.length, activeConvId]);

  // ─── Load all users for new chat modal ─────────────────────────────────────

  useEffect(() => {
    if (!showNewChatModal) return;
    api.fetchAllUsers().then(res => {
      if (res.data.users) setAllUsers(res.data.users);
    }).catch(() => {});
  }, [showNewChatModal]);

  // ─── Send message ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeConvId || isSending || !authUser) return;

    setInputText('');
    setIsSending(true);

    // Optimistic update
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticMsg: ApiDirectMessage = {
      id: optimisticId,
      conversationId: activeConvId,
      senderId: authUser.id,
      text,
      walrusBlobId: null,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: authUser as any,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // Attempt Seal encryption + Walrus upload (falls back gracefully)
      let walrusBlobId: string | null = null;
      if (isSealAvailable() && activeConv?.suiObjectId) {
        const sealResult = await sealEncryptMessage(activeConvId, text);
        walrusBlobId = sealResult.walrusBlobId;
      }

      const res = await api.sendMessage(activeConvId, text, walrusBlobId);
      const savedMsg = res.data.message;

      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticId ? savedMsg : m));

      // Update conversation last message
      setConversations(prev =>
        prev.map(c => {
          if (c.id === activeConvId) {
            return {
              ...c,
              lastMessage: {
                id: savedMsg.id,
                senderId: savedMsg.senderId,
                text: savedMsg.text,
                createdAt: savedMsg.createdAt,
                isRead: false,
              },
              lastMessageAt: savedMsg.createdAt,
            };
          }
          return c;
        })
      );
    } catch (err: any) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setInputText(text); // Restore input text
      console.error('Failed to send message:', err.message);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Seal E2E Authorization ───────────────────────────────────────────────

  const authorizeSeal = async () => {
    if (!account?.address) return;
    setIsAuthorizingSeal(true);
    try {
      // 1. Initialize SessionKey via SDK
      const key = await createClientSessionKey(account.address);
      if (!key) throw new Error("Could not create SessionKey object");

      // 2. Get personal message to sign
      const personalMsg = key.getPersonalMessage();

      // 3. Request user signature via wallet adapter
      const signResult = await signPersonalMessageAsync({
        message: personalMsg,
      });

      // 4. Set signature to SessionKey
      await key.setPersonalMessageSignature(signResult.signature);

      // 5. Save to state
      setSessionKey(key);
      console.log("🔒 E2E Decryption authorized successfully!");
    } catch (err: any) {
      console.error("❌ E2E Authorization failed:", err);
      alert(`Decryption authorization failed: ${err.message || err}`);
    } finally {
      setIsAuthorizingSeal(false);
    }
  };

  // ─── Asynchronous Message Decryption Effect ─────────────────────────────────

  useEffect(() => {
    const decryptAll = async () => {
      if (!messages || messages.length === 0) {
        setDecryptedMessages([]);
        return;
      }

      const activeConv = conversations.find(c => c.id === activeConvId);
      if (sealActive && activeConv?.suiObjectId && sessionKey) {
        setIsDecrypting(true);
        try {
          const decrypted = await Promise.all(
            messages.map(async (msg) => {
              if (msg.walrusBlobId) {
                try {
                  const plainText = await sealDecryptMessage(
                    activeConvId!,
                    msg.walrusBlobId,
                    sessionKey,
                    activeConv.suiObjectId!
                  );
                  if (plainText) {
                    return { ...msg, text: plainText };
                  }
                } catch (e) {
                  console.warn("Failed to decrypt message:", e);
                }
              }
              return msg;
            })
          );
          setDecryptedMessages(decrypted);
        } catch (err) {
          console.error("Decryption batch error:", err);
          setDecryptedMessages(messages);
        } finally {
          setIsDecrypting(false);
        }
      } else {
        setDecryptedMessages(messages);
      }
    };

    decryptAll();
  }, [messages, sessionKey, activeConvId, conversations, sealActive]);

  // ─── Create or select conversation ─────────────────────────────────────────

  const handleCreateOrSelectConversation = async (user: any) => {
    setCreatingConv(true);
    try {
      // Check if already in list
      const existing = conversations.find(c => c.otherUser.id === user.id);
      if (existing) {
        setActiveConvId(existing.id);
        setIsMobileListVisible(false);
        setShowNewChatModal(false);
        setNewChatSearchQuery('');
        return;
      }

      // If Seal is available, create on-chain conversation object first
      let suiObjectId: string | null = null;
      if (sealActive) {
        if (!account?.address) {
          alert('Connect your Sui wallet to create a Sealed E2E encrypted room!');
          setCreatingConv(false);
          return;
        }

        try {
          const tx = new Transaction();
          tx.moveCall({
            target: `${getSealPackageId()}::blobcast_dm::create_conversation`,
            arguments: [tx.pure.address(user.walletAddress)],
          });

          console.log("🚀 Creating E2E encrypted room policy on-chain...");
          const txResult = await signAndExecuteTransaction({
            transaction: tx,
          });

          const txDetails = await suiClient.waitForTransaction({
            digest: txResult.digest,
            options: { showEffects: true },
          });

          suiObjectId = (txDetails.effects as any)?.created?.[0]?.reference?.objectId || null;
          if (!suiObjectId) {
            throw new Error("Failed to resolve created on-chain conversation object ID");
          }
          console.log("🔗 E2E encrypted room policy created on-chain:", suiObjectId);
        } catch (txErr: any) {
          console.error("Failed to deploy E2E room policy on-chain:", txErr);
          alert(`Failed to create on-chain access control room: ${txErr.message || txErr}`);
          setCreatingConv(false);
          return;
        }
      }

      const res = await api.createOrGetConversation(user.id, suiObjectId);
      const newConv = res.data.conversation;

      // Add to conversations list
      const fullConv: ApiConversation = {
        id: newConv.id,
        suiObjectId: newConv.suiObjectId,
        otherUser: newConv.otherUser,
        lastMessage: null,
        lastMessageAt: newConv.lastMessageAt,
        createdAt: newConv.createdAt,
        unreadCount: 0,
      };

      setConversations(prev => {
        // Avoid duplicates
        if (prev.some(c => c.id === newConv.id)) return prev;
        return [fullConv, ...prev];
      });

      setActiveConvId(newConv.id);
      setIsMobileListVisible(false);
    } catch (err: any) {
      console.error('Failed to create conversation:', err.message);
    } finally {
      setCreatingConv(false);
      setShowNewChatModal(false);
      setNewChatSearchQuery('');
    }
  };

  // ─── Filtered data ──────────────────────────────────────────────────────────

  const filteredConvs = conversations.filter(c => {
    const matchesSearch =
      (c.otherUser.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.otherUser.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filterMode === 'unread') return matchesSearch && c.unreadCount > 0;
    return matchesSearch;
  });

  // Sort conversations by last message time
  const sortedConvs = [...filteredConvs].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  const filteredUsersForNewChat = allUsers
    .filter(u => u.id !== authUser?.id)
    .filter(u => {
      if (!newChatSearchQuery) return true;
      const term = newChatSearchQuery.toLowerCase();
      return (
        (u.username || '').toLowerCase().includes(term) ||
        (u.displayName || '').toLowerCase().includes(term) ||
        (u.walletAddress || '').toLowerCase().includes(term)
      );
    });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full max-w-7xl mx-auto h-screen overflow-hidden">

      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* DM Panel */}
      <div className="flex-1 flex h-screen overflow-hidden">

        {/* Conversation List Column */}
        <div className={`
          w-full md:w-80 flex-shrink-0 flex flex-col h-screen border-r border-sui-cyan/5
          ${isMobileListVisible ? 'flex' : 'hidden md:flex'}
        `}>

          {/* Header */}
          <div className="flex-shrink-0 glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-5 py-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sui-cyan" />
                <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Messages</h2>
                {totalUnread > 0 && (
                  <span className="h-4 min-w-[1rem] px-1 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                    {totalUnread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadConversations}
                  disabled={loadingConversations}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all disabled:opacity-40"
                  title="Refresh conversations"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="h-8 w-8 flex items-center justify-center rounded-xl bg-sui-cyan/10 border border-sui-cyan/20 text-sui-cyan hover:bg-sui-cyan/20 hover:text-white transition-all shadow-cyber-glow cursor-pointer"
                  title="New Chat Session"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-walrus-blue/40 border border-sui-cyan/10 rounded-cyber-md pl-8 pr-3 py-2 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sui-cyan/30 transition-colors"
              />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 bg-deep-space/40 p-1 rounded-xl border border-sui-cyan/10">
              <button
                onClick={() => setFilterMode('all')}
                className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space shadow-cyber-glow'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('unread')}
                className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterMode === 'unread'
                    ? 'bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space shadow-cyber-glow'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                Unread
                {totalUnread > 0 && (
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[11px] font-mono">Loading conversations...</span>
              </div>
            ) : convError ? (
              <div className="p-6 text-center">
                <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
                <p className="text-[10px] font-mono text-rose-400">{convError}</p>
                <button
                  onClick={loadConversations}
                  className="mt-2 text-[10px] font-mono text-sui-cyan hover:underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : sortedConvs.length === 0 ? (
              <div className="p-6 text-center text-[11px] font-mono text-gray-600">
                {filterMode === 'unread' ? 'No unread messages' : 'No conversations yet'}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {sortedConvs.map(conv => (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => { setActiveConvId(conv.id); setIsMobileListVisible(false); }}
                    className={`w-full flex items-start gap-3 px-4 py-4 text-left border-b border-sui-cyan/5 transition-all hover:bg-sui-cyan/5 ${
                      activeConvId === conv.id ? 'bg-sui-cyan/8 border-l-2 border-l-sui-cyan' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <MessageUserAvatar user={conv.otherUser} className="h-11 w-11" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 overflow-hidden">
                          <span className="text-sm font-semibold text-white font-sans truncate">{conv.otherUser.displayName || conv.otherUser.username}</span>
                          {conv.otherUser.verified && <BadgeCheck className="h-3.5 w-3.5 text-sui-cyan flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] font-mono text-gray-500">{formatRelativeTime(conv.lastMessageAt || conv.createdAt)}</span>
                          {conv.unreadCount > 0 && (
                            <span className="h-4 min-w-[1rem] px-1 bg-sui-cyan rounded-full text-[9px] font-bold text-deep-space flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate font-sans">
                        {conv.lastMessage
                          ? (conv.lastMessage.senderId === authUser?.id ? 'You: ' : '') + conv.lastMessage.text
                          : 'Start a conversation'}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* E2E footer */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-sui-cyan/5 flex items-center gap-2">
            <Lock className="h-3 w-3 text-emerald-400 flex-shrink-0" />
            <span className="text-[9px] font-mono text-gray-600 leading-relaxed">
              {sealActive ? 'E2E encrypted via Walrus Seal' : 'Messages stored securely on Supabase'}
            </span>
          </div>
        </div>

        {/* Chat Detail Column */}
        <div className={`
          flex-1 flex flex-col h-screen overflow-hidden
          ${!isMobileListVisible || activeConvId ? 'flex' : 'hidden md:flex'}
        `}>
          {activeConv ? (
            <>
              {/* Chat header */}
              <div className="flex-shrink-0 glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-5 py-3.5 flex items-center gap-3">
                <button
                  onClick={() => setIsMobileListVisible(true)}
                  className="md:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-sui-cyan/10 text-gray-400 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <Link
                  href={`/profile?wallet=${activeConv.otherUser.walletAddress || ''}`}
                  className="relative flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity block"
                >
                  <MessageUserAvatar user={activeConv.otherUser} className="h-9 w-9" />
                </Link>

                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/profile?wallet=${activeConv.otherUser.walletAddress || ''}`}
                      className="text-sm font-bold text-white font-sans hover:underline hover:text-sui-cyan cursor-pointer transition-colors"
                    >
                      {activeConv.otherUser.displayName || activeConv.otherUser.username}
                    </Link>
                    {activeConv.otherUser.verified && <BadgeCheck className="h-3.5 w-3.5 text-sui-cyan" />}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                    @{activeConv.otherUser.username}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-sui-cyan/10 text-gray-500 hover:text-sui-cyan transition-all" title="Voice Call">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-sui-cyan/10 text-gray-500 hover:text-sui-cyan transition-all" title="Video Call">
                    <Video className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-sui-cyan/10 text-gray-500 hover:text-white transition-all" title="More">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Walrus Sealed banner */}
              <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 px-4 bg-sui-cyan/3 border-b border-sui-cyan/5">
                <Shield className="h-3 w-3 text-sui-cyan" />
                <span className="text-[9px] font-mono text-gray-500 tracking-wide">
                  {sealActive && activeConv.suiObjectId
                    ? (
                      <>
                        Sealed via <span className="text-sui-cyan font-bold">Walrus Seal</span> — E2E Encrypted. Room Policy:{' '}
                        <a
                          href={`https://suiscan.xyz/testnet/object/${activeConv.suiObjectId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sui-cyan font-bold underline hover:text-white transition-colors"
                        >
                          {activeConv.suiObjectId.substring(0, 8)}...{activeConv.suiObjectId.substring(activeConv.suiObjectId.length - 6)}
                        </a>
                      </>
                    ) : sealActive
                    ? <>Plaintext mode (Walrus Sealed E2E ready — start a new chat to encrypt)</>
                    : <>Secured via <span className="text-sui-cyan font-bold">Supabase</span> · WebSocket real-time · Walrus Seal ready</>
                  }
                </span>
                <Database className="h-3 w-3 text-sui-cyan" />
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-sui-cyan" />
                  </div>
                ) : msgError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-6 w-6 text-rose-500" />
                    <p className="text-[11px] font-mono text-rose-400">{msgError}</p>
                    <button
                      onClick={() => activeConvId && loadMessages(activeConvId)}
                      className="text-[10px] font-mono text-sui-cyan hover:underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : sealActive && activeConv?.suiObjectId && !account?.address ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-walrus-blue/20 rounded-cyber-lg border border-sui-cyan/10 max-w-md mx-auto my-12 text-center gap-4">
                    <Shield className="h-10 w-10 text-sui-cyan animate-pulse" />
                    <h3 className="font-mono font-bold text-white text-xs uppercase tracking-wider">Sealed Chat Room</h3>
                    <p className="text-[11px] font-mono text-gray-400 leading-relaxed font-sans">
                      This conversation is protected using E2E threshold encryption via Walrus Seal. Please connect your Sui wallet to authorize decryption keys and view messages.
                    </p>
                  </div>
                ) : sealActive && activeConv?.suiObjectId && !sessionKey ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-walrus-blue/20 rounded-cyber-lg border border-sui-cyan/10 max-w-md mx-auto my-12 text-center gap-4">
                    <Lock className="h-10 w-10 text-sui-cyan" />
                    <h3 className="font-mono font-bold text-white text-xs uppercase tracking-wider">Decryption Authorization Required</h3>
                    <p className="text-[11px] font-mono text-gray-400 leading-relaxed font-sans">
                      To decrypt E2E messages in this room, you must sign a one-time session key verification. This transaction is off-chain and costs 0 gas.
                    </p>
                    <button
                      onClick={authorizeSeal}
                      disabled={isAuthorizingSeal}
                      className="flex items-center gap-2 bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-mono font-bold text-[10px] uppercase px-5 py-3 rounded-cyber-md shadow-cyber-glow cursor-pointer hover:opacity-95 transition-all disabled:opacity-50"
                    >
                      {isAuthorizingSeal ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-deep-space" />
                          Authorizing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 text-deep-space" />
                          Authorize Decryption
                        </>
                      )}
                    </button>
                  </div>
                ) : isDecrypting ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-sui-cyan" />
                    <span className="text-[10px] font-mono text-gray-500">Decrypting Walrus Seal payload...</span>
                  </div>
                ) : decryptedMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-sui-cyan/10 border border-sui-cyan/20 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-sui-cyan" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white font-mono mb-1">No messages yet</p>
                      <p className="text-[11px] font-mono text-gray-500">Say hello to @{activeConv.otherUser.username}!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-sui-cyan/5" />
                      <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Messages</span>
                      <div className="flex-1 h-px bg-sui-cyan/5" />
                    </div>

                    {decryptedMessages.map((msg, idx) => {
                      const isMe = msg.senderId === authUser?.id;
                      const showAvatar = !isMe && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
                      const isOptimistic = msg.id.startsWith('optimistic_');

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className={`flex-shrink-0 ${!showAvatar ? 'invisible' : ''}`}>
                              <MessageUserAvatar user={activeConv.otherUser} className="h-8 w-8" />
                            </div>
                          )}

                          <div className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm font-sans leading-relaxed ${
                              isMe
                                ? `bg-gradient-to-br from-sui-cyan/25 to-tatum-purple/20 border text-white rounded-br-md ${isOptimistic ? 'border-sui-cyan/10 opacity-70' : 'border-sui-cyan/20'}`
                                : 'bg-walrus-blue/60 border border-sui-cyan/8 text-gray-200 rounded-bl-md'
                            }`}>
                              {msg.text}
                            </div>
                            <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-[9px] font-mono text-gray-600">{formatMessageTime(msg.createdAt)}</span>
                              {isOptimistic && <Loader2 className="h-2.5 w-2.5 animate-spin text-gray-500" />}
                              {msg.walrusBlobId && !isOptimistic && (
                                <div className="flex items-center gap-0.5 text-[8px] font-mono text-sui-cyan/50">
                                  <Database className="h-2 w-2" />
                                  <span>Walrus Seal</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {isMe && (
                            <MessageUserAvatar user={authUser} className="h-8 w-8" />
                          )}
                        </motion.div>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="flex-shrink-0 border-t border-sui-cyan/5 p-4">
                <div className="flex items-end gap-3 bg-walrus-blue/40 border border-sui-cyan/10 rounded-2xl px-4 py-3 focus-within:border-sui-cyan/30 transition-colors">
                  <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
                    <button className="text-gray-500 hover:text-sui-cyan transition-colors" title="Attach image">
                      <Image className="h-4 w-4" />
                    </button>
                    <button className="text-gray-500 hover:text-sui-cyan transition-colors" title="Attach file">
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </div>

                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message @${activeConv.otherUser.username}...`}
                    rows={1}
                    disabled={isSending}
                    className="flex-1 bg-transparent text-sm font-sans text-gray-200 placeholder-gray-600 resize-none focus:outline-none leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50"
                    style={{ fieldSizing: 'content' } as any}
                  />

                  <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
                    <button className="text-gray-500 hover:text-sui-cyan transition-colors" title="Emoji">
                      <Smile className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim() || isSending}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-sui-cyan/20 border border-sui-cyan/30 text-sui-cyan hover:bg-sui-cyan/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Send (Enter)"
                    >
                      {isSending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <Zap className="h-2.5 w-2.5 text-sui-cyan" />
                  <span className="text-[8px] font-mono text-gray-600">
                    Real-time via WebSocket · {sealActive ? 'E2E encrypted via Walrus Seal' : 'Stored on Supabase · Walrus Seal ready'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
              <div className="h-16 w-16 rounded-2xl bg-sui-cyan/10 border border-sui-cyan/20 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-sui-cyan" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-white text-sm tracking-wider uppercase mb-2">Select a conversation</h3>
                <p className="text-[11px] font-mono text-gray-500 leading-relaxed max-w-xs">
                  Choose a conversation from the list to start chatting, or start a new one.
                </p>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center gap-2 bg-sui-cyan/10 border border-sui-cyan/20 rounded-cyber-md px-4 py-2.5 text-[11px] font-mono text-sui-cyan hover:bg-sui-cyan/20 transition-all cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Start New Chat
              </button>
              <div className="flex items-center gap-2 bg-sui-cyan/5 border border-sui-cyan/15 rounded-cyber-md px-4 py-2.5">
                <Zap className="h-3.5 w-3.5 text-sui-cyan" />
                <span className="text-[10px] font-mono text-gray-400">Real-time WebSocket · Walrus Seal E2E Encryption</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md glass-panel border border-sui-cyan/20 rounded-cyber-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between border-b border-sui-cyan/10 pb-3 mb-4">
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-sui-cyan">Start new sealed session</h3>
              <button
                onClick={() => { setShowNewChatModal(false); setNewChatSearchQuery(''); }}
                className="text-[10px] font-mono text-gray-500 hover:text-white uppercase transition-colors cursor-pointer"
              >
                [Close]
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search username or wallet address..."
                value={newChatSearchQuery}
                onChange={e => setNewChatSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-walrus-blue/50 border border-sui-cyan/15 rounded-cyber-md pl-8 pr-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-sui-cyan/35 placeholder:text-gray-600"
              />
            </div>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 scrollbar-cyber">
              {filteredUsersForNewChat.length === 0 ? (
                <div className="text-center py-6 text-[10px] font-mono text-gray-500">
                  {newChatSearchQuery ? 'No registered users match your search' : 'Type to search registered casters'}
                </div>
              ) : (
                filteredUsersForNewChat.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleCreateOrSelectConversation(user)}
                    disabled={creatingConv}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-cyber-md border border-transparent hover:border-sui-cyan/10 hover:bg-sui-cyan/5 text-left transition-all cursor-pointer disabled:opacity-50"
                  >
                    <MessageUserAvatar user={user} className="h-8 w-8" />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate font-sans">{user.displayName || 'Anonymous Caster'}</span>
                        {user.verified && <BadgeCheck className="h-3.5 w-3.5 text-sui-cyan flex-shrink-0" />}
                      </div>
                      <div className="text-[9px] font-mono text-gray-500 truncate">
                        @{user.username || 'anonymous'} · {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
                      </div>
                    </div>
                    {creatingConv && <Loader2 className="h-3.5 w-3.5 animate-spin text-sui-cyan flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
