'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PostCardCommentComposerProps {
  showComments: boolean;
  hideCommentComposer: boolean;
  newCommentText: string;
  setNewCommentText: (text: string) => void;
  isPostingComment: boolean;
  handleCommentSubmit: (e: React.FormEvent) => void;
}

export function PostCardCommentComposer({
  showComments,
  hideCommentComposer,
  newCommentText,
  setNewCommentText,
  isPostingComment,
  handleCommentSubmit
}: PostCardCommentComposerProps) {
  if (hideCommentComposer || !showComments) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-4 border-t border-sui-cyan/10 pt-4"
      onClick={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleCommentSubmit} className="flex gap-3 items-center mt-1">
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
          type="submit"
          disabled={isPostingComment || !newCommentText.trim()}
          className="px-4 py-2 rounded-cyber-sm bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-semibold font-mono text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
        >
          {isPostingComment ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            'Reply'
          )}
        </button>
      </form>
    </motion.div>
  );
}
