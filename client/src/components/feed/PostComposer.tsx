'use client';

import React, { useState } from 'react';
import { Image, Send, Link, Smile, Globe, Loader2, Sparkles } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { walrus } from '@/lib/walrus';

interface PostComposerProps {
  onPostCreated: (newPost: any) => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const account = useCurrentAccount();
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(false);

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
            <div className="h-full w-full rounded-full bg-walrus-blue flex items-center justify-center font-mono text-xs font-bold text-sui-cyan">
              BC
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

        {/* Dynamic media URL preview/input */}
        {showMediaInput && (
          <div className="border border-sui-cyan/20 rounded-cyber-md bg-walrus-blue/30 px-3 py-2 text-xs flex items-center gap-2">
            <Link className="h-3.5 w-3.5 text-sui-cyan" />
            <input 
              type="text" 
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Paste image/media URL or Walrus blob link..." 
              className="bg-transparent border-none outline-none text-soft-white w-full font-mono"
            />
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-sui-cyan/10" />

        {/* Footer controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => setShowMediaInput(!showMediaInput)}
              className={`p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all ${showMediaInput ? 'text-sui-cyan bg-sui-cyan/5' : ''}`}
              title="Add media"
            >
              <Image className="h-4 w-4" />
            </button>
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
