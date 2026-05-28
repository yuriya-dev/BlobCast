import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

/**
 * Controller to fetch User Profile details by wallet address.
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;

    if (!walletAddress) {
        throw new AppError('Wallet address parameter is required', 400);
    }

    const user = await prisma.user.findUnique({
        where: { walletAddress },
        include: {
            posts: {
                take: 10,
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user) {
        throw new AppError('User profile not found for this wallet address', 404);
    }

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

/**
 * Controller to register or update user identity schemas directly in Supabase.
 */
export const upsertUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress, username, displayName, avatarBlobId, bannerBlobId, bio } = req.body;

    if (!walletAddress) {
        throw new AppError('Wallet address is required to register identity', 400);
    }

    const user = await prisma.user.upsert({
        where: { walletAddress },
        update: {
            username: username || undefined,
            displayName: displayName || undefined,
            avatarBlobId: avatarBlobId || undefined,
            bannerBlobId: bannerBlobId || undefined,
            bio: bio || undefined
        },
        create: {
            walletAddress,
            username: username || `anon_${walletAddress.substring(2, 8)}`,
            displayName: displayName || 'Anonymous Caster',
            avatarBlobId: avatarBlobId || null,
            bannerBlobId: bannerBlobId || null,
            bio: bio || null,
            verified: false
        }
    });

    res.status(200).json({
        status: 'success',
        message: 'Identity profile successfully synchronized with Supabase',
        data: { user }
    });
});
