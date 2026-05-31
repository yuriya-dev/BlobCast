'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight,
  Database, 
  Link as LinkIcon, 
  Edit3, 
  Coins, 
  BadgeCheck, 
  Users, 
  ShieldCheck, 
  CheckCircle,
  Globe,
  Loader2,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { SearchInputWithRecommendations } from '@/components/feed/SearchInputWithRecommendations';
import { PostCard } from '@/components/feed/PostCard';
import { mockDb, MockUser, MockPost } from '@/lib/db';
import { walrus } from '@/lib/walrus';
import { api } from '@/lib/api';
import { useWalrusImage, WalrusImage } from '@/hooks/useWalrusImage';
import { useAuth } from '@/components/providers/AuthProvider';

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

function FollowUserAvatar({ user }: { user: any }) {
  const avatarUrlResolved = useWalrusImage(user?.avatarBlobId || null);
  const finalAvatar = avatarUrlResolved || (user?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}` : '');

  return (
    <div className="h-8 w-8 rounded-full overflow-hidden bg-walrus-blue border border-sui-cyan/10 flex items-center justify-center font-mono font-bold text-xs text-sui-cyan relative">
      {finalAvatar ? (
        <img 
          src={finalAvatar} 
          alt={user?.displayName || ''}
          className="h-full w-full object-cover z-10"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const searchParams = useSearchParams();
  const queryWallet = searchParams?.get('wallet');
  const queryUsername = searchParams?.get('username');

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const bannerUrlResolved = useWalrusImage(currentUser?.bannerBlobId);
  const avatarUrlResolved = useWalrusImage(currentUser?.avatarBlobId) || 
    (currentUser?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}` : '');

  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'casts' | 'media' | 'likes'>('casts');
  const [totalTips, setTotalTips] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);

  const loadFollowersList = async () => {
    if (!currentUser) return;
    setIsLoadingFollowList(true);
    setIsFollowersModalOpen(true);
    try {
      const res = await api.fetchFollowers(currentUser.walletAddress);
      if (res && res.data && Array.isArray(res.data.followers)) {
        setFollowersList(res.data.followers);
      }
    } catch (err) {
      console.warn("⚠️ API offline. Resolving mock follows list.");
      const followerRelations = mockDb.follows.filter(f => f.followingId === currentUser.id);
      const mapped = followerRelations.map(f => {
        const u = mockDb.users.find(userObj => userObj.id === f.followerId);
        return u || { id: f.followerId, displayName: 'Anonymous Caster', username: 'anonymous', walletAddress: '0x000...', verified: false };
      });
      setFollowersList(mapped);
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const loadFollowingList = async () => {
    if (!currentUser) return;
    setIsLoadingFollowList(true);
    setIsFollowingModalOpen(true);
    try {
      const res = await api.fetchFollowing(currentUser.walletAddress);
      if (res && res.data && Array.isArray(res.data.following)) {
        setFollowingList(res.data.following);
      }
    } catch (err) {
      console.warn("⚠️ API offline. Resolving mock following list.");
      const followingRelations = mockDb.follows.filter(f => f.followerId === currentUser.id);
      const mapped = followingRelations.map(f => {
        const u = mockDb.users.find(userObj => userObj.id === f.followingId);
        return u || { id: f.followingId, displayName: 'Anonymous Caster', username: 'anonymous', walletAddress: '0x000...', verified: false };
      });
      setFollowingList(mapped);
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const syncFollowStateFromServer = async (targetWallet: string) => {
    const lookupKey = queryWallet || queryUsername || targetWallet;
    const profileRes = await api.fetchUserProfile(lookupKey);
    const user = profileRes?.data?.user;
    if (!user) return;
    setCurrentUser((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        isFollowing: user.isFollowing ?? false,
        followersCount: user.followersCount ?? prev.followersCount ?? 0,
        followingCount: user.followingCount ?? prev.followingCount ?? 0,
      };
    });
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !authUser) return;
    setIsTogglingFollow(true);
    try {
      const targetWallet = currentUser.walletAddress;
      if (currentUser.isFollowing) {
        try {
          await api.unfollowUser(targetWallet);
          await syncFollowStateFromServer(targetWallet);
        } catch (apiErr) {
          console.warn("⚠️ API unfollow failed, trying mockDb fallback:", apiErr);
          const followerId = authUser.id;
          const followingUser = mockDb.users.find(u => u.walletAddress.toLowerCase() === targetWallet.toLowerCase()) || { id: targetWallet };
          mockDb.follows = mockDb.follows.filter(f => !(f.followerId === followerId && f.followingId === followingUser.id));
          setCurrentUser((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              isFollowing: false,
              followersCount: Math.max(0, (prev.followersCount || 0) - 1)
            };
          });
        }
      } else {
        try {
          await api.followUser(targetWallet);
          await syncFollowStateFromServer(targetWallet);
        } catch (apiErr) {
          console.warn("⚠️ API follow failed, trying mockDb fallback:", apiErr);
          const followerId = authUser.id;
          const followingUser = mockDb.users.find(u => u.walletAddress.toLowerCase() === targetWallet.toLowerCase()) || { id: targetWallet };
          const exists = mockDb.follows.some(f => f.followerId === followerId && f.followingId === followingUser.id);
          if (!exists) {
            mockDb.follows.push({
              followerId,
              followingId: followingUser.id,
              createdAt: new Date()
            });
          }
          setCurrentUser((prev: any) => {
            if (!prev) return null;
            const alreadyFollowing = mockDb.follows.some(
              f => f.followerId === followerId && f.followingId === followingUser.id
            );
            return {
              ...prev,
              isFollowing: true,
              followersCount: alreadyFollowing
                ? (prev.followersCount || 0)
                : (prev.followersCount || 0) + 1
            };
          });
        }
      }
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
      alert("Failed to update follow relationship. Please try again.");
    } finally {
      setIsTogglingFollow(false);
    }
  };

  // Edit form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('https://blobcast.xyz');
  const [github, setGithub] = useState('https://github.com/blobcast');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const editAvatarUrlResolved = useWalrusImage(avatarUrl);
  const editBannerUrlResolved = useWalrusImage(bannerUrl);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const blobInfo = await walrus.uploadBlob(base64data);
        setAvatarUrl(blobInfo.blobId);
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed uploading avatar:", err);
      alert("Error: Failed to upload avatar to Walrus.");
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const blobInfo = await walrus.uploadBlob(base64data);
        setBannerUrl(blobInfo.blobId);
        setIsUploadingBanner(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed uploading banner:", err);
      alert("Error: Failed to upload banner to Walrus.");
      setIsUploadingBanner(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [queryWallet, queryUsername, authUser]);

  const loadProfile = async () => {
    // Support lookup by wallet address OR username
    const lookupKey = queryWallet || queryUsername || authUser?.walletAddress || '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f';
    // Use as walletKey for localStorage scoping (may be username if wallet not known yet)
    let targetWalletAddress = queryWallet || authUser?.walletAddress || '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f';
    let walletKey = targetWalletAddress.toLowerCase();

    if (queryUsername && !queryWallet) {
      // Try to resolve wallet from mockDb first for localStorage key
      const mockUser = mockDb.users.find(u => (u.username || '').toLowerCase() === queryUsername.toLowerCase());
      if (mockUser) {
        targetWalletAddress = mockUser.walletAddress;
        walletKey = mockUser.walletAddress.toLowerCase();
      }
    }

    if (typeof window !== 'undefined') {
      const storedWebsite = localStorage.getItem(`blobcast_my_website_${walletKey}`);
      const storedGithub = localStorage.getItem(`blobcast_my_github_${walletKey}`);
      if (storedWebsite) setWebsite(storedWebsite);
      if (storedGithub) setGithub(storedGithub);
    }

    let resolvedUserId = authUser?.id || '';
    let databasePinnedPostId: string | null = null;

    try {
      const response = await api.fetchUserProfile(lookupKey);
      
      if (response && response.data && response.data.user) {
        const user = response.data.user;
        // Update walletKey to the real wallet address from the DB response
        walletKey = user.walletAddress.toLowerCase();
        targetWalletAddress = user.walletAddress;
        resolvedUserId = user.id;
        databasePinnedPostId = user.pinnedPostId || null;

        setCurrentUser({
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName,
          avatarBlobId: user.avatarBlobId,
          bannerBlobId: user.bannerBlobId,
          bio: user.bio,
          website: user.website || null,
          github: user.github || null,
          pinnedPostId: user.pinnedPostId || null,
          verified: user.verified,
          createdAt: new Date(user.createdAt),
          followersCount: user.followersCount ?? 0,
          followingCount: user.followingCount ?? 0,
          isFollowing: user.isFollowing ?? false
        });
        setDisplayName(user.displayName || '');
        setBio(user.bio || '');
        setAvatarUrl(user.avatarBlobId || '');
        setBannerUrl(user.bannerBlobId || '');
        if (user.website) setWebsite(user.website);
        if (user.github) setGithub(user.github);

        // Fetch real tips received from database
        try {
          const tipsRes = await api.fetchTipsReceived(user.id);
          const tipsList = tipsRes?.data?.tips || [];
          const sum = tipsList.reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
          setTotalTips(sum);
        } catch (tipsErr) {
          console.warn("⚠️ Failed to fetch real tips for profile:", tipsErr);
          setTotalTips(0);
        }

        // Sync database pinnedPostId with localStorage so the PostCard can also hydrate correctly
        if (typeof window !== 'undefined') {
          if (user.pinnedPostId) {
            localStorage.setItem(`blobcast_pinned_post_id_${walletKey}`, user.pinnedPostId);
          } else {
            localStorage.removeItem(`blobcast_pinned_post_id_${walletKey}`);
          }
        }

        if (user.posts) {
          const mapped = await Promise.all(user.posts.map(async (p: any) => {
            let text = 'Immutable social post stored on Walrus.';
            let hashtags: string[] = [];
            let mediaUrl: string | undefined = undefined;

            if (p.walrusBlobId) {
              try {
                const walrusContent = await walrus.getBlob(p.walrusBlobId);
                if (walrusContent && typeof walrusContent === 'object') {
                  const contentObj = walrusContent as any;
                  if (contentObj.content?.text) {
                    text = contentObj.content.text;
                  }
                  if (contentObj.content?.hashtags) {
                    hashtags = contentObj.content.hashtags;
                  }
                  if (contentObj.media && contentObj.media.length > 0) {
                    mediaUrl = contentObj.media[0].blob_id;
                  }
                }
              } catch (walrusErr) {
                console.warn(`⚠️ Failed to fetch Walrus blob payload for profile post ${p.walrusBlobId}:`, walrusErr);
                if (p.id === 'post-1') {
                  text = 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!';
                  hashtags = ['blobcast', 'sui'];
                } else if (p.id === 'post-2') {
                  text = 'Excited about decentralized social layers! Decentralization means true resilience. Check this out: even if our centralized server is powered down, this content remains accessible directly from the Walrus storage aggregator grid!';
                  hashtags = ['decentralized', 'walrus'];
                  mediaUrl = 'walrus://blob-post-2-image';
                } else {
                  text = `Casting payload registered verifiably. Walrus Blob Reference: ${p.walrusBlobId}`;
                }
              }
            }

            return {
              id: p.id,
              author: {
                displayName: user.displayName || 'Yuriya',
                username: user.username || 'yuriya',
                walletAddress: user.walletAddress,
                avatarBlobId: user.avatarBlobId || '',
                verified: user.verified
              },
              walrusBlobId: p.walrusBlobId,
              blobHash: p.blobHash,
              contentType: p.contentType,
              text,
              hashtags,
              // Robust media resolution matching feed page layout
              mediaUrl: mediaUrl || (p.media && p.media.length > 0 ? p.media[0].walrusBlobId : undefined) || (p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined),
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

          const sortAndPinPosts = (postsList: any[], pinnedIdFromDb?: string | null) => {
            const sorted = [...postsList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const pinnedId = pinnedIdFromDb || (typeof window !== 'undefined' ? localStorage.getItem(`blobcast_pinned_post_id_${walletKey}`) : null);
            if (pinnedId) {
              const pinIdx = sorted.findIndex(p => p.id === pinnedId || (p.repostOf && p.repostOf.id === pinnedId));
              if (pinIdx !== -1) {
                const [pinnedPost] = sorted.splice(pinIdx, 1);
                sorted.unshift(pinnedPost);
              }
            }
            return sorted;
          };

          setProfilePosts(sortAndPinPosts(mapped, user.pinnedPostId));
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to load profile from Express backend. Falling back to local offline mock db.", err);
      
      // Fetch user profile from mock DB or cached session
      // Support both wallet address and username lookup
      let user = mockDb.users.find(u => u.walletAddress.toLowerCase() === targetWalletAddress.toLowerCase());
      
      if (!user && queryUsername) {
        user = mockDb.users.find(u => (u.username || '').toLowerCase() === queryUsername.toLowerCase());
      }
      
      if (!user && authUser && authUser.walletAddress.toLowerCase() === targetWalletAddress.toLowerCase()) {
        user = {
          id: authUser.id,
          walletAddress: authUser.walletAddress,
          username: authUser.username || `anon_${authUser.walletAddress.substring(2, 8)}`,
          displayName: authUser.displayName || 'Anonymous Caster',
          avatarBlobId: authUser.avatarBlobId,
          bannerBlobId: authUser.bannerBlobId,
          bio: authUser.bio || 'Welcome to BlobCast!',
          verified: authUser.verified,
          createdAt: new Date(authUser.createdAt)
        } as any;
      }

      if (!user && authUser) {
        user = {
          id: authUser.id,
          walletAddress: authUser.walletAddress,
          username: authUser.username,
          displayName: authUser.displayName,
          avatarBlobId: authUser.avatarBlobId,
          bannerBlobId: authUser.bannerBlobId,
          bio: authUser.bio,
          verified: authUser.verified,
          createdAt: new Date(authUser.createdAt)
        } as any;
      }

      if (user) {
        const followerId = authUser?.id || '';
        const isFollowing = mockDb.follows.some(f => f.followerId === followerId && f.followingId === user.id);
        const followersCount = mockDb.follows.filter(f => f.followingId === user.id).length;
        const followingCount = mockDb.follows.filter(f => f.followerId === user.id).length;

        setCurrentUser({
          ...user,
          followersCount,
          followingCount,
          isFollowing
        });
        setDisplayName(user.displayName || '');
        setBio(user.bio || '');
        setAvatarUrl(user.avatarBlobId || '');
        setBannerUrl(user.bannerBlobId || '');
        if (user.website) setWebsite(user.website);
        if (user.github) setGithub(user.github);
      }

      // Filter Yuriya posts
      const userPosts = mockDb.posts.filter(p => p.authorId === user?.id);
      
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
            walletAddress: user?.walletAddress || '0x91abc6f3e1b...',
            avatarBlobId: user?.avatarBlobId || '',
            verified: user?.verified || false,
          },
          walrusBlobId: p.walrusBlobId,
          blobHash: p.blobHash,
          contentType: p.contentType,
          text,
          hashtags: (p.walrusContent as any)?.content?.hashtags || ['blobcast', 'sui'],
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

      const sortAndPinPosts = (postsList: any[], pinnedIdFromDb?: string | null) => {
        const sorted = [...postsList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const pinnedId = pinnedIdFromDb || (typeof window !== 'undefined' ? localStorage.getItem(`blobcast_pinned_post_id_${walletKey}`) : null);
        if (pinnedId) {
          const pinIdx = sorted.findIndex(p => p.id === pinnedId || (p.repostOf && p.repostOf.id === pinnedId));
          if (pinIdx !== -1) {
            const [pinnedPost] = sorted.splice(pinIdx, 1);
            sorted.unshift(pinnedPost);
          }
        }
        return sorted;
      };

      setProfilePosts(sortAndPinPosts(mapped, user?.pinnedPostId));
    }

    // Now load liked posts, using the resolved user ID
    let likedMapped: any[] = [];
    try {
      const allPostsRes = await api.fetchPosts(1, 100);
      if (allPostsRes && allPostsRes.data && allPostsRes.data.posts) {
        const apiAllPosts = allPostsRes.data.posts;
        likedMapped = await Promise.all(apiAllPosts.map(async (p: any) => {
          let text = 'Immutable social post stored on Walrus.';
          let hashtags: string[] = [];
          let mediaUrl: string | undefined = undefined;

          if (p.walrusBlobId) {
            try {
              const walrusContent = await walrus.getBlob(p.walrusBlobId);
              if (walrusContent && typeof walrusContent === 'object') {
                const contentObj = walrusContent as any;
                if (contentObj.content?.text) text = contentObj.content.text;
                if (contentObj.content?.hashtags) hashtags = contentObj.content.hashtags;
                if (contentObj.media && contentObj.media.length > 0) mediaUrl = contentObj.media[0].blob_id;
              }
            } catch (err) {
              if (p.id === 'post-1') {
                text = 'Welcome to BlobCast! Own your social posts forever.';
                hashtags = ['blobcast', 'sui'];
              } else if (p.id === 'post-2') {
                text = 'Excited about decentralized social layers!';
                hashtags = ['decentralized', 'walrus'];
                mediaUrl = 'walrus://blob-post-2-image';
              }
            }
          }

          return {
            id: p.id,
            author: {
              displayName: p.author?.displayName || 'Anonymous Caster',
              username: p.author?.username || 'anonymous',
              walletAddress: p.author?.walletAddress || '0x0000...',
              avatarBlobId: p.author?.avatarBlobId || '',
              verified: p.author?.verified || false
            },
            walrusBlobId: p.walrusBlobId,
            blobHash: p.blobHash,
            contentType: p.contentType,
            text,
            hashtags,
            mediaUrl: mediaUrl || (p.media && p.media.length > 0 ? p.media[0].walrusBlobId : undefined) || (p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined),
            likeCount: p.repostOf ? p.repostOf.likeCount : p.likeCount,
            commentCount: p.repostOf ? p.repostOf.commentCount : p.commentCount,
            repostCount: p.repostOf ? p.repostOf.repostCount : p.repostCount,
            suiObjectId: p.suiObjectId || undefined,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            likes: p.repostOf ? (p.repostOf.likes || []) : (p.likes || []),
            reposts: p.repostOf ? (p.repostOf.reposts || []) : (p.reposts || []),
            repostOf: p.repostOf ? {
              id: p.repostOf.id,
              author: {
                displayName: p.repostOf.author?.displayName || 'Anonymous Caster',
                username: p.repostOf.author?.username || 'anonymous',
                walletAddress: p.repostOf.author?.walletAddress || '0x0000...',
                avatarBlobId: p.repostOf.author?.avatarBlobId || '',
                verified: p.repostOf.author?.verified || false
              }
            } : null
          };
        }));
      }
    } catch (err) {
      // failed
    }

    if (likedMapped.length === 0) {
      likedMapped = mockDb.posts.map(p => {
        const authorUser = mockDb.users.find(u => u.id === p.authorId) || mockDb.users[0];
        let text = 'Immutable social post stored on Walrus.';
        if (p.walrusContent) {
          text = (p.walrusContent as any).content?.text || text;
        }
        return {
          id: p.id,
          author: {
            displayName: authorUser.displayName || 'Anonymous Caster',
            username: authorUser.username || 'anonymous',
            walletAddress: authorUser.walletAddress,
            avatarBlobId: authorUser.avatarBlobId || '',
            verified: authorUser.verified,
          },
          walrusBlobId: p.walrusBlobId,
          blobHash: p.blobHash,
          contentType: p.contentType,
          text,
          hashtags: (p.walrusContent as any)?.content?.hashtags || ['blobcast', 'sui'],
          mediaUrl: p.walrusContent?.media?.[0]?.blob_id || (p.contentType === 1 ? 'walrus://blob-post-2-image' : undefined),
          media: p.walrusContent?.media || (p.contentType === 1 ? [{ type: 'image', blob_id: 'walrus://blob-post-2-image' }] : []),
          walrusContent: p.walrusContent,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          suiObjectId: p.suiObjectId || undefined,
          createdAt: p.createdAt,
          likes: mockDb.likes.filter(l => l.postId === p.id) || [],
          reposts: []
        };
      });
    }

    // Filter likes by the resolved database userId OR walletAddress matching
    const yuriyaLikes = likedMapped.filter(p => 
      p.likes.some((l: any) => 
        l.userId === resolvedUserId || 
        l.userId === authUser?.id ||
        l.walletAddress?.toLowerCase() === targetWalletAddress.toLowerCase() ||
        l.user?.walletAddress?.toLowerCase() === targetWalletAddress.toLowerCase()
      )
    );
    setLikedPosts(yuriyaLikes);
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

      // Save profile metadata to Supabase backend API
      try {
        await api.upsertUserProfile({
          walletAddress: authUser?.walletAddress || currentUser?.walletAddress || '',
          username: authUser?.username || currentUser?.username || '',
          displayName: displayName,
          bio: bio,
          avatarBlobId: avatarUrl,
          bannerBlobId: bannerUrl,
          website: website,
          github: github
        });
      } catch (backendErr) {
        console.warn("⚠️ Failed to synchronize updated profile metadata with REST API server.");
      }

      // Update mock DB
      const targetWalletForMock = (authUser?.walletAddress || currentUser?.walletAddress || '').toLowerCase();
      const mockUserIdx = mockDb.users.findIndex(u => u.walletAddress.toLowerCase() === targetWalletForMock);
      if (mockUserIdx !== -1) {
        mockDb.users[mockUserIdx].displayName = displayName;
        mockDb.users[mockUserIdx].bio = bio;
        mockDb.users[mockUserIdx].avatarBlobId = avatarUrl;
        mockDb.users[mockUserIdx].bannerBlobId = bannerUrl;
      }

      if (currentUser) {
        currentUser.displayName = displayName;
        currentUser.bio = bio;
        currentUser.avatarBlobId = avatarUrl;
        currentUser.bannerBlobId = bannerUrl;
        
        // Persist avatar blob ID to localStorage so PostComposer and other components
        // always display the correct uploaded avatar across page navigation
        if (authUser?.walletAddress) {
          const walletKey = authUser.walletAddress.toLowerCase();
          if (avatarUrl) {
            const key = `blobcast_my_avatar_blob_id_${walletKey}`;
            localStorage.setItem(key, avatarUrl);
          }
          localStorage.setItem(`blobcast_my_website_${walletKey}`, website);
          localStorage.setItem(`blobcast_my_github_${walletKey}`, github);
        }
        
        // Push notification of profile update
        mockDb.notifications.unshift({
          id: `notif_${Date.now()}`,
          userId: authUser?.id || '',
          type: 'system',
          actorId: authUser?.id || '',
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

  const handlePinPost = async (postId: string, pinned: boolean) => {
    const nextPinnedId = pinned ? postId : null;

    // 1. Sync with localStorage as fallback
    const walletKey = (currentUser?.walletAddress || authUser?.walletAddress || '').toLowerCase();
    if (typeof window !== 'undefined' && walletKey) {
      if (pinned) {
        localStorage.setItem(`blobcast_pinned_post_id_${walletKey}`, postId);
      } else {
        localStorage.removeItem(`blobcast_pinned_post_id_${walletKey}`);
      }
    }

    // 2. Sync with database via API
    try {
      await api.upsertUserProfile({
        walletAddress: currentUser?.walletAddress || authUser?.walletAddress || '',
        pinnedPostId: nextPinnedId
      });
    } catch (err) {
      console.warn("⚠️ Failed to synchronize pinned post in Supabase/PostgreSQL:", err);
    }

    // 3. Immediately reorder posts state to push the pinned post to top
    setProfilePosts(prev => {
      const idx = prev.findIndex(p => p.id === postId || (p.repostOf && p.repostOf.id === postId));
      if (idx === -1) return prev;
      
      const updated = [...prev];
      const [pinnedPost] = updated.splice(idx, 1);
      
      // Re-sort the rest of the posts by date to be clean
      const reSorted = [...updated].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (pinned) {
        return [pinnedPost, ...reSorted];
      } else {
        return [pinnedPost, ...reSorted].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    });
  };

  const getFilteredPosts = () => {
    if (activeTab === 'casts') {
      return profilePosts;
    }
    if (activeTab === 'media') {
      return profilePosts.filter(post => post.mediaUrl);
    }
    if (activeTab === 'likes') {
      return likedPosts;
    }
    return profilePosts;
  };

  const displayedPosts = getFilteredPosts();

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden">
      
      {/* 1. Left Sidebar Navigation Column */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* 2. Middle Profile Column */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
        
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
            {bannerUrlResolved ? (
              <img 
                src={bannerUrlResolved} 
                alt={`${currentUser?.displayName}'s banner`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
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
              <div className="h-full w-full rounded-[28px] bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-3xl font-black text-sui-cyan select-none relative">
                {avatarUrlResolved ? (
                  <img 
                    src={avatarUrlResolved} 
                    alt={`${currentUser?.displayName}'s avatar`}
                    className="h-full w-full object-cover z-10"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
              </div>
            </div>

            {/* Edit Profile or Follow/Unfollow Button */}
            {(authUser && currentUser && currentUser.walletAddress.toLowerCase() === authUser.walletAddress.toLowerCase()) ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-cyber-md border border-sui-cyan/20 hover:border-sui-cyan/50 bg-walrus-blue/60 backdrop-filter backdrop-blur-md text-xs font-mono font-bold tracking-wide text-soft-white hover:text-sui-cyan transition-all flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            ) : (
              <button 
                onClick={handleFollowToggle}
                disabled={isTogglingFollow}
                className={`px-5 py-2 rounded-cyber-md text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
                  currentUser?.isFollowing 
                    ? 'border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 text-rose-300 hover:text-rose-200'
                    : 'bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space hover:opacity-95 shadow-cyber-glow'
                }`}
              >
                {isTogglingFollow ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : currentUser?.isFollowing ? (
                  'Unfollow'
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" /> Follow
                  </>
                )}
              </button>
            )}
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
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" className="hover:underline text-gray-400 hover:text-white no-navigate">
                  {website.replace('https://', '').replace('http://', '')}
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <GithubIcon className="h-3.5 w-3.5 text-tatum-purple" />
                <a href={github.startsWith('http') ? github : `https://github.com/${github}`} target="_blank" className="hover:underline text-gray-400 hover:text-white no-navigate">
                  {github.replace('https://github.com/', '').replace('github.com/', '').replace('http://github.com/', '')}
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
              <div 
                onClick={loadFollowersList}
                className="text-center md:text-left border-r border-sui-cyan/5 cursor-pointer hover:bg-sui-cyan/5 active:scale-[0.98] transition-all rounded-lg p-1"
                title="View Followers"
              >
                <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Followers</span>
                <p className="text-lg font-bold font-mono text-sui-cyan mt-0.5">{currentUser?.followersCount !== undefined ? currentUser.followersCount : '0'}</p>
              </div>
              <div 
                onClick={loadFollowingList}
                className="text-center md:text-left border-r border-sui-cyan/5 cursor-pointer hover:bg-sui-cyan/5 active:scale-[0.98] transition-all rounded-lg p-1"
                title="View Following"
              >
                <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Following</span>
                <p className="text-lg font-bold font-mono text-sui-cyan mt-0.5">{currentUser?.followingCount !== undefined ? currentUser.followingCount : '0'}</p>
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
          <button 
            onClick={() => setActiveTab('casts')}
            className={`px-4 py-3 border-b-2 transition-all font-bold ${activeTab === 'casts' ? 'border-sui-cyan text-sui-cyan' : 'border-transparent text-gray-500 hover:text-white'}`}
          >
            CASTS
          </button>
          <button 
            onClick={() => setActiveTab('media')}
            className={`px-4 py-3 border-b-2 transition-all font-bold ${activeTab === 'media' ? 'border-sui-cyan text-sui-cyan' : 'border-transparent text-gray-500 hover:text-white'}`}
          >
            MEDIA
          </button>
          <button 
            onClick={() => setActiveTab('likes')}
            className={`px-4 py-3 border-b-2 transition-all font-bold ${activeTab === 'likes' ? 'border-sui-cyan text-sui-cyan' : 'border-transparent text-gray-500 hover:text-white'}`}
          >
            LIKES
          </button>
        </div>

        {/* Posts feed */}
        <div className="p-6 flex flex-col gap-6 flex-1">
          {displayedPosts.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-mono text-xs">
              No casts found. Write posts in feed!
            </div>
          ) : (
            displayedPosts.map(post => (
              <PostCard key={post.id} post={post} onPin={handlePinPost} />
            ))
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

      {/* 4. Edit Profile Glassmorphic Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-space/70 backdrop-filter backdrop-blur-md"
            onClick={() => setIsEditing(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel rounded-cyber-xl p-6 border border-sui-cyan/20 w-full max-w-lg shadow-cyber-glow flex flex-col gap-4 relative z-10"
              onClick={(e) => e.stopPropagation()}
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
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Avatar Web3 Identity</span>
                    <span className="text-[8px] text-sui-cyan animate-pulse">Walrus Storage Upload</span>
                  </label>
                  <div className="flex items-center gap-3 bg-deep-space/50 border border-sui-cyan/10 rounded-cyber-md p-3">
                    <div className="h-12 w-12 rounded-full bg-walrus-blue border border-sui-cyan/20 overflow-hidden flex items-center justify-center font-mono text-[9px] text-sui-cyan uppercase flex-shrink-0 relative">
                      {editAvatarUrlResolved ? (
                        <img 
                          src={editAvatarUrlResolved} 
                          alt="Avatar upload preview" 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        'None'
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        id="avatar-file-input"
                        className="hidden"
                      />
                      <label 
                        htmlFor="avatar-file-input"
                        className="px-3 py-1.5 bg-walrus-blue border border-sui-cyan/20 hover:border-sui-cyan/40 text-[10px] font-mono text-center text-gray-400 hover:text-white rounded-cyber-sm cursor-pointer transition-all uppercase block"
                      >
                        {isUploadingAvatar ? 'Uploading to Walrus...' : 'Select Avatar Image'}
                      </label>
                      <span className="text-[8px] font-mono text-gray-500 truncate block" title={avatarUrl}>
                        {avatarUrl ? `Blob ID: ${avatarUrl}` : 'No image uploaded yet'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Banner Walrus Blob input */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Banner Visual Backdrop</span>
                    <span className="text-[8px] text-sui-cyan animate-pulse">Walrus Storage Upload</span>
                  </label>
                  <div className="flex items-center gap-3 bg-deep-space/50 border border-sui-cyan/10 rounded-cyber-md p-3">
                    <div className="h-12 w-20 rounded-cyber-sm bg-walrus-blue border border-sui-cyan/20 overflow-hidden flex items-center justify-center font-mono text-[9px] text-sui-cyan uppercase flex-shrink-0 relative">
                      {editBannerUrlResolved ? (
                        <img 
                          src={editBannerUrlResolved} 
                          alt="Banner upload preview" 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        'None'
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleBannerUpload}
                        id="banner-file-input"
                        className="hidden"
                      />
                      <label 
                        htmlFor="banner-file-input"
                        className="px-3 py-1.5 bg-walrus-blue border border-sui-cyan/20 hover:border-sui-cyan/40 text-[10px] font-mono text-center text-gray-400 hover:text-white rounded-cyber-sm cursor-pointer transition-all uppercase block"
                      >
                        {isUploadingBanner ? 'Uploading to Walrus...' : 'Select Banner Image'}
                      </label>
                      <span className="text-[8px] font-mono text-gray-500 truncate block" title={bannerUrl}>
                        {bannerUrl ? `Blob ID: ${bannerUrl}` : 'No image uploaded yet'}
                      </span>
                    </div>
                  </div>
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

      {/* 5. Followers List Modal */}
      <AnimatePresence>
        {isFollowersModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-space/70 backdrop-filter backdrop-blur-md"
            onClick={() => setIsFollowersModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel rounded-cyber-xl p-6 border border-sui-cyan/20 w-full max-w-md shadow-cyber-glow flex flex-col gap-4 relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-sui-cyan/15 pb-3">
                <h3 className="font-mono font-bold text-sm text-sui-cyan uppercase">
                  👤 Followers List ({followersList.length})
                </h3>
                <button 
                  onClick={() => setIsFollowersModalOpen(false)}
                  className="text-gray-500 hover:text-white font-mono text-xs cursor-pointer border border-sui-cyan/10 rounded px-1.5 py-0.5"
                >
                  [Close]
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto scrollbar-thin flex flex-col gap-2.5">
                {isLoadingFollowList ? (
                  <div className="py-10 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 text-sui-cyan animate-spin" />
                    <span className="text-[10px] font-mono text-gray-500">Querying on-chain social graph...</span>
                  </div>
                ) : followersList.length === 0 ? (
                  <div className="text-center py-10 font-mono text-xs text-gray-500">
                    No followers found.
                  </div>
                ) : (
                  followersList.map((fUser) => (
                    <Link
                      key={fUser.id}
                      href={`/profile?wallet=${fUser.walletAddress}`}
                      onClick={() => setIsFollowersModalOpen(false)}
                      className="flex items-center justify-between p-2 rounded-xl bg-walrus-blue/30 border border-sui-cyan/5 hover:border-sui-cyan/25 hover:bg-walrus-blue/60 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FollowUserAvatar user={fUser} />
                        <div className="flex flex-col">
                          <span className="text-xs font-sans font-semibold text-white group-hover:text-sui-cyan leading-tight transition-colors">
                            {fUser.displayName}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500 mt-0.5">
                            @{fUser.username}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-sui-cyan transition-colors" />
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Following List Modal */}
      <AnimatePresence>
        {isFollowingModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-space/70 backdrop-filter backdrop-blur-md"
            onClick={() => setIsFollowingModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass-panel rounded-cyber-xl p-6 border border-sui-cyan/20 w-full max-w-md shadow-cyber-glow flex flex-col gap-4 relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-sui-cyan/15 pb-3">
                <h3 className="font-mono font-bold text-sm text-sui-cyan uppercase">
                  👤 Following List ({followingList.length})
                </h3>
                <button 
                  onClick={() => setIsFollowingModalOpen(false)}
                  className="text-gray-500 hover:text-white font-mono text-xs cursor-pointer border border-sui-cyan/10 rounded px-1.5 py-0.5"
                >
                  [Close]
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto scrollbar-thin flex flex-col gap-2.5">
                {isLoadingFollowList ? (
                  <div className="py-10 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 text-sui-cyan animate-spin" />
                    <span className="text-[10px] font-mono text-gray-500">Querying on-chain social graph...</span>
                  </div>
                ) : followingList.length === 0 ? (
                  <div className="text-center py-10 font-mono text-xs text-gray-500">
                    Not following any users.
                  </div>
                ) : (
                  followingList.map((fUser) => (
                    <Link
                      key={fUser.id}
                      href={`/profile?wallet=${fUser.walletAddress}`}
                      onClick={() => setIsFollowingModalOpen(false)}
                      className="flex items-center justify-between p-2 rounded-xl bg-walrus-blue/30 border border-sui-cyan/5 hover:border-sui-cyan/25 hover:bg-walrus-blue/60 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FollowUserAvatar user={fUser} />
                        <div className="flex flex-col">
                          <span className="text-xs font-sans font-semibold text-white group-hover:text-sui-cyan leading-tight transition-colors">
                            {fUser.displayName}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500 mt-0.5">
                            @{fUser.username}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-sui-cyan transition-colors" />
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
