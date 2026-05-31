'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Image, Send, Link, Smile, Globe, Loader2, Sparkles, Database, X } from 'lucide-react';
import EmojiPicker, { type EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import EmojiModal from '@/components/common/EmojiModal';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { walrus } from '@/lib/walrus';
import { useWalrusImage, WalrusImage } from '@/hooks/useWalrusImage';
import { api } from '@/lib/api';
import {
  computeSha256,
  hashToHex,
  buildPublishPostTransaction,
  parseCreatedObjectId
} from '@/lib/sui';
import { mockDb } from '@/lib/db';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTextAutocomplete } from '@/hooks/useTextAutocomplete';
import { AutocompleteDropdown } from '@/components/feed/AutocompleteDropdown';

interface PostComposerProps {
  onPostCreated: (newPost: any) => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { user: authUser } = useAuth();
  interface MediaItem {
    blobId: string;
    type: 'image' | 'video';
  }

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  // Read from avatarBlobId directly — no hardcoded fallback so we don't override the user's actual upload
  const avatarUrlResolved = useWalrusImage(currentUser?.avatarBlobId || null);
  const finalAvatar = avatarUrlResolved || (currentUser?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}` : '');

  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Fetch all users on mount for autocomplete
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.fetchAllUsers();
        if (active && res?.data && Array.isArray(res.data.users)) {
          setAllUsers(res.data.users);
        } else if (active) {
          setAllUsers(mockDb.users);
        }
      } catch {
        if (active) setAllUsers(mockDb.users);
      }
    })();
    return () => { active = false; };
  }, []);

  const {
    text,
    setText,
    textareaRef,
    containerRef: composerContainerRef,
    showDropdown,
    dropdownType,
    selectedIndex,
    mentionSuggestions,
    hashtagSuggestions,
    tickerSuggestions,
    handleTextChange,
    handleKeyDown,
    insertMention,
    insertHashtag,
    insertTicker,
    closeDropdown,
  } = useTextAutocomplete({ users: allUsers });

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (composerContainerRef.current && !composerContainerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  const extractMentions = (str: string): string[] => {
    const matches = str.match(/@\w+/g);
    return matches ? matches.map(m => m.replace('@', '').toLowerCase()) : [];
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (authUser) {
        const key = `blobcast_my_avatar_blob_id_${authUser.walletAddress.toLowerCase()}`;
        const persistedAvatarBlobId = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        setCurrentUser({
          ...authUser,
          avatarBlobId: authUser.avatarBlobId || persistedAvatarBlobId || null,
        });
        return;
      }

      const wallet = account?.address;
      if (!wallet) {
        return;
      }

      const key = `blobcast_my_avatar_blob_id_${wallet.toLowerCase()}`;

      try {
        const res = await api.fetchUserProfile(wallet);
        if (res && res.data && res.data.user) {
          const userData = res.data.user;
          // Prefer the persisted avatar blob ID from localStorage (set when user saves profile)
          // This ensures the uploaded image is shown even before API returns
          const persistedAvatarBlobId = localStorage.getItem(key);
          if (persistedAvatarBlobId && !userData.avatarBlobId) {
            userData.avatarBlobId = persistedAvatarBlobId;
          } else if (userData.avatarBlobId) {
            // Keep localStorage in sync with the DB value
            localStorage.setItem(key, userData.avatarBlobId);
          }
          setCurrentUser(userData);
          return;
        }
      } catch (err) {
        console.warn("⚠️ API offline. Falling back to local db user profile.", err);
      }
      
      // Offline fallback: use mockDb but override avatarBlobId with whatever was saved by the user
      const user = { ...(
        mockDb.users.find(u => u.walletAddress === wallet) || {
          displayName: 'Yuriya',
          username: 'yuriya',
          avatarBlobId: null as string | null
        }
      ) };
      // Override with the locally persisted avatar blob ID so uploads survive page navigation
      const persistedAvatarBlobId = localStorage.getItem(key);
      if (persistedAvatarBlobId) {
        user.avatarBlobId = persistedAvatarBlobId;
      }
      setCurrentUser(user);
    };

    fetchUser();
  }, [account?.address, authUser]);

  const userInitials = (currentUser?.displayName || currentUser?.username || 'YU')
    .substring(0, 2)
    .toUpperCase();

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => `${prev}${emojiData.emoji}`);
    setShowEmojiPicker(false);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        resolve(0);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let newItems = [...mediaItems];

    for (const file of files) {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');

      if (!isImg && !isVid) {
        alert("Hanya file gambar atau video yang didukung.");
        continue;
      }

      if (isVid) {
        if (newItems.length > 0) {
          alert("Cannot combine photos and videos in one post! Maximum 1 video.");
          break;
        }

        const duration = await getVideoDuration(file);
        if (duration > 30) {
          alert("Durasi video melebihi batas maksimal 30 detik!");
          break;
        }
        
        setIsUploadingMedia(true);
        setShowMediaInput(true);
        try {
          const base64data = await readFileAsDataURL(file);
          const blobInfo = await walrus.uploadBlob(base64data);
          newItems.push({
            blobId: blobInfo.blobId,
            type: 'video'
          });
          setMediaItems([...newItems]);
        } catch (err) {
          console.error("Failed uploading video:", err);
          alert("Error: Gagal mengunggah video ke Walrus.");
        } finally {
          setIsUploadingMedia(false);
        }
        break;
      }

      if (isImg) {
        if (newItems.some(i => i.type === 'video')) {
          alert("Tidak dapat menggabungkan foto dan video dalam satu post!");
          break;
        }
        const imageCount = newItems.filter(i => i.type === 'image').length;
        if (imageCount >= 4) {
          alert("Maximum 4 photos per post!");
          break;
        }

        setIsUploadingMedia(true);
        setShowMediaInput(true);
        try {
          const base64data = await readFileAsDataURL(file);
          const blobInfo = await walrus.uploadBlob(base64data);
          newItems.push({
            blobId: blobInfo.blobId,
            type: 'image'
          });
          setMediaItems([...newItems]);
        } catch (err) {
          console.error("Failed uploading image:", err);
          alert("Error: Failed uploading image to Walrus.");
        } finally {
          setIsUploadingMedia(false);
        }
      }
    }
    
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && mediaItems.length === 0) return;

    const activeUser = authUser || currentUser;
    if (!activeUser) {
      alert('Please login first.');
      return;
    }

    setIsUploading(true);
    try {
      const postBlob = {
        version: 1,
        type: 'post',
        author_wallet: activeUser.walletAddress,
        created_at: Math.floor(Date.now() / 1000),
        content: {
          text: text,
          hashtags: extractHashtags(text),
          mentions: extractMentions(text)
        },
        media: mediaItems.map(item => ({
          type: item.type,
          blob_id: item.blobId.startsWith('walrus') ? item.blobId : `walrus://${item.blobId}`,
          mime: item.type === 'video' ? 'video/mp4' : 'image/png',
          width: 800,
          height: 600
        })),
        metadata: {
          language: 'en',
          client: 'blobcast-web'
        }
      };

      const walrusUploadInfo = await walrus.uploadBlob(postBlob);

      let suiObjectId: string | null = null;
      let blobHash = `sha256-${Math.random().toString(36).substring(2, 10)}`; // fallback

      // If wallet is connected, we attempt to register on-chain!
      if (account) {
        try {
          // Compute real SHA-256 hash of the content
          const hashBytes = await computeSha256(JSON.stringify(postBlob));
          blobHash = hashToHex(hashBytes);

          const tx = buildPublishPostTransaction(
            walrusUploadInfo.blobId,
            hashBytes,
            mediaItems.length > 0 ? 1 : 0,
            0, // visibility
            null, // replyToId
            null, // repostOfId
          );

          console.log('🔗 [Sui Transaction] Signing and executing transaction block to publish post on-chain...', tx);
          const result = await signAndExecuteTransaction({
            transaction: tx,
          });
          console.log('✅ [Sui Transaction] Post published successfully:', result);
          suiObjectId = parseCreatedObjectId(result) || result.digest;
        } catch (txErr) {
          console.warn('⚠️ [Sui Transaction] Failed signing and executing Sui transaction block:', txErr);
        }
      }

      onPostCreated({
        id: `post_${Date.now()}`,
        authorId: activeUser.id,
        suiObjectId: suiObjectId,
        walrusBlobId: walrusUploadInfo.blobId,
        blobHash: blobHash,
        contentType: mediaItems.length > 0 ? 1 : 0,
        visibility: 0,
        replyToId: null,
        repostOfId: null,
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        score: 0,
        createdAt: new Date(),
        walrusContent: postBlob,
      });

      setText('');
      setMediaItems([]);
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
    <div ref={composerContainerRef} className="glass-panel rounded-cyber-lg shadow-cyber-glow p-5 border border-sui-cyan/10">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Input box */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-full bg-linear-to-tr from-sui-cyan to-tatum-purple p-0.5 shrink-0">
            <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-xs font-bold text-sui-cyan relative">
              {finalAvatar ? (
                <img 
                  src={finalAvatar} 
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
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="What's happening? Type @mention, #hashtag, or $ticker..."
              className="w-full bg-transparent border-none outline-none resize-none min-h-22.5 text-soft-white placeholder-gray-500 text-sm font-sans"
              maxLength={280}
            />

            {/* Unified Autocomplete Dropdown */}
            <AutocompleteDropdown
              show={showDropdown}
              dropdownType={dropdownType}
              selectedIndex={selectedIndex}
              mentionSuggestions={mentionSuggestions}
              hashtagSuggestions={hashtagSuggestions}
              tickerSuggestions={tickerSuggestions}
              onSelectMention={insertMention}
              onSelectHashtag={insertHashtag}
              onSelectTicker={insertTicker}
            />
          </div>
        </div>

        {/* Dynamic media file selector & preview */}
        {showMediaInput && (
          <div className="border border-sui-cyan/15 rounded-cyber-md bg-walrus-blue/30 p-3 text-xs flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                ⚡ Walrus Storage Shard registry ({mediaItems.length} media)
              </span>
              {mediaItems.length > 0 && !isUploadingMedia && (
                <button 
                  type="button"
                  onClick={() => {
                    setMediaItems([]);
                    setShowMediaInput(false);
                  }}
                  className="text-[9px] font-mono text-rose-400 hover:text-white uppercase transition-colors"
                >
                  [Remove All]
                </button>
              )}
            </div>

            <div className={`grid gap-2 ${
              mediaItems.length === 1 ? 'grid-cols-1' :
              mediaItems.length === 2 ? 'grid-cols-2' :
              mediaItems.length === 3 ? 'grid-cols-3' :
              'grid-cols-2 grid-rows-2'
            }`}>
              {mediaItems.map((item, idx) => (
                <div key={item.blobId} className="relative group rounded-cyber-sm overflow-hidden border border-sui-cyan/20 bg-deep-space aspect-video flex items-center justify-center">
                  {item.type === 'image' ? (
                    <WalrusImage 
                      blobId={item.blobId} 
                      alt="Composer upload preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <VideoPreview blobId={item.blobId} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = mediaItems.filter((_, i) => i !== idx);
                      setMediaItems(updated);
                      if (updated.length === 0) setShowMediaInput(false);
                    }}
                    className="absolute top-1.5 right-1.5 bg-black/75 hover:bg-rose-600/90 text-white rounded-full p-1 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="Remove item"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {isUploadingMedia && (
                <div className="border border-sui-cyan/15 rounded-cyber-sm bg-walrus-blue/20 aspect-video flex flex-col items-center justify-center text-center p-3">
                  <Loader2 className="h-4 w-4 text-sui-cyan animate-spin mb-1" />
                  <span className="text-[9px] font-mono text-sui-cyan animate-pulse uppercase tracking-wider">
                    Uploading...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-sui-cyan/10" />

        {/* Footer controls */}
        <div className="flex items-center justify-between">
            <div className="relative flex items-center gap-1.5 font-mono">
            <input 
              type="file" 
              accept="image/*,video/*"
              multiple
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
              ref={emojiTriggerRef as any}
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all"
              title="Insert emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1 ml-2">
              <Globe className="h-3 w-3" /> Publicly Verifiable
            </span>

            {/** Emoji modal positioned above the trigger; use single component to handle outside clicks */}
            <EmojiModal visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} triggerRef={emojiTriggerRef as any} className="top-full left-0 mt-2 z-50 w-[320px]">
              <div className="rounded-cyber-lg border border-sui-cyan/20 bg-deep-space/95 shadow-cyber-glow overflow-hidden"
              style={{ width: `${320 * 0.7}px`, height: `${360 * 0.7}px` }}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.DARK}
                  emojiStyle={EmojiStyle.TWITTER}
                  width="320px"
                  height="360px"
                  searchPlaceHolder="Search emoji"
                  previewConfig={{ showPreview: false }}
                  style={{ transform: 'scale(0.7)', transformOrigin: 'top left' }}
                />
              </div>
            </EmojiModal>
          </div>

          <div className="flex items-center gap-3">
            {text.length > 200 && (
              <span className="text-xs font-mono text-gray-500">
                {280 - text.length}
              </span>
            )}
            
            <button
              type="submit"
              disabled={isUploading || (!text.trim() && mediaItems.length === 0)}
              className="px-5 py-2.5 rounded-cyber-md bg-linear-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-xs flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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

function VideoPreview({ blobId }: { blobId: string }) {
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
      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-black/40">
        <Loader2 className="h-5 w-5 text-sui-cyan animate-spin mb-1" />
        <span className="text-[9px] font-mono text-gray-500">Loading Video...</span>
      </div>
    );
  }

  return (
    <video 
      src={resolvedUrl} 
      controls 
      className="w-full h-full object-contain bg-black"
      playsInline
    />
  );
}
