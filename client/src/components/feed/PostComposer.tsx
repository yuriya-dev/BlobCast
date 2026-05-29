'use client';

import React, { useState, useEffect } from 'react';
import { Image, Send, Link, Smile, Globe, Loader2, Sparkles, Database } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { walrus } from '@/lib/walrus';
import { useWalrusImage, WalrusImage } from '@/hooks/useWalrusImage';
import { api } from '@/lib/api';
import { mockDb } from '@/lib/db';

interface PostComposerProps {
  onPostCreated: (newPost: any) => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const account = useCurrentAccount();
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(false);

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  // Read from avatarBlobId directly — no hardcoded fallback so we don't override the user's actual upload
  const avatarUrlResolved = useWalrusImage(currentUser?.avatarBlobId || null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const wallet = account?.address || '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f';
        const res = await api.fetchUserProfile(wallet);
        if (res && res.data && res.data.user) {
          const userData = res.data.user;
          // Prefer the persisted avatar blob ID from localStorage (set when user saves profile)
          // This ensures the uploaded image is shown even before API returns
          const persistedAvatarBlobId = localStorage.getItem('blobcast_my_avatar_blob_id');
          if (persistedAvatarBlobId && !userData.avatarBlobId) {
            userData.avatarBlobId = persistedAvatarBlobId;
          } else if (userData.avatarBlobId) {
            // Keep localStorage in sync with the DB value
            localStorage.setItem('blobcast_my_avatar_blob_id', userData.avatarBlobId);
          }
          setCurrentUser(userData);
          return;
        }
      } catch (err) {
        console.warn("⚠️ API offline. Falling back to local db user profile.", err);
      }
      
