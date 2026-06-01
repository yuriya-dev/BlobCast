import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { cache } from '../lib/redis';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import {
    MODERATION_STATUS,
    runContentModeration,
    visibleCommentWhere,
    visiblePostWhere,
} from '../lib/moderation';

const withTimeout = <T>(promise: Promise<T>, ms = 1500, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
};

/**
 * Controller to fetch all posts / timeline feed from Supabase with pagination support.
 */
export const getAllPosts = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
        where: visiblePostWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
            author: true,
            media: true,
            likes: {
                include: {
                    user: true
                }
            },
            reposts: {
                include: {
                    author: true
                }
            },
            repostOf: {
                include: {
                    author: true,
                    likes: {
                        include: {
                            user: true
                        }
                    },
                    reposts: {
                        include: {
                            author: true
                        }
                    }
                }
            }
        }
    });

    const totalPosts = await prisma.post.count({ where: visiblePostWhere });

    res.status(200).json({
        status: 'success',
        results: posts.length,
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts
        },
        data: { posts }
    });
});

/**
 * Controller to fetch a specific post by its ID.
 */
export const getPostById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new AppError('Post ID parameter is required', 400);
    }

    const post = await prisma.post.findUnique({
        where: { id },
        include: {
            author: true,
            media: true,
            comments: {
                where: visibleCommentWhere,
                include: { author: true },
                orderBy: { createdAt: 'asc' }
            },
            likes: {
                include: {
                    user: true
                }
            },
            reposts: {
                include: {
                    author: true
                }
            },
            repostOf: {
                include: {
                    author: true,
                    likes: {
                        include: {
                            user: true
                        }
                    },
                    reposts: {
                        include: {
                            author: true
                        }
                    }
                }
            }
        }
    });

    if (!post) {
        throw new AppError('Post registry not found in database', 404);
    }

    res.status(200).json({
        status: 'success',
        data: { post }
    });
});

/**
 * Controller to create a new permanent post reference object inside Supabase.
 */
export const createPost = asyncHandler(async (req: Request, res: Response) => {
    const { authorId, suiObjectId, walrusBlobId, blobHash, contentType, visibility, mentions, contentText } = req.body;
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to create posts', 401);
    }

    if (authorId && authorId !== sessionUser.id) {
        throw new AppError('Post author must match the authenticated user', 403);
    }

    if (!walrusBlobId || !blobHash) {
        throw new AppError('Walrus Blob ID and Hash parameters are required to register post', 400);
    }

    // Verify if the author profile exists
    const author = await prisma.user.findUnique({
        where: { id: sessionUser.id }
    });

    if (!author) {
        throw new AppError('Specified author profile does not exist', 404);
    }

    const moderation = await runContentModeration({ contentText, walrusBlobId });

    const post = await prisma.post.create({
        data: {
            authorId: sessionUser.id,
            suiObjectId: suiObjectId || null,
            walrusBlobId,
            blobHash,
            contentType: parseInt(contentType, 10) || 0,
            visibility: parseInt(visibility, 10) || 0,
            score: 0,
            moderationStatus: moderation.status,
            moderationReason: moderation.reason === 'none' ? null : moderation.reason,
        },
        include: {
            author: true
        }
    });

    // Create Mention Notifications
    if (
        moderation.status === MODERATION_STATUS.VISIBLE &&
        mentions &&
        Array.isArray(mentions) &&
        mentions.length > 0
    ) {
        try {
            for (const username of mentions) {
                const trimmedUsername = username.replace(/^@/, '').trim();
                if (!trimmedUsername) continue;

                const mentionedUser = await prisma.user.findUnique({
                    where: { username: trimmedUsername }
                });

                if (mentionedUser && mentionedUser.id !== sessionUser.id) {
                    await prisma.notification.create({
                        data: {
                            userId: mentionedUser.id,
                            actorId: sessionUser.id,
                            type: 'mention',
                            postId: post.id
                        }
                    });
                }
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to generate mention notifications:', notifErr);
        }
    }

    res.status(201).json({
        status: 'success',
        message:
            moderation.status === MODERATION_STATUS.HIDDEN
                ? 'Post stored on Walrus but hidden from the BlobCast feed due to content guidelines.'
                : 'Post reference registered verifiably in Supabase database',
        data: { post, moderation }
    });
});

/**
 * Controller to fetch the latest indexer telemetry notifications from Redis cache.
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const rawNotif = await cache.get('notifications:latest');
    const notifications = rawNotif ? [JSON.parse(rawNotif)] : [];

    res.status(200).json({
        status: 'success',
        data: { notifications }
    });
});

/**
 * Controller to toggle a like on a post.
 * If user has already liked, remove like and decrement count.
 * Otherwise, add like and increment count.
 */
