'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { ArrowLeft, Loader2, Terminal, ShieldCheck, Database, MessageSquare, Image, Smile } from 'lucide-react';
import EmojiPicker, { Theme, type EmojiClickData, EmojiStyle } from 'emoji-picker-react';
import EmojiModal from '@/components/common/EmojiModal';
import Link from 'next/link';
import { Sidebar } from '@/components/feed/Sidebar';
import { TrendingWidget } from '@/components/feed/TrendingWidget';
import { PostCard } from '@/components/feed/PostCard';
import { useWalrusImage, WalrusImage } from '@/hooks/useWalrusImage';
import { useTextAutocomplete } from '@/hooks/useTextAutocomplete';
import { AutocompleteDropdown } from '@/components/feed/AutocompleteDropdown';

function CommentComposerAvatar({ authUser }: { authUser: any }) {
  const imageUrl = useWalrusImage(authUser?.avatarBlobId);
  const finalUrl = imageUrl || (authUser?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${authUser.username}` : '');
  if (!finalUrl) return null;
  return <img src={finalUrl} alt="My avatar" className="h-full w-full object-cover z-10" />;
}

function CommentAuthorAvatar({ author }: { author: any }) {
  const imageUrl = useWalrusImage(author?.avatarBlobId);
  const finalUrl = imageUrl || (author?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${author.username}` : '');
  if (!finalUrl) return null;
  return <img src={finalUrl} alt="Author avatar" className="h-full w-full object-cover z-10" />;
}
import { api } from '@/lib/api';
import { walrus } from '@/lib/walrus';
import { mockDb } from '@/lib/db';
import { useAuth } from '@/components/providers/AuthProvider';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PostDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user: authUser } = useAuth();
  const [post, setPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaItems, setMediaItems] = useState<{ blobId: string; type: 'image'|'video' }[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);
  const composerContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    text: commentText,
    setText: setCommentText,
    textareaRef: commentTextareaRef,
    showDropdown,
    dropdownType,
    selectedIndex,
    mentionSuggestions,
    hashtagSuggestions,
    tickerSuggestions,
    handleTextChange: handleCommentTextChange,
    handleKeyDown: handleCommentKeyDown,
    insertMention,
    insertHashtag,
    insertTicker,
    closeDropdown,
  } = useTextAutocomplete({ users: allUsers });

  // Keep newCommentText in sync with the autocomplete hook text
  useEffect(() => { setNewCommentText(commentText); }, [commentText]);
  // If parent resets to empty, reset hook too
  useEffect(() => { if (newCommentText === '' && commentText !== '') setCommentText(''); }, [newCommentText]);

  // Fetch users for @mention autocomplete
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

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (composerContainerRef.current && !composerContainerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeDropdown]);

  const loadPostAndComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.fetchPostById(id);
      if (response && response.data && response.data.post) {
        const p = response.data.post;

        let text = 'Immutable social post stored on Walrus.';
        let hashtags: string[] = [];
        let mediaUrl: string | undefined = undefined;
        let media: any[] = [];

        if (p.walrusBlobId) {
          try {
            const content = await walrus.getBlob(p.walrusBlobId);
            if (content && typeof content === 'object') {
              const contentObj = content as any;
              
              // Support nested content.text or flat text
              if (contentObj.content?.text) {
                text = contentObj.content.text;
              } else if (contentObj.text) {
                text = contentObj.text;
              } else if (contentObj.content && typeof contentObj.content === 'string') {
                text = contentObj.content;
              }

              // Support nested or flat hashtags
              if (contentObj.content?.hashtags) {
                hashtags = contentObj.content.hashtags;
              } else if (contentObj.hashtags) {
                hashtags = contentObj.hashtags;
              }

              // Support nested or flat media attachments
              const mediaList = contentObj.media || contentObj.content?.media || [];
              if (mediaList && mediaList.length > 0) {
                media = mediaList;
                mediaUrl = mediaList[0].blob_id || mediaList[0].blobUrl || mediaList[0].url;
              }
            } else if (typeof content === 'string' && content.length > 0) {
              text = content;
            }
          } catch (err) {
            console.warn("⚠️ Failed to load Walrus payload:", err);
          }
        }

        const mappedPost = {
          id: p.id,
          author: {
            displayName: p.author?.displayName || 'Anonymous Caster',
            username: p.author?.username || 'anonymous',
            walletAddress: p.author?.walletAddress || '0x000000...',
            avatarBlobId: p.author?.avatarBlobId || '',
            verified: p.author?.verified || false
          },
          walrusBlobId: p.walrusBlobId,
          blobHash: p.blobHash,
          contentType: p.contentType,
          text: text,
          hashtags: hashtags,
          mediaUrl: mediaUrl,
          media: media,
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

        const rawComments = p.comments || [];
        const mappedComments = await Promise.all(rawComments.map(async (c: any) => {
          let commentText = 'Verifiable sub-blob commentary published on Walrus.';
          if (c.walrusBlobId) {
            try {
              const content = await walrus.getBlob(c.walrusBlobId);
              if (content && typeof content === 'object') {
                const contentObj = content as any;
                if (contentObj.content?.text) {
                  commentText = contentObj.content.text;
                }
              }
            } catch (err) {
              console.warn(`⚠️ Failed to resolve Walrus comment content for ${c.walrusBlobId}:`, err);
            }
          }
          return {
            id: c.id,
            postId: c.postId,
            authorId: c.authorId,
            walrusBlobId: c.walrusBlobId,
            createdAt: c.createdAt,
            author: c.author,
            text: commentText
          };
        }));

        setPost(mappedPost);
        setComments(mappedComments);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("⚠️ API server offline. Falling back to offline database cache.", err);
    }

    // Offline DB fallback
    const offlinePost = mockDb.posts.find(p => p.id === id);
    if (offlinePost) {
      const author = mockDb.users.find(u => u.id === offlinePost.authorId) || {
        displayName: 'Yuriya',
        username: 'yuriya',
        walletAddress: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
        avatarBlobId: 'walrus://yuriya-avatar',
        verified: true
      };

      setPost({
        id: offlinePost.id,
        author: {
          displayName: author.displayName,
          username: author.username,
          walletAddress: author.walletAddress,
          avatarBlobId: author.avatarBlobId,
          verified: author.verified
        },
        walrusBlobId: offlinePost.walrusBlobId,
        blobHash: offlinePost.blobHash,
        contentType: offlinePost.contentType,
        text: offlinePost.id === 'post-1'
          ? 'Welcome to BlobCast! Own your social posts forever. Text and media are packaged in a single JSON schema and stored permanently on Walrus. Verify it on-chain!'
          : 'Excited about decentralized social layers! Decentralization means true resilience. Check this out: even if our centralized server is powered down, this content remains accessible directly from the Walrus storage aggregator grid!',
        hashtags: ['decentralized', 'walrus'],
        mediaUrl: offlinePost.id === 'post-2' ? 'walrus://blob-post-2-image' : undefined,
        media: offlinePost.walrusContent?.media || (offlinePost.id === 'post-2' ? [{ type: 'image', blob_id: 'walrus://blob-post-2-image' }] : []),
        walrusContent: offlinePost.walrusContent,
        likeCount: offlinePost.likeCount,
        commentCount: offlinePost.commentCount,
        repostCount: offlinePost.repostCount,
        createdAt: offlinePost.createdAt
      });

      // Load offline comments
      const existingComments = mockDb.comments.filter(c => c.postId === id);
      const mappedComments = existingComments.map(c => {
        const u = mockDb.users.find(user => user.id === c.authorId) || {
          displayName: 'Vitalik Buterin',
          username: 'vitalik',
          avatarBlobId: 'walrus://vitalik-avatar'
        };
        return {
          id: c.id,
          author: u,
          text: (c.walrusBlobId || '').startsWith('walrus://blob-comment-')
            ? 'Excellent point! Storing this commentary permanently on Walrus as well.'
            : 'Verifiable sub-blob published on Walrus.',
          createdAt: c.createdAt
        };
      });

      setComments(mappedComments);
      setIsLoading(false);
    } else {
      setError("Verifiable Cast Details not found in the decentralized registry.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPostAndComments();
  }, [id]);
  

  const handleCommentSubmit = async (e: React.FormEvent, commentMediaItems: { blobId: string; type: 'image'|'video' }[] = []) => {
    e.preventDefault();
    if (!commentText.trim() && commentMediaItems.length === 0) return;
    if (!authUser) {
      alert('Please login first.');
      return;
    }

    setIsPostingComment(true);
    try {
      const commentBlob: any = {
        version: 1,
        type: 'comment',
        post_id: id,
        author_wallet: authUser.walletAddress,
        created_at: Math.floor(Date.now() / 1000),
        content: {
          text: commentText
        }
      };

      if (commentMediaItems.length > 0) {
        commentBlob.media = commentMediaItems.map(item => ({
          type: item.type,
          blob_id: item.blobId.startsWith('walrus') ? item.blobId : `walrus://${item.blobId}`,
          mime: item.type === 'video' ? 'video/mp4' : 'image/png',
          width: 800,
          height: 600
        }));
      }

      const walrusUploadInfo = await walrus.uploadBlob(commentBlob);
      const authorId = authUser.id; // Default Caster (Yuriya)

      try {
        const extractMentions = (str: string): string[] => {
          const matches = str.match(/@\w+/g);
          return matches ? matches.map(m => m.replace('@', '').toLowerCase()) : [];
        };

        const response = await api.createComment(id, authorId, walrusUploadInfo.blobId, extractMentions(commentText));
        if (response && response.data && response.data.comment) {
          await loadPostAndComments();
          setCommentText('');
          return;
        }
      } catch (apiErr) {
        console.warn("⚠️ API offline. Comment falling back to local cache.", apiErr);
      }

      // Offline DB fallback
      mockDb.comments.push({
        id: `comment_${Date.now()}`,
        postId: id,
        authorId: authUser.id,
        walrusBlobId: walrusUploadInfo.blobId,
        createdAt: new Date()
      });

      await loadPostAndComments();
      setCommentText('');

    } catch (err) {
      console.error("❌ Failed to upload comment to Walrus:", err);
      alert("Error: Could not publish comment blob to Walrus.");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setCommentText((prev) => `${prev}${emojiData.emoji}`);
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

  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto h-screen overflow-hidden">
      
      {/* Left Sidebar navigation column */}
      <aside className="w-64 flex-shrink-0 hidden md:block h-screen">
        <Sidebar />
      </aside>

      {/* Center detailed feed timeline layout */}
      <main className="flex-1 border-r border-sui-cyan/5 flex flex-col h-screen overflow-y-auto scrollbar-cyber">
          
          {/* Header navigation bar */}
          <header className="sticky top-0 z-30 glass-panel border-b border-sui-cyan/5 px-6 py-4 flex items-center gap-4">
            <Link 
              href="/feed"
              className="p-2 rounded-cyber-sm border border-sui-cyan/15 hover:border-sui-cyan/40 hover:bg-sui-cyan/10 transition-all text-sui-cyan flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex flex-col">
              <h1 className="font-mono font-bold text-sm tracking-wider uppercase text-white text-neon-glow">
                Cast Thread
              </h1>
              <span className="text-[9px] font-mono text-gray-500 uppercase mt-0.5">
                Decentralized on-chain verified commentary index
              </span>
            </div>
          </header>

          <div className="p-6 flex flex-col gap-6">
            {isLoading ? (
              <div className="flex flex-col gap-3 items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-sui-cyan animate-spin" />
                <span className="font-mono text-xs text-sui-cyan animate-pulse uppercase tracking-widest">
                  Querying Shard Registry...
                </span>
              </div>
            ) : error ? (
              <div className="glass-panel border border-rose-500/15 rounded-cyber-lg p-8 flex flex-col items-center justify-center text-center gap-3">
                <Terminal className="h-12 w-12 text-rose-500 animate-pulse" />
                <h3 className="font-mono font-bold text-soft-white uppercase">Registry Sync Error</h3>
                <p className="text-xs text-gray-400 max-w-md">{error}</p>
                <Link href="/feed" className="mt-4 px-4 py-2 border border-sui-cyan/20 hover:border-sui-cyan/50 text-xs font-mono rounded-cyber-sm text-sui-cyan uppercase transition-all">
                  Back to Feed
                </Link>
              </div>
            ) : (
              <>
                {/* Parent social cast rendering */}
                {post && (
                  <PostCard post={{ ...post, commentCount: comments.length }} hideCommentComposer={true} />
                )}

                {/* Premium Cyberpunk Comment Composer */}
                <div className="glass-panel rounded-cyber-lg p-5 border border-sui-cyan/10 bg-walrus-blue/10 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-sui-cyan/2 to-tatum-purple/2 pointer-events-none" />
                  <div className="flex gap-4 relative z-10">
                    {/* User Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
                      <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-bold text-xs font-mono text-sui-cyan relative">
                        <CommentComposerAvatar authUser={authUser} />
                        <span className="text-neon-glow absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 select-none pointer-events-none font-mono">
                          {(authUser?.displayName || authUser?.username || 'YU').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Composer Input Area */}
                    <form onSubmit={handleCommentSubmit} className="flex-1 flex flex-col gap-3">
                      <div ref={composerContainerRef} className="relative">
                        <textarea
                          id="detail-comment-textarea"
                          ref={commentTextareaRef}
                          value={commentText}
                          onChange={handleCommentTextChange}
                          onKeyDown={handleCommentKeyDown}
                          placeholder="Reply... (@mention, #hashtag, $ticker)"
                          className="w-full bg-deep-space/40 border border-sui-cyan/15 rounded-cyber-md px-4 py-3 text-xs text-soft-white outline-none focus:border-sui-cyan/50 focus:ring-1 focus:ring-sui-cyan/30 font-sans resize-none min-h-[70px] placeholder-gray-500 transition-all duration-300"
                          maxLength={280}
                          required
                          disabled={isPostingComment}
                        />
                        <div className="absolute bottom-2.5 right-3 text-[9px] font-mono text-gray-500">
                          {commentText.length}/280
                        </div>

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

                      <div className="flex items-center justify-between">
                        {/* Shard verification status indicator */}
                        <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-400">
                            <Database className="h-3.5 w-3.5 text-sui-cyan" />
                            <span>Walrus JSON-LD commentary schema</span>
                          </div>

                          <div className="flex items-center gap-2 relative">
                            <input
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              id="detail-comment-media-input"
                              className="hidden"
                              onChange={handleMediaUpload}
                            />
                            <label htmlFor="detail-comment-media-input" className="p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all cursor-pointer" title="Upload media">
                              <Image className="h-4 w-4" />
                            </label>

                            <button
                              ref={emojiTriggerRef}
                              type="button"
                              onClick={() => setShowEmojiPicker((p) => !p)}
                              className="p-2 rounded-cyber-sm text-gray-400 hover:text-sui-cyan hover:bg-sui-cyan/10 transition-all"
                              title="Insert emoji"
                            >
                              <Smile className="h-4 w-4" />
                            </button>

                            <EmojiModal visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} triggerRef={emojiTriggerRef as any} className="bottom-full mb-2 z-50">
                              <div
                                className="rounded-cyber-lg border border-sui-cyan/20 bg-deep-space/95 shadow-cyber-glow"
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

                            <button
                              type="submit"
                              disabled={isPostingComment || (!commentText.trim() && mediaItems.length === 0)}
                              className="px-5 py-2.5 rounded-cyber-sm bg-gradient-to-r from-sui-cyan to-tatum-purple text-deep-space font-extrabold font-mono text-xs hover:opacity-95 hover:shadow-cyber-glow active:scale-[0.97] transition-all disabled:opacity-30 flex items-center gap-2 cursor-pointer"
                            >
                              {isPostingComment ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Casting...</span>
                                </>
                              ) : (
                                <>
                                  <span>Verify & Cast</span>
                                </>
                              )}
                            </button>
                          </div>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Subtitle comment count index */}
                <div className="flex items-center gap-2 border-b border-sui-cyan/5 pb-2 mt-2">
                  <MessageSquare className="h-4 w-4 text-sui-cyan" />
                  <span className="font-mono text-xs text-sui-cyan uppercase tracking-wider font-bold">
                    Comments List ({comments.length})
                  </span>
                </div>

                {/* Comments thread list */}
                <div className="flex flex-col gap-4">
                  {comments.length === 0 ? (
                    <div className="glass-panel border border-sui-cyan/5 rounded-cyber-md p-6 text-center text-xs text-gray-500 font-mono">
                      No verified commentary blobs found on this post. Be the first to reply!
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="glass-panel rounded-cyber-md p-4 border border-sui-cyan/5 flex gap-3.5 hover:border-sui-cyan/15 transition-all">
                        {/* Comment author avatar */}
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sui-cyan to-tatum-purple p-0.5 flex-shrink-0">
                          <div className="h-full w-full rounded-full bg-walrus-blue overflow-hidden flex items-center justify-center font-mono text-xs font-bold text-sui-cyan relative">
                            <CommentAuthorAvatar author={comment.author} />
                            <span className="absolute inset-0 flex items-center justify-center bg-walrus-blue z-0 text-neon-glow font-mono text-[10px]">
                              {(comment.author?.displayName || comment.author?.username || 'AN').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Comment content body */}
                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                              <span className="font-bold text-gray-200">{comment.author?.displayName || 'Anonymous Caster'}</span>
                              <span>@{comment.author?.username || 'anonymous'}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-600">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="text-gray-200 font-sans text-xs leading-relaxed mt-1">
                            {comment.text}
                          </p>

                          {/* Cryptographic sub-verification info indicator */}
                          {comment.walrusBlobId && (
                            <div className="flex items-center gap-1.5 mt-2 bg-walrus-blue/30 border border-sui-cyan/5 rounded p-1.5 font-mono text-[8px] text-gray-500 w-fit">
                              <ShieldCheck className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400/90 font-bold uppercase">Verified Sub-Blob:</span>
                              <span className="text-gray-400 font-semibold truncate w-36" title={comment.walrusBlobId}>
                                {comment.walrusBlobId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

        </main>

      {/* Right Trending column */}
      <aside className="w-80 flex-shrink-0 hidden lg:block h-screen overflow-y-auto scrollbar-cyber">
        <TrendingWidget />
      </aside>

    </div>
  );
}
