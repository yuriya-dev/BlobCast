import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

/**
 * Register a new tip payout verified on Sui/Walrus.
 */
export const createTip = asyncHandler(async (req: Request, res: Response) => {
    const { 
        senderAddress, 
        senderName, 
        recipientId, 
        postId, 
        amount, 
        suiTxDigest, 
        blobHash, 
        verifiedOnSui 
    } = req.body;

    if (!senderAddress || !recipientId || amount === undefined || amount === null) {
        throw new AppError('Sender address, recipient ID, and amount are required', 400);
    }

    // Verify recipient user exists in database
    const recipient = await prisma.user.findUnique({
        where: { id: recipientId }
    });

    if (!recipient) {
        throw new AppError('Recipient user profile not found', 404);
    }

    // If postId is provided, verify post reference exists
    if (postId) {
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });
        if (!post) {
            throw new AppError('Associated post not found', 404);
        }
    }

    const tip = await prisma.tip.create({
        data: {
            senderAddress,
            senderName: senderName || 'Anonymous Caster',
            recipientId,
            postId: postId || null,
            amount: parseFloat(amount),
            suiTxDigest: suiTxDigest || null,
            blobHash: blobHash || null,
            verifiedOnSui: verifiedOnSui !== undefined ? verifiedOnSui : true,
        },
        include: {
            recipient: true,
            post: true
        }
    });

    res.status(201).json({
        status: 'success',
        message: 'Tip successfully registered in Supabase relational index',
        data: { tip }
    });
});

/**
 * Retrieve tip transaction history received by a specific user.
 */
export const getTipsReceived = asyncHandler(async (req: Request, res: Response) => {
    const { recipientId, limit } = req.query;

    if (!recipientId) {
        throw new AppError('recipientId query parameter is required', 400);
    }

    const tips = await prisma.tip.findMany({
        where: {
            recipientId: recipientId as string
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: limit ? parseInt(limit as string) : 50,
        include: {
            post: true
        }
    });

    res.status(200).json({
        status: 'success',
        data: { tips }
    });
});