export const likePost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Post ID
    const { userId } = req.body;
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to like posts', 401);
    }

    if (userId && userId !== sessionUser.id) {
        throw new AppError('Like author must match the authenticated user', 403);
    }

    if (!id) {
        throw new AppError('Post ID is required to like', 400);
    }

    const resolvedUserId = sessionUser.id;

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new AppError('Post not found', 404);

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: resolvedUserId } });
    if (!user) throw new AppError('User profile not found', 404);

    // Check if user already liked this post
    const existingLike = await prisma.like.findUnique({
        where: {
            userId_postId: { userId: resolvedUserId, postId: id }
        }
    });

    let liked = false;
    if (existingLike) {
        // Remove like
        await prisma.like.delete({
            where: {
                userId_postId: { userId: resolvedUserId, postId: id }
            }
        });
        // Decrement post like_count
        await prisma.post.update({
            where: { id },
            data: { likeCount: { decrement: 1 } }
        });
    } else {
        // Add like
        await prisma.like.create({
            data: { userId: resolvedUserId, postId: id }
        });
        // Increment post like_count
        await prisma.post.update({
            where: { id },
            data: { likeCount: { increment: 1 } }
        });
        liked = true;

        // Create Like Notification
        if (post.authorId !== resolvedUserId) {
            try {
                await prisma.notification.create({
                    data: {
                        userId: post.authorId,
                        actorId: resolvedUserId,
                        type: 'like',
                        postId: id
                    }
                });
            } catch (notifErr) {
                console.error('⚠️ Failed to create like notification:', notifErr);
            }
        }
    }

    const updatedPost = await prisma.post.findUnique({ where: { id } });

    res.status(200).json({
        status: 'success',
        liked,
        data: { likeCount: updatedPost?.likeCount || 0 }
    });
});

/**
 * Controller to register a comment on a post.
 */
export const createComment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Post ID
    const { authorId, walrusBlobId, mentions, contentText } = req.body;
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to comment', 401);
    }

    if (authorId && authorId !== sessionUser.id) {
        throw new AppError('Comment author must match the authenticated user', 403);
    }

    if (!id || !walrusBlobId) {
        throw new AppError('Post ID and Walrus Blob ID are required to comment', 400);
    }

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new AppError('Post not found', 404);
    if (post.moderationStatus !== MODERATION_STATUS.VISIBLE) {
        throw new AppError('Cannot comment on hidden content', 403);
    }

    // Verify author exists
    const author = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!author) throw new AppError('Author profile not found', 404);

    const moderation = await runContentModeration({ contentText, walrusBlobId });

    // Create Comment in database
    const comment = await prisma.comment.create({
        data: {
            postId: id,
            authorId: sessionUser.id,
            walrusBlobId,
            moderationStatus: moderation.status,
            moderationReason: moderation.reason === 'none' ? null : moderation.reason,
        },
        include: {
            author: true
        }
    });

    // Increment post commentCount only for visible comments
    if (moderation.status === MODERATION_STATUS.VISIBLE) {
        await prisma.post.update({
            where: { id },
            data: { commentCount: { increment: 1 } }
        });
    }

    // Create Mention Notifications
    if (
        moderation.status === MODERATION_STATUS.VISIBLE &&
        mentions &&
        Array.isArray(mentions) &&
        mentions.length > 0
    ) {
        try {
            for (const username of mentions) {
                const trimmedUsername = username.replace(/^@/, '').trim();
                if (!trimmedUsername) continue;

                const mentionedUser = await prisma.user.findUnique({
                    where: { username: trimmedUsername }
                });

                if (mentionedUser && mentionedUser.id !== sessionUser.id) {
                    await prisma.notification.create({
                        data: {
                            userId: mentionedUser.id,
                            actorId: sessionUser.id,
                            type: 'mention',
                            postId: id
                        }
                    });
                }
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to generate comment mention notifications:', notifErr);
        }
    }

    res.status(201).json({
        status: 'success',
        message:
            moderation.status === MODERATION_STATUS.HIDDEN
                ? 'Comment stored on Walrus but hidden from the BlobCast feed due to content guidelines.'
                : 'Comment registered successfully in Supabase database',
        data: { comment, moderation }
    });
});

/**
 * Controller to repost a post.
 * Acts as a toggle to prevent multiple duplicates and copy posts.
 */
