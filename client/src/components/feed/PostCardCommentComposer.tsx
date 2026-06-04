'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Smile, Image, X } from 'lucide-react';
import EmojiPicker, { type EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import EmojiModal from '@/components/common/EmojiModal';
import { walrus, compressImageFile } from '@/lib/walrus';
import { useWalrusImage, WalrusImage } from '@/hooks/useWalrusImage';
import { api } from '@/lib/api';
import { mockDb } from '@/lib/db';
import { useTextAutocomplete } from '@/hooks/useTextAutocomplete';
import { AutocompleteDropdown } from '@/components/feed/AutocompleteDropdown';

interface PostCardCommentComposerProps {
  showComments: boolean;
  hideCommentComposer: boolean;
  newCommentText: string;
  setNewCommentText: (text: string) => void;
  isPostingComment: boolean;
  handleCommentSubmit: (e: React.FormEvent, commentMediaItems?: any[]) => void;
}

export function PostCardCommentComposer({
  showComments,
  hideCommentComposer,
  newCommentText,
  setNewCommentText,
  isPostingComment,
  handleCommentSubmit
}: PostCardCommentComposerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaItems, setMediaItems] = useState<{ blobId: string; type: 'image'|'video' }[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Reset media items when composer is closed
  useEffect(() => {
    if (!showComments) {
      setMediaItems([]);
      setShowMediaInput(false);
    }
  }, [showComments]);

  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch users for autocomplete
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

  // Sync internal text → external newCommentText prop on every keystroke
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextChange(e);
    setNewCommentText(e.target.value);
  };

  // Keep internal text in sync if parent resets it
  useEffect(() => {
    if (newCommentText === '' && text !== '') {
      setText('');
    }
  }, [newCommentText]);

  // Sync text → parent whenever it changes (covers autocomplete insertions too)
  useEffect(() => {
    setNewCommentText(text);
  }, [text]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [closeDropdown]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const newText = `${text}${emojiData.emoji}`;
    setText(newText);
    setNewCommentText(newText);
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
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = [...mediaItems];

    for (const file of files) {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');

      if (!isImg && !isVid) {
        alert('Hanya file gambar atau video yang didukung.');
        continue;
      }

      if (isVid) {
        if (newItems.length > 0) {
          alert('Cannot combine photos and videos in one comment!');
          break;
        }

        const duration = await getVideoDuration(file);
        if (duration > 30) {
          alert('Durasi video melebihi batas maksimal 30 detik!');
          break;
        }

        setIsUploadingMedia(true);
        setShowMediaInput(true);
        try {
          const base64data = await readFileAsDataURL(file);
          const blobInfo = await walrus.uploadBlob(base64data);
          newItems.push({ blobId: blobInfo.blobId, type: 'video' });
          setMediaItems([...newItems]);
        } catch (err) {
          console.error('Failed uploading video:', err);
          alert('Error: Gagal mengunggah video ke Walrus.');
        } finally {
          setIsUploadingMedia(false);
        }
        break;
      }

      if (isImg) {
        if (newItems.some(i => i.type === 'video')) {
          alert('Tidak dapat menggabungkan foto dan video dalam satu comment!');
          break;
        }
        const imageCount = newItems.filter(i => i.type === 'image').length;
        if (imageCount >= 4) {
          alert('Maximum 4 photos per comment!');
          break;
        }

        setIsUploadingMedia(true);
        setShowMediaInput(true);
        try {
          const base64data = await compressImageFile(file);
          const blobInfo = await walrus.uploadBlob(base64data);
          newItems.push({ blobId: blobInfo.blobId, type: 'image' });
          setMediaItems([...newItems]);
        } catch (err) {
          console.error('Failed uploading image:', err);
          alert('Error: Failed uploading image to Walrus.');
        } finally {
          setIsUploadingMedia(false);
        }
      }
    }

    e.target.value = '';
  };

  if (hideCommentComposer || !showComments) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 border-t border-sui-cyan/10 pt-4"
      onClick={(e) => e.stopPropagation()}
    >
      <form onSubmit={(e) => handleCommentSubmit(e, mediaItems)} className="flex flex-col gap-2 mt-1 relative">
        {/* Textarea with autocomplete */}
        <div ref={containerRef} className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Reply... (@mention, #hashtag, $ticker)"
            className="w-full bg-walrus-blue/30 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2 text-xs text-soft-white outline-none focus:border-sui-cyan/50 font-sans resize-none min-h-[38px]"
            maxLength={140}
            required
            disabled={isPostingComment}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />

          {/* Autocomplete Dropdown */}
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

        {/* Dynamic media file selector & preview */}
        {showMediaInput && (mediaItems.length > 0 || isUploadingMedia) && (
          <div className="border border-sui-cyan/15 rounded-cyber-md bg-walrus-blue/30 p-2.5 text-xs flex flex-col gap-1.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                ⚡ Walrus Storage Shard ({mediaItems.length} media)
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

            <div className="flex flex-wrap gap-2">
              {mediaItems.map((item, idx) => (
                <div key={item.blobId} className="relative group rounded-cyber-sm overflow-hidden border border-sui-cyan/20 bg-deep-space w-24 h-16 flex items-center justify-center">
                  {item.type === 'image' ? (
                    <WalrusImage 
                      blobId={item.blobId} 
                      alt="Comment upload preview" 
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
                    className="absolute top-1 right-1 bg-black/75 hover:bg-rose-600/90 text-white rounded-full p-0.5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="Remove item"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {isUploadingMedia && (
                <div className="border border-sui-cyan/15 rounded-cyber-sm bg-walrus-blue/20 w-24 h-16 flex flex-col items-center justify-center text-center p-1">
                  <Loader2 className="h-3.5 w-3.5 text-sui-cyan animate-spin mb-0.5" />
                  <span className="text-[8px] font-mono text-sui-cyan animate-pulse uppercase tracking-wider">
                    Uploading...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <button
              ref={emojiTriggerRef}
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="p-1.5 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all"
              title="Insert emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              id="comment-media-file-input"
              className="hidden"
              onChange={handleMediaUpload}
            />
            <label htmlFor="comment-media-file-input" className="p-1.5 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all cursor-pointer" title="Upload media">
              <Image className="h-4 w-4" />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPostingComment || (!text.trim() && mediaItems.length === 0)}
            className="px-4 py-2 rounded-cyber-sm bg-linear-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
          >
            {isPostingComment ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Replying...</span>
              </>
            ) : (
              'Reply'
            )}
          </button>
        </div>

        <EmojiModal visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} triggerRef={emojiTriggerRef as any} className="bottom-full mb-2 z-50">
          <div
            className="rounded-cyber-lg border border-sui-cyan/20 bg-deep-space/95 shadow-cyber-glow overflow-hidden"
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
      </form>
    </motion.div>
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
        <Loader2 className="h-4 w-4 text-sui-cyan animate-spin mb-0.5" />
        <span className="text-[8px] font-mono text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <video 
      src={resolvedUrl} 
      className="w-full h-full object-contain bg-black"
      playsInline
      muted
    />
  );
}
