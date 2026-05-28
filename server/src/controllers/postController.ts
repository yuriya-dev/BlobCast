import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

const prisma = new PrismaClient();

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
            media: true
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