export const repostPost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Original Post ID
    const { authorId } = req.body;
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to repost', 401);
    }

    if (authorId && authorId !== sessionUser.id) {
        throw new AppError('Repost author must match the authenticated user', 403);
    }

    if (!id) {
        throw new AppError('Post ID is required to repost', 400);
    }

    const resolvedAuthorId = sessionUser.id;

    // Verify original post exists
    const originalPost = await prisma.post.findUnique({ where: { id } });
    if (!originalPost) throw new AppError('Original post not found', 404);
    if (originalPost.moderationStatus !== MODERATION_STATUS.VISIBLE) {
        throw new AppError('Cannot repost hidden content', 403);
    }

    // Verify author exists
    const author = await prisma.user.findUnique({ where: { id: resolvedAuthorId } });
    if (!author) throw new AppError('Author profile not found', 404);

    // Check if user already reposted this post
    const existingRepost = await prisma.post.findFirst({
        where: {
            authorId: resolvedAuthorId,
            repostOfId: id
        }
    });

    let reposted = false;
    if (existingRepost) {
        // Delete the repost record
        await prisma.post.delete({
            where: { id: existingRepost.id }
        });
        // Decrement repostCount on original post
        await prisma.post.update({
            where: { id },
            data: { repostCount: { decrement: 1 } }
        });
    } else {
        // Create the repost post entry
        await prisma.post.create({
            data: {
                authorId: resolvedAuthorId,
                repostOfId: id,
                walrusBlobId: originalPost.walrusBlobId,
                blobHash: originalPost.blobHash,
                contentType: originalPost.contentType,
                score: 0,
                moderationStatus: MODERATION_STATUS.VISIBLE,
                moderationReason: null,
            }
        });
        // Increment repostCount on original post
        await prisma.post.update({
            where: { id },
            data: { repostCount: { increment: 1 } }
        });
        reposted = true;

        // Create Repost Notification
        if (originalPost.authorId !== resolvedAuthorId) {
            try {
                await prisma.notification.create({
                    data: {
                        userId: originalPost.authorId,
                        actorId: resolvedAuthorId,
                        type: 'repost',
                        postId: id
                    }
                });
            } catch (notifErr) {
                console.error('⚠️ Failed to create repost notification:', notifErr);
            }
        }
    }

    const updatedPost = await prisma.post.findUnique({ where: { id } });

    res.status(200).json({
        status: 'success',
        reposted,
        data: { repostCount: updatedPost?.repostCount || 0 }
    });
});

/**
 * Controller to fetch real-time trending tags, compiling them from simulated blobs and Redis counters.
 */
export const getTrendingTags = asyncHandler(async (req: Request, res: Response) => {
    const tagCounts: { [key: string]: number } = {};
    
    // 1. Gather hashtags from database-backed simulated blobs
    try {
        const simulatedBlobs = await withTimeout(
            prisma.simulatedBlob.findMany({
                take: 100,
                orderBy: { createdAt: 'desc' }
            }),
            1200,
            []
        );
        
        for (const blob of simulatedBlobs) {
            try {
                const parsed = JSON.parse(blob.content);
                const text = parsed?.content?.text || parsed?.text || '';
                const hashtags = text.match(/#\w+/g);
                if (hashtags) {
                    for (const tag of hashtags) {
                        const cleanTag = tag.replace('#', '').toLowerCase();
                        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                    }
                }
            } catch {
                // Skip if not JSON or parsing fails
            }
        }
    } catch (err) {
        console.warn('⚠️ Failed to compile tags from simulated blobs:', err);
    }
    
    // 2. Merge with Redis active hashtag counters
    try {
        const redisKeys = await cache.keys('trending:tags:*');
        for (const key of redisKeys) {
            const tag = key.replace('trending:tags:', '').toLowerCase();
            const val = await cache.get(key);
            if (val) {
                const count = parseInt(val, 10);
                tagCounts[tag] = (tagCounts[tag] || 0) + count;
            }
        }
    } catch (err) {
        // Redis offline/empty
    }
    
    // 3. Define fallback defaults if database is completely empty
    const defaultTags = [
        { name: 'blobcast', posts: '4,289 blobs cast', trend: '+142%', category: 'Social' },
        { name: 'walrus', posts: '12,980 shards saved', trend: '+85%', category: 'Storage' },
        { name: 'suinetwork', posts: '8,401 epoch txs', trend: '+45%', category: 'Protocol' },
        { name: 'tatum', posts: '1,980 gateway calls', trend: '+95%', category: 'RPC' },
        { name: 'decentSocial', posts: '3,104 profiles', trend: '+120%', category: 'Web3' },
        { name: 'erasureCoding', posts: '2,900 reconstructions', trend: '+110%', category: 'Math' }
    ];
    
    const compiledTags = Object.keys(tagCounts).map(name => {
        const count = tagCounts[name];
        const categories = ['Social', 'Storage', 'Protocol', 'RPC', 'Web3', 'Tech'];
        const category = categories[Math.abs(name.charCodeAt(0) || 0) % categories.length];
        return {
            name,
            posts: `${count} blobs cast`,
            trend: `+${20 + (count * 15)}%`,
            category
        };
    });
    
    // Sort by count descending
    compiledTags.sort((a, b) => b.posts.localeCompare(a.posts));
    
    const finalTags = compiledTags.length > 2 
        ? compiledTags.slice(0, 10) 
        : [...compiledTags, ...defaultTags.filter(dt => !tagCounts[dt.name])].slice(0, 10);
        
    res.status(200).json({
        status: 'success',
        data: { tags: finalTags }
    });
});

/**
 * Controller to fetch top trending casts based on likes and comments.
 */
export const getTrendingCasts = asyncHandler(async (req: Request, res: Response) => {
    const posts = await withTimeout(
        prisma.post.findMany({
            where: {
                ...visiblePostWhere,
                repostOfId: null
            },
            orderBy: [
                { likeCount: 'desc' },
                { commentCount: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 5,
            include: {
                author: true,
                media: true,
                likes: {
                    include: {
                        user: true
                    }
                },
                reposts: {
                    include: {
                        author: true
                    }
                }
            }
        }),
        1200,
        []
    );
    
    res.status(200).json({
        status: 'success',
        data: { posts }
    });
});
