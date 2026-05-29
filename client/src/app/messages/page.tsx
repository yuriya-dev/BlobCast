'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWalrusImage } from '@/hooks/useWalrusImage';
import { api } from '@/lib/api';

// -- Message Avatar Helper with Dicebear robot fallback -----------------------

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
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 select-none pointer-events-none font-mono">
        {(user?.displayName || user?.username || 'US').substring(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

// -- Static conversation + message data ----------------------------------------

const CURRENT_USER = {
  id: 'usr-2-sademir',
  displayName: 'Yuriya',
  username: 'yuriya',
  avatarInitials: 'YU',
};

const initialConversations = [
  {
    id: 'conv-1',
    user: { id: 'usr-1-vitalik', displayName: 'Vitalik Buterin', username: 'vitalik', avatarInitials: 'VB', verified: true, online: true, walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000001' },
    lastMessage: 'Incredible work on BlobCast! The Walrus integration is 🔥',
    lastTime: '2m ago',
    unread: 2,
  },
  {
    id: 'conv-2',
    user: { id: 'usr-3-mysten', displayName: 'Mysten Labs', username: 'mystenlabs', avatarInitials: 'ML', verified: true, online: true, walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000003' },
    lastMessage: "We'd love to feature BlobCast in our ecosystem showcase.",
    lastTime: '1h ago',
    unread: 0,
  },
  {
    id: 'conv-3',
    user: { id: 'usr-4-sui', displayName: 'Sui Network', username: 'suinetwork', avatarInitials: 'SN', verified: true, online: false, walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000004' },
    lastMessage: 'Grant application approved ✅ Congrats!',
    lastTime: '3h ago',
    unread: 1,
  },
  {
    id: 'conv-4',
    user: { id: 'usr-5-walrus', displayName: 'Walrus Protocol', username: 'walrusprotocol', avatarInitials: 'WP', verified: true, online: false, walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000005' },
    lastMessage: 'Your blob storage quota has been upgraded.',
    lastTime: 'Yesterday',
    unread: 0,
  },
  {
    id: 'conv-5',
    user: { id: 'usr-6-cyber', displayName: 'CyberCaster_9', username: 'cybercaster9', avatarInitials: 'CC', verified: false, online: true, walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000006' },
    lastMessage: "When's the token launch? 🚀",
    lastTime: '2d ago',
    unread: 0,
  },
  {
    id: 'conv-6',
    user: { id: 'usr-7-nika', displayName: 'Nika_Warz', username: 'nikawarz', avatarInitials: 'NW', verified: false, online: false, walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000007' },
    lastMessage: 'gm ser 👋 LFG BlobCast',
    lastTime: '3d ago',
    unread: 0,
  },
  {
    id: 'conv-7',
    user: { id: 'usr-8-defi', displayName: 'DeFi Maxi', username: 'defimaxi', avatarInitials: 'DM', verified: false, online: true, walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000008' },
    lastMessage: 'Is BlobCast token on Cetus already?',
    lastTime: '4d ago',
    unread: 0,
  },
];

type Message = { id: string; senderId: string; text: string; time: string; walrusBlobId?: string };

const initialMessages: Record<string, Message[]> = {
  'conv-1': [
    { id: 'm1', senderId: 'usr-1-vitalik', text: 'Hey! Just saw your BlobCast demo at the Sui Hackathon stream 🔥', time: '10:02 AM' },
    { id: 'm2', senderId: 'usr-2-sademir', text: 'Thanks Vitalik! We worked super hard on the Walrus integration 🙏', time: '10:05 AM' },
    { id: 'm3', senderId: 'usr-1-vitalik', text: 'The permanent social content idea is brilliant. Immutable, censorship-resistant, and user-owned.', time: '10:07 AM' },
    { id: 'm4', senderId: 'usr-2-sademir', text: 'Exactly! Every cast is stored as a Walrus blob with a verifiable hash on Sui 🛡️', time: '10:09 AM' },
    { id: 'm5', senderId: 'usr-1-vitalik', text: 'Incredible work on BlobCast! The Walrus integration is 🔥', time: '10:12 AM' },
  ],
  'conv-2': [
    { id: 'm1', senderId: 'usr-3-mysten', text: 'Hello! We noticed your project BlobCast on the hackathon board.', time: '9:00 AM' },
    { id: 'm2', senderId: 'usr-2-sademir', text: 'Hi Mysten! Yes, we built it for the Walrus + Sui hackathon 🙌', time: '9:03 AM' },
    { id: 'm3', senderId: 'usr-3-mysten', text: "We'd love to feature BlobCast in our ecosystem showcase.", time: '9:15 AM' },
  ],
  'conv-3': [
    { id: 'm1', senderId: 'usr-4-sui', text: 'Your grant application has been reviewed.', time: '8:00 AM' },
    { id: 'm2', senderId: 'usr-4-sui', text: 'Grant application approved ✅ Congrats!', time: '8:01 AM' },
    { id: 'm3', senderId: 'usr-2-sademir', text: 'OMG THANK YOU SO MUCH!! 🎉🎉🎉', time: '8:05 AM' },
  ],
  'conv-4': [
    { id: 'm1', senderId: 'usr-5-walrus', text: 'Hi! We noticed your usage of our storage layer is growing fast.', time: 'Yesterday' },
    { id: 'm2', senderId: 'usr-5-walrus', text: 'Your blob storage quota has been upgraded.', time: 'Yesterday' },
    { id: 'm3', senderId: 'usr-2-sademir', text: 'Wow, that is amazing! Thank you Walrus team 🐳', time: 'Yesterday' },
  ],
  'conv-5': [
    { id: 'm1', senderId: 'usr-6-cyber', text: "When's the token launch? 🚀", time: '2d ago' },
    { id: 'm2', senderId: 'usr-2-sademir', text: 'Haha no token! We are focused on building the product 😅', time: '2d ago' },
  ],
  'conv-6': [
    { id: 'm1', senderId: 'usr-7-nika', text: 'gm ser 👋 LFG BlobCast', time: '3d ago' },
    { id: 'm2', senderId: 'usr-2-sademir', text: 'gm gm! stay tuned 🚀', time: '3d ago' },
  ],
  'conv-7': [
    { id: 'm1', senderId: 'usr-8-defi', text: 'Is BlobCast token on Cetus already?', time: '4d ago' },
    { id: 'm2', senderId: 'usr-2-sademir', text: 'No token! Product first 😄', time: '4d ago' },
  ],
};

const avatarColors: Record<string, string> = {
  'usr-1-vitalik': 'from-violet-500/40 to-purple-600/40',
  'usr-3-mysten':  'from-blue-500/40 to-cyan-500/40',
  'usr-4-sui':     'from-teal-500/40 to-emerald-500/40',
  'usr-5-walrus':  'from-amber-500/40 to-orange-500/40',
  'usr-6-cyber':   'from-rose-500/40 to-pink-500/40',
  'usr-7-nika':    'from-fuchsia-500/40 to-pink-500/40',
  'usr-8-defi':    'from-lime-500/40 to-green-500/40',
};

export default function MessagesPage() {
  const { user: authUser } = useAuth();
  const [convList, setConvList] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>('conv-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New message search states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // DM filters state (all / unread)
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  const activeConv = convList.find(c => c.id === activeConvId);
  const activeMessages = activeConvId ? (messages[activeConvId] || []) : [];

  // Filter conversations based on search term AND tabs (all / unread)
  const filteredConvs = convList.filter(c => {
    const matchesSearch = c.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterMode === 'unread') {
      return matchesSearch && c.unread > 0;
    }
    return matchesSearch;
  });

  // Fetch all registered users for DMs modal search
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.fetchAllUsers();
        if (res && res.data && Array.isArray(res.data.users)) {
          setAllUsers(res.data.users);
        }
      } catch (err) {
        console.warn("Failed to load registered users for chat search:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateOrSelectConversation = (user: any) => {
    const existingConv = convList.find(c => 
      c.user.id === user.id || 
      c.user.walletAddress?.toLowerCase() === user.walletAddress.toLowerCase()
    );
    
    if (existingConv) {
      setActiveConvId(existingConv.id);
      setIsMobileListVisible(false);
    } else {
      const newConvId = `conv_dyn_${Date.now()}`;
      const newConv = {
        id: newConvId,
        user: {
          id: user.id,
          displayName: user.displayName || 'Anonymous Caster',
          username: user.username || 'anonymous',
          avatarInitials: (user.displayName || user.username || 'AN').substring(0, 2).toUpperCase(),
          avatarBlobId: user.avatarBlobId,
          verified: user.verified || false,
          online: true,
          walletAddress: user.walletAddress
        },
        lastMessage: 'Started a new sealed chat session.',
        lastTime: 'Just now',
        unread: 0
      };
      
      setConvList(prev => [newConv, ...prev]);
      setMessages(prev => ({ ...prev, [newConvId]: [] }));
      setActiveConvId(newConvId);
      setIsMobileListVisible(false);
    }
    
    setShowNewChatModal(false);
    setNewChatSearchQuery('');
  };

  const filteredUsersForNewChat = allUsers
    .filter(u => u.walletAddress.toLowerCase() !== authUser?.walletAddress?.toLowerCase())
    .filter(u => {
      if (!newChatSearchQuery) return true;
      const term = newChatSearchQuery.toLowerCase();
      return (
        (u.username || '').toLowerCase().includes(term) ||
        (u.displayName || '').toLowerCase().includes(term) ||
        u.walletAddress.toLowerCase().includes(term)
      );
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, activeMessages.length]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !activeConvId) return;
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: authUser?.id || CURRENT_USER.id,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      walrusBlobId: `walrus_sim_dm_${Date.now()}`,
    };
    setMessages(prev => ({ ...prev, [activeConvId]: [...(prev[activeConvId] || []), newMsg] }));
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const selectConv = (id: string) => { setActiveConvId(id); setIsMobileListVisible(false); };

  return (
    // Full-screen layout: sidebar + chat panel, no right widget
    <div className="flex w-full max-w-7xl mx-auto h-screen overflow-hidden">

      {/* ── Left Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* ── DM Panel (fills remaining width) ─────────────────────────── */}
      <div className="flex-1 flex h-screen overflow-hidden">

        {/* ── Conversation List Column ─────── */}
        <div className={`
          w-full md:w-80 flex-shrink-0 flex flex-col h-screen border-r border-sui-cyan/5
          ${isMobileListVisible ? 'flex' : 'hidden md:flex'}
        `}>

          {/* Sticky header (Messages title + search) */}
          <div className="flex-shrink-0 glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-5 py-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sui-cyan" />
                <h2 className="font-mono font-bold text-sm tracking-wider uppercase text-white">Messages</h2>
              </div>
              <button 
                onClick={() => setShowNewChatModal(true)} 
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-sui-cyan/10 border border-sui-cyan/20 text-sui-cyan hover:bg-sui-cyan/20 hover:text-white transition-all shadow-cyber-glow cursor-pointer"
                title="New Chat Session"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
            
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

            {/* Premium tab/pill selectors */}
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
                {convList.some(c => c.unread > 0) && (
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Scrollable conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-[11px] font-mono text-gray-600">No conversations found</div>
            ) : (
              filteredConvs.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConv(conv.id)}
                  className={`w-full flex items-start gap-3 px-4 py-4 text-left border-b border-sui-cyan/5 transition-all hover:bg-sui-cyan/5 ${
                    activeConvId === conv.id ? 'bg-sui-cyan/8 border-l-2 border-l-sui-cyan' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <MessageUserAvatar user={conv.user} className="h-11 w-11" />
                    {conv.user.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-deep-space z-20" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span className="text-sm font-semibold text-white font-sans truncate">{conv.user.displayName}</span>
                        {conv.user.verified && <BadgeCheck className="h-3.5 w-3.5 text-sui-cyan flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-mono text-gray-500">{conv.lastTime}</span>
                        {conv.unread > 0 && (
                          <span className="h-4 min-w-[1rem] px-1 bg-sui-cyan rounded-full text-[9px] font-bold text-deep-space flex items-center justify-center">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate font-sans">{conv.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Sticky E2E footer */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-sui-cyan/5 flex items-center gap-2">
            <Lock className="h-3 w-3 text-emerald-400 flex-shrink-0" />
            <span className="text-[9px] font-mono text-gray-600 leading-relaxed">
              Messages are end-to-end encrypted via Walrus sealed envelopes
            </span>
          </div>
        </div>

        {/* ── Chat Detail Column ───────────── */}
        <div className={`
          flex-1 flex flex-col h-screen overflow-hidden
          ${!isMobileListVisible || activeConvId ? 'flex' : 'hidden md:flex'}
        `}>
          {activeConv ? (
            <>
              {/* Sticky chat header */}
              <div className="flex-shrink-0 glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-5 py-3.5 flex items-center gap-3">
                <button
                  onClick={() => setIsMobileListVisible(true)}
                  className="md:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-sui-cyan/10 text-gray-400 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <Link 
                  href={`/profile?wallet=${activeConv.user.walletAddress || ''}`}
                  className="relative flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity block"
                >
                  <MessageUserAvatar user={activeConv.user} className="h-9 w-9" />
                  {activeConv.user.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-deep-space z-20" />
                  )}
                </Link>

                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link 
                      href={`/profile?wallet=${activeConv.user.walletAddress || ''}`}
                      className="text-sm font-bold text-white font-sans hover:underline hover:text-sui-cyan cursor-pointer transition-colors"
                    >
                      {activeConv.user.displayName}
                    </Link>
                    {activeConv.user.verified && <BadgeCheck className="h-3.5 w-3.5 text-sui-cyan" />}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                    @{activeConv.user.username} · {activeConv.user.online
                      ? <span className="text-emerald-400">Active now</span>
                      : 'Offline'}
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

              {/* Walrus Sealed banner (sticky, below header) */}
              <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 px-4 bg-sui-cyan/3 border-b border-sui-cyan/5">
                <Shield className="h-3 w-3 text-sui-cyan" />
                <span className="text-[9px] font-mono text-gray-500 tracking-wide">
                  Sealed via <span className="text-sui-cyan font-bold">Walrus Sealed</span> — end-to-end encrypted blobs on the Walrus network
                </span>
                <Database className="h-3 w-3 text-sui-cyan" />
              </div>

              {/* Scrollable messages area */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-sui-cyan/5" />
                  <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Today</span>
                  <div className="flex-1 h-px bg-sui-cyan/5" />
                </div>

                {activeMessages.map((msg, idx) => {
                  const isMe = msg.senderId === (authUser?.id || CURRENT_USER.id);
                  const showAvatar = !isMe && (idx === 0 || activeMessages[idx - 1]?.senderId !== msg.senderId);
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
                          <MessageUserAvatar user={activeConv.user} className="h-8 w-8" />
                        </div>
                      )}

                      <div className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm font-sans leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-br from-sui-cyan/25 to-tatum-purple/20 border border-sui-cyan/20 text-white rounded-br-md'
                            : 'bg-walrus-blue/60 border border-sui-cyan/8 text-gray-200 rounded-bl-md'
                        }`}>
                          {msg.text}
                        </div>
                        <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[9px] font-mono text-gray-600">{msg.time}</span>
                          {msg.walrusBlobId && (
                            <div className="flex items-center gap-0.5 text-[8px] font-mono text-sui-cyan/50">
                              <Database className="h-2 w-2" />
                              <span>Walrus Sealed</span>
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
                <div ref={messagesEndRef} />
              </div>

              {/* Sticky message input */}
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
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message @${activeConv.user.username}...`}
                    rows={1}
                    className="flex-1 bg-transparent text-sm font-sans text-gray-200 placeholder-gray-600 resize-none focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
                    style={{ fieldSizing: 'content' } as any}
                  />

                  <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
                    <button className="text-gray-500 hover:text-sui-cyan transition-colors" title="Emoji">
                      <Smile className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-sui-cyan/20 border border-sui-cyan/30 text-sui-cyan hover:bg-sui-cyan/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Send (Enter)"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <Lock className="h-2.5 w-2.5 text-emerald-400" />
                  <span className="text-[8px] font-mono text-gray-600">End-to-end encrypted · Stored on Walrus network · Verifiable on Sui</span>
                </div>
              </div>
            </>
          ) : (
            /* Empty state when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
              <div className="h-16 w-16 rounded-2xl bg-sui-cyan/10 border border-sui-cyan/20 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-sui-cyan" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-white text-sm tracking-wider uppercase mb-2">Select a conversation</h3>
                <p className="text-[11px] font-mono text-gray-500 leading-relaxed max-w-xs">
                  Choose a conversation from the list to start chatting. Messages are sealed end-to-end via Walrus.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-sui-cyan/5 border border-sui-cyan/15 rounded-cyber-md px-4 py-2.5">
                <Zap className="h-3.5 w-3.5 text-sui-cyan" />
                <span className="text-[10px] font-mono text-gray-400">Powered by Walrus Sealed + Sui Network</span>
              </div>
            </div>
          )}
        </div>

      </div>

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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-cyber-md border border-transparent hover:border-sui-cyan/10 hover:bg-sui-cyan/5 text-left transition-all cursor-pointer"
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
