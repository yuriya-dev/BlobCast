'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Database, 
  Link as LinkIcon, 
  Edit3, 
  Coins, 
  BadgeCheck, 
  Users, 
  ShieldCheck, 
  Loader2,
  CheckCircle,
  Globe
} from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostCard } from '@/components/feed/PostCard';
import { mockDb, MockUser, MockPost } from '@/lib/db';
import { walrus } from '@/lib/walrus';

// Custom SVG component for Github icon to avoid library version inconsistencies
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [totalTips, setTotalTips] = useState(148.5);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('https://blobcast.xyz');
  const [github, setGithub] = useState('https://github.com/blobcast');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    // Fetch Yuriya profile from mock DB (usr-2-sademir)
    const user = mockDb.users.find(u => u.id === 'usr-2-sademir') || null;
    if (user) {
      setCurrentUser(user);
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarBlobId || '');
      setBannerUrl(user.bannerBlobId || '');
    }

    // Filter Yuriya posts
    const userPosts = mockDb.posts.filter(p => p.authorId === 'usr-2-sademir');
    
    // Map to feed structure
    const mapped = userPosts.map(p => {
      let text = 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!';
      if (p.walrusContent) {
        text = (p.walrusContent as any).content?.text || text;
      }
      return {
        id: p.id,
        author: {
          displayName: user?.displayName || 'Yuriya',
          username: user?.username || 'yuriya',
          walletAddress: user?.walletAddress || '0x91abc6f3e1b7...',
          avatarBlobId: user?.avatarBlobId || '',
          verified: user?.verified || false,
        },
        walrusBlobId: p.walrusBlobId,
        blobHash: p.blobHash,
        contentType: p.contentType,
        text,
        hashtags: (p.walrusContent as any)?.content?.hashtags || ['blobcast', 'sui'],
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        repostCount: p.repostCount,
        suiObjectId: p.suiObjectId || undefined,
        createdAt: p.createdAt,
      };
    });

    setProfilePosts(mapped);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSaving(true);
    try {
      // Build standard Profile Blob Schema matching spec in full_architecture.md
      const profileBlob = {
        username: currentUser?.username || 'yuriya',
        display_name: displayName,
        bio: bio,
        avatar_blob_id: avatarUrl.startsWith('walrus') ? avatarUrl : `walrus://${avatarUrl}`,
        banner_blob_id: bannerUrl.startsWith('walrus') ? bannerUrl : `walrus://${bannerUrl}`,
        links: {
          website,
          github
        }
      };

      // Upload profile JSON schema to Walrus publisher
      const walrusUploadInfo = await walrus.uploadBlob(profileBlob);

      // Update mock DB
      if (currentUser) {
        currentUser.displayName = displayName;
        currentUser.bio = bio;
        currentUser.avatarBlobId = avatarUrl;
        currentUser.bannerBlobId = bannerUrl;
        
        // Push notification of profile update
        mockDb.notifications.unshift({
          id: `notif_${Date.now()}`,
          userId: 'usr-2-sademir',
          type: 'system',
          actorId: 'usr-2-sademir',
          postId: null,
          isRead: false,
          createdAt: new Date()
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1000);

      loadProfile();
    } catch (e) {
      console.error("❌ Failed saving profile to Walrus:", e);
      alert("Error: Could not publish profile blob to Walrus.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto min-h-screen">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* 2. Middle Profile Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col min-h-screen">
        
        {/* Header toolbar */}
        <header className="glass-panel border-t-0 border-x-0 border-b border-sui-cyan/5 px-6 py-4 sticky top-0 z-40 flex items-center gap-4">
          <Link href="/feed" className="p-2 rounded-xl hover:bg-walrus-blue/50 text-gray-400 hover:text-sui-cyan transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-sans font-bold text-base text-white leading-none">
                {currentUser?.displayName}
              </h2>
              {currentUser?.verified && (
                <BadgeCheck className="h-4 w-4 text-sui-cyan fill-sui-cyan/10" />
              )}
            </div>
            <span className="text-[10px] font-mono text-gray-500 mt-1 block">
              {profilePosts.length} Immutable Casts
            </span>
          </div>
        </header>

        {/* Profile Details Container */}
        <div className="flex flex-col relative">
          
          {/* Cyberpunk Banner */}
          <div className="h-48 w-full walrus-mesh-bg relative overflow-hidden border-b border-sui-cyan/10">
            {/* Cyber network lines in banner */}
            <div 
              className="absolute inset-0 opacity-[0.05]" 
              style={{
                backgroundImage: 'linear-gradient(rgba(111, 231, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(111, 231, 255, 0.3) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            {/* Glowing orb decoration */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-tatum-purple/30 rounded-full blur-2xl animate-pulse" />
          </div>

          {/* Avatar and Edit controls layout */}
          <div className="px-6 flex justify-between items-end -mt-16 mb-4 relative z-20">
            {/* Avatar image frame */}
            <div className="h-28 w-28 rounded-cyber-xl bg-gradient-to-tr from-sui-cyan to-tatum-purple p-1 shadow-cyber-glow">
              <div className="h-full w-full rounded-[28px] bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-3xl font-black text-sui-cyan select-none">
                YU
              </div>
            </div>

            {/* Edit Profile Button */}
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-cyber-md border border-sui-cyan/20 hover:border-sui-cyan/50 bg-walrus-blue/60 backdrop-filter backdrop-blur-md text-xs font-mono font-bold tracking-wide text-soft-white hover:text-sui-cyan transition-all flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Profile
            </button>
          </div>

          {/* User Bio Information */}
          <div className="px-6 flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold text-white font-sans">{currentUser?.displayName}</h1>
                {currentUser?.verified && (
                  <BadgeCheck className="h-5 w-5 text-sui-cyan fill-sui-cyan/10" />
                )}
              </div>
              <span className="text-xs font-mono text-gray-500">@{currentUser?.username}</span>
            </div>

            {/* Bio text */}
            <p className="text-sm text-gray-300 leading-relaxed font-sans">
              {currentUser?.bio}
            </p>

            {/* Links and metadata */}
            <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-500 mt-1">
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-sui-cyan" />
                <a href={website} target="_blank" className="hover:underline text-gray-400 hover:text-white">
                  {website.replace('https://', '')}
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <GithubIcon className="h-3.5 w-3.5 text-tatum-purple" />
                <a href={github} target="_blank" className="hover:underline text-gray-400 hover:text-white">
                  github/blobcast
                </a>
              </div>
              <div className="flex items-center gap-1 bg-sui-cyan/5 px-2.5 py-0.5 rounded-full border border-sui-cyan/10 text-[10px] text-sui-cyan">
                <Database className="h-3 w-3" /> VERIFIED ON WALRUS
              </div>
            </div>

            {/* Stats Dashboard cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 bg-walrus-blue/30 border border-sui-cyan/5 rounded-cyber-lg p-4 shadow-md">
              <div className="text-center md:text-left border-r border-sui-cyan/5">
                <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Casts</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5">{profilePosts.length}</p>
              </div>
              <div className="text-center md:text-left border-r border-sui-cyan/5">
                <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Followers</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5">1,248</p>
              </div>
              <div className="text-center md:text-left border-r border-sui-cyan/5">
                <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Following</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5">384</p>
              </div>
              <div className="text-center md:text-left">
                <span className="text-[10px] uppercase font-mono text-amber-400 flex items-center gap-1 justify-center md:justify-start">
                  <Coins className="h-3 w-3 animate-pulse" /> Tips Received
                </span>
                <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">{totalTips.toFixed(1)} SUI</p>
              </div>
            </div>

          </div>

        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-sui-cyan/5 mt-8 px-6 font-mono text-xs">
          <button className="px-4 py-3 border-b-2 border-sui-cyan text-sui-cyan font-bold">
            CASTS
          </button>
          <button className="px-4 py-3 text-gray-500 hover:text-white transition-colors">
            MEDIA
          </button>
          <button className="px-4 py-3 text-gray-500 hover:text-white transition-colors">
            LIKES
          </button>
        </div>

        {/* Posts feed */}
        <div className="p-6 flex flex-col gap-6 flex-1">
          {profilePosts.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-mono text-xs">
              No casts found. Write posts in feed!
            </div>
          ) : (
            profilePosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>

      </main>

      {/* 3. Right Sidebar Trending Column */}
      <aside className="w-80 flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 h-screen">
          <TrendingWidget />
        </div>
      </aside>

      {/* 4. Edit Profile Glassmorphic Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-space/70 backdrop-filter backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel rounded-cyber-xl p-6 border border-sui-cyan/20 w-full max-w-lg shadow-cyber-glow flex flex-col gap-4 relative z-10"
            >
              
              <div className="flex items-center justify-between border-b border-sui-cyan/10 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-sui-cyan" />
                  <h3 className="font-mono font-bold text-sm tracking-wider uppercase text-white">
                    Edit Cybernetic Identity
                  </h3>
                </div>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-gray-500 hover:text-white transition-colors font-mono text-xs"
                >
                  [Esc]
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                
                {/* Display Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="bg-walrus-blue/40 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2.5 text-xs text-soft-white outline-none focus:border-sui-cyan/50 font-sans"
                    placeholder="Enter visual display name..."
                  />
                </div>

                {/* Bio input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Bio Biography</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="bg-walrus-blue/40 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2.5 text-xs text-soft-white outline-none focus:border-sui-cyan/50 font-sans resize-none"
                    placeholder="Enter decentralized social bio..."
                    maxLength={160}
                  />
                </div>

                {/* Website Links inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Website URL</label>
                    <input 
                      type="text" 
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="bg-walrus-blue/40 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2.5 text-xs text-soft-white outline-none focus:border-sui-cyan/50 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">GitHub Handle</label>
                    <input 
                      type="text" 
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      className="bg-walrus-blue/40 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2.5 text-xs text-soft-white outline-none focus:border-sui-cyan/50 font-mono"
                    />
                  </div>
                </div>

                {/* Avatar Walrus Blob input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Avatar Walrus Blob ID</span>
                    <span className="text-[8px] text-sui-cyan">Aggregator Resolved</span>
                  </label>
                  <input 
                    type="text" 
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="bg-walrus-blue/40 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2.5 text-[10px] text-sui-cyan outline-none focus:border-sui-cyan/50 font-mono"
                    placeholder="walrus://abc123avatar"
                  />
                </div>

                {/* Banner Walrus Blob input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Banner Walrus Blob ID</label>
                  <input 
                    type="text" 
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="bg-walrus-blue/40 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2.5 text-[10px] text-sui-cyan outline-none focus:border-sui-cyan/50 font-mono"
                    placeholder="walrus://banner456"
                  />
                </div>

                {/* Verification alerts */}
                <div className="bg-sui-cyan/5 border border-sui-cyan/20 rounded-cyber-sm p-3.5 text-[10px] font-mono text-gray-400 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-sui-cyan flex-shrink-0" />
                  <p>
                    Saving will compile this Profile Schema JSON and write it permanently onto the Walrus Aggregators Grid. Your ownership reference registers on Sui blockchain.
                  </p>
                </div>

                {/* Form controls */}
                <div className="flex justify-end gap-3 mt-2 border-t border-sui-cyan/10 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-cyber-sm border border-sui-cyan/10 hover:bg-walrus-blue/60 text-xs font-mono font-bold text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || saveSuccess}
                    className="px-6 py-2.5 rounded-cyber-sm bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-xs flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Writing Blob...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-deep-space" />
                        Cast Optimal!
                      </>
                    ) : (
                      <>
                        <Database className="h-3.5 w-3.5" />
                        Publish to Walrus
                      </>
                    )}
                  </button>
                </div>

              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