      // Offline fallback: use mockDb but override avatarBlobId with whatever was saved by the user
      const user = { ...(
        mockDb.users.find(u => u.id === 'usr-2-sademir') || {
          displayName: 'Yuriya',
          username: 'yuriya',
          avatarBlobId: null as string | null
        }
      ) };
      // Override with the locally persisted avatar blob ID so uploads survive page navigation
      const persistedAvatarBlobId = localStorage.getItem('blobcast_my_avatar_blob_id');
      if (persistedAvatarBlobId) {
        user.avatarBlobId = persistedAvatarBlobId;
      }
      setCurrentUser(user);
    };

    fetchUser();
  }, [account]);

  const userInitials = (currentUser?.displayName || currentUser?.username || 'YU')
    .substring(0, 2)
    .toUpperCase();

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setShowMediaInput(true); // Open block to show uploading feedback!
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const blobInfo = await walrus.uploadBlob(base64data);
        setMediaUrl(blobInfo.blobId);
        setIsUploadingMedia(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed uploading media:", err);
      alert("Error: Failed to upload media to Walrus.");
      setIsUploadingMedia(false);
      setShowMediaInput(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) return;

    setIsUploading(true);
    try {
      // Build Post Blob schema matching spec in full_architecture.md
      const postBlob = {
        version: 1,
        type: 'post',
        author_wallet: account?.address || '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
        created_at: Math.floor(Date.now() / 1000),
        content: {
          text: text,
          hashtags: extractHashtags(text),
          mentions: []
        },
        media: mediaUrl ? [
          {
            type: 'image',
            blob_id: mediaUrl.startsWith('walrus') ? mediaUrl : `walrus://${mediaUrl}`,
            mime: 'image/png',
            width: 800,
            height: 600
          }
        ] : [],
        metadata: {
          language: 'en',
          client: 'blobcast-web'
        }
      };

      // Upload payload JSON blob directly to Walrus decentralized storage!
      const walrusUploadInfo = await walrus.uploadBlob(postBlob);

      // Trigger callback with new created mock post data
      onPostCreated({
        id: `post_${Date.now()}`,
        authorId: 'usr-2-sademir', // Yuriya profile
        suiObjectId: `0x${Math.random().toString(16).substring(2, 18)}sui_object`,
        walrusBlobId: walrusUploadInfo.blobId,
        blobHash: `sha256-${Math.random().toString(36).substring(2, 10)}`,
        contentType: mediaUrl ? 1 : 0,
        visibility: 0,
        replyToId: null,
        repostOfId: null,
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        score: 0,
        createdAt: new Date(),
        // Embed the actual loaded Walrus content for fast rendering
        walrusContent: postBlob,
      });

      setText('');
      setMediaUrl('');
      setShowMediaInput(false);
    } catch (e) {
      console.error("❌ Failed publishing post to Walrus:", e);
      alert("Error publishing: Could not store content on Walrus.");
    } finally {
      setIsUploading(false);
    }
  };

  const extractHashtags = (str: string): string[] => {
    const matches = str.match(/#\w+/g);
    return matches ? matches.map(tag => tag.replace('#', '').toLowerCase()) : [];
  };

  return (
    <div className="glass-panel rounded-cyber-lg shadow-cyber-glow p-5 border border-sui-cyan/10">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Input box */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
            <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-xs font-bold text-sui-cyan relative">
              {avatarUrlResolved ? (
                <img 
                  src={avatarUrlResolved} 
                  alt="My avatar"
                  className="h-full w-full object-cover z-10"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span className="text-neon-glow absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 select-none pointer-events-none font-mono">
                {userInitials}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's happening? Type posts to save permanently on Walrus..."
              className="w-full bg-transparent border-none outline-none resize-none min-h-[90px] text-soft-white placeholder-gray-500 text-sm font-sans"
              maxLength={280}
            />
          </div>
        </div>

        {/* Dynamic media file selector & preview */}
        {showMediaInput && (
          <div className="border border-sui-cyan/15 rounded-cyber-md bg-walrus-blue/30 p-3 text-xs flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                ⚡ Walrus Storage Shard registry
              </span>
              {mediaUrl && !isUploadingMedia && (
                <button 
                  type="button"
                  onClick={() => {
                    setMediaUrl('');
                    setShowMediaInput(false);
                  }}
                  className="text-[9px] font-mono text-rose-400 hover:text-white uppercase transition-colors"
                >
                  [Remove]
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 bg-deep-space/50 border border-sui-cyan/5 rounded-cyber-sm p-3">
              <div className="h-12 w-16 rounded bg-walrus-blue border border-sui-cyan/20 overflow-hidden flex items-center justify-center font-mono text-[9px] text-sui-cyan uppercase flex-shrink-0 relative">
                {mediaUrl ? (
                  <WalrusImage 
                    blobId={mediaUrl} 
                    alt="Composer upload preview" 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback text if the image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                {!mediaUrl && 'Upload'}
              </div>
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {isUploadingMedia ? (
                  <span className="text-[10px] font-mono text-sui-cyan animate-pulse flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Querying Walrus Publisher...
                  </span>
                ) : (
                  <>
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                      Persistent media certifier OK
                    </span>
                    <span className="text-[8px] font-mono text-gray-500 truncate block" title={mediaUrl}>
                      ID: {mediaUrl}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-sui-cyan/10" />

        {/* Footer controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleMediaUpload}
              id="composer-media-file-input"
              className="hidden"
            />
            <label 
              htmlFor="composer-media-file-input"
              className={`p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all cursor-pointer block`}
              title="Upload media to Walrus"
            >
              <Image className="h-4 w-4" />
            </label>
            <button 
              type="button"
              className="p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all"
            >
              <Smile className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1 ml-2">
              <Globe className="h-3 w-3" /> Publicly Verifiable
            </span>
          </div>

          <div className="flex items-center gap-3">
            {text.length > 200 && (
              <span className="text-xs font-mono text-gray-500">
                {280 - text.length}
              </span>
            )}
            
            <button
              type="submit"
              disabled={isUploading || (!text.trim() && !mediaUrl)}
              className="px-5 py-2.5 rounded-cyber-md bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-xs flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Storing Blob...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Cast to Walrus
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
