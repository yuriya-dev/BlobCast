import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { cache } from '../lib/redis';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

/**
 * Controller to fetch all posts / timeline feed from Supabase with pagination support.
 */
export const getAllPosts = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
            author: true,
            media: true,
            likes: true,
            reposts: true,
            repostOf: {
                include: {
                    author: true,
                    likes: true,
                    reposts: true
                }
            }
        }
    });

    const totalPosts = await prisma.post.count();

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
                include: { author: true },
                orderBy: { createdAt: 'asc' }
            },
            likes: true,
            reposts: true,
            repostOf: {
                include: {
                    author: true,
                    likes: true,
                    reposts: true
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
    const { authorId, suiObjectId, walrusBlobId, blobHash, contentType, visibility } = req.body;

    if (!authorId || !walrusBlobId || !blobHash) {
        throw new AppError('Author, Walrus Blob ID, and Hash parameters are required to register post', 400);
    }

    // Verify if the author profile exists
    const author = await prisma.user.findUnique({
        where: { id: authorId }
    });

    if (!author) {
        throw new AppError('Specified author profile does not exist', 404);
    }

    const post = await prisma.post.create({
        data: {
            authorId,
            suiObjectId: suiObjectId || null,
            walrusBlobId,
            blobHash,
            contentType: parseInt(contentType, 10) || 0,
            visibility: parseInt(visibility, 10) || 0,
            score: 0
        },
        include: {
            author: true
        }
    });

    res.status(201).json({
        status: 'success',
        message: 'Post reference registered verifiably in Supabase database',
        data: { post }
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

    if (!id || !userId) {
        throw new AppError('Post ID and User ID parameters are required to like', 400);
    }

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new AppError('Post not found', 404);

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User profile not found', 404);

    // Check if user already liked this post
    const existingLike = await prisma.like.findUnique({
        where: {
            userId_postId: { userId, postId: id }
        }
    });

    let liked = false;
    if (existingLike) {
        // Remove like
        await prisma.like.delete({
            where: {
                userId_postId: { userId, postId: id }
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
            data: { userId, postId: id }
        });
        // Increment post like_count
        await prisma.post.update({
            where: { id },
            data: { likeCount: { increment: 1 } }
        });
        liked = true;
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
    const { authorId, walrusBlobId } = req.body;

    if (!id || !authorId || !walrusBlobId) {
        throw new AppError('Post ID, author ID, and Walrus Blob ID are required to comment', 400);
    }

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new AppError('Post not found', 404);

    // Verify author exists
    const author = await prisma.user.findUnique({ where: { id: authorId } });
    if (!author) throw new AppError('Author profile not found', 404);

    // Create Comment in database
    const comment = await prisma.comment.create({
        data: {
            postId: id,
            authorId,
            walrusBlobId
        },
        include: {
            author: true
        }
    });

    // Increment post commentCount
    await prisma.post.update({
        where: { id },
        data: { commentCount: { increment: 1 } }
    });

    res.status(201).json({
        status: 'success',
        message: 'Comment registered successfully in Supabase database',
        data: { comment }
    });
});

/**
 * Controller to repost a post.
 * Acts as a toggle to prevent multiple duplicates and copy posts.
 */
export const repostPost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params; // Original Post ID
    const { authorId } = req.body;

    if (!id || !authorId) {
        throw new AppError('Post ID and Author ID parameters are required to repost', 400);
    }

    // Verify original post exists
    const originalPost = await prisma.post.findUnique({ where: { id } });
    if (!originalPost) throw new AppError('Original post not found', 404);

    // Verify author exists
    const author = await prisma.user.findUnique({ where: { id: authorId } });
    if (!author) throw new AppError('Author profile not found', 404);

    // Check if user already reposted this post
    const existingRepost = await prisma.post.findFirst({
        where: {
            authorId,
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
                authorId,
                repostOfId: id,
                walrusBlobId: originalPost.walrusBlobId,
                blobHash: originalPost.blobHash,
                contentType: originalPost.contentType,
                score: 0
            }
        });
        // Increment repostCount on original post
        await prisma.post.update({
            where: { id },
            data: { repostCount: { increment: 1 } }
        });
        reposted = true;
    }

    const updatedPost = await prisma.post.findUnique({ where: { id } });

    res.status(200).json({
        status: 'success',
        reposted,
        data: { repostCount: updatedPost?.repostCount || 0 }
    });
});
