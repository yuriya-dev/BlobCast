'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Smile, Image } from 'lucide-react';
import EmojiPicker, { type EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import EmojiModal from '@/components/common/EmojiModal';
import { walrus } from '@/lib/walrus';

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

  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewCommentText(`${newCommentText}${emojiData.emoji}`);
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
          const base64data = await readFileAsDataURL(file);
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
      <form onSubmit={(e) => handleCommentSubmit(e, mediaItems)} className="relative flex gap-3 items-center mt-1">
        <input 
          type="text"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Verify dynamic comment on Walrus nodes..."
          className="flex-1 bg-walrus-blue/30 border border-sui-cyan/15 rounded-cyber-sm px-3.5 py-2 text-xs text-soft-white outline-none focus:border-sui-cyan/50 font-sans"
          maxLength={140}
          required
          disabled={isPostingComment}
        />
        <button
          ref={emojiTriggerRef}
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all"
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
        <label htmlFor="comment-media-file-input" className="p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all cursor-pointer" title="Upload media">
          <Image className="h-4 w-4" />
        </label>
        <button
          type="submit"
          disabled={isPostingComment || (!newCommentText.trim() && mediaItems.length === 0)}
          className="px-4 py-2 rounded-cyber-sm bg-linear-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
        >
          {isPostingComment ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            'Reply'
          )}
        </button>

        <EmojiModal visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} triggerRef={emojiTriggerRef as any} className="bottom-full left-[63.5%] mb-2 z-50">
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

        {showMediaInput && mediaItems.length > 0 ? (
          <div className="absolute left-0 bottom-20 z-10 w-[280px] p-2 rounded-cyber-md bg-walrus-blue/30 border border-sui-cyan/10">
            <div className="flex gap-2">
              {mediaItems.map((m, i) => (
                <div key={m.blobId} className="w-16 h-10 bg-black/30 rounded-cyber-sm overflow-hidden flex items-center justify-center text-[10px] font-mono">
                  {m.type === 'image' ? '🖼️' : '🎥'}
                </div>
              ))}
              {isUploadingMedia && <Loader2 className="h-4 w-4 animate-spin text-sui-cyan" />}
            </div>
          </div>
        ) : null}
      </form>
    </motion.div>
  );
}
