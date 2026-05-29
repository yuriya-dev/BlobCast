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
                    }
                }
            }
        }
    });

    if (!user) {
        throw new AppError('User profile not found for this wallet address', 404);
    }

    const followersCount = await prisma.follow.count({
        where: { followingId: user.id }
    });

    const followingCount = await prisma.follow.count({
        where: { followerId: user.id }
    });

    let isFollowing = false;
    if (req.authUser) {
        const followRecord = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: req.authUser.id,
                    followingId: user.id
                }
            }
        });
        isFollowing = !!followRecord;
    }

    res.status(200).json({
        status: 'success',
        data: { 
            user: {
                ...user,
                followersCount,
                followingCount,
                isFollowing
            }
        }
    });
});

/**
 * Controller to register or update user identity schemas directly in Supabase.
 */
export const upsertUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress: bodyWalletAddress, username, displayName, avatarBlobId, bannerBlobId, bio, website, github, pinnedPostId } = req.body;
    const sessionWalletAddress = req.authUser?.walletAddress;
    const walletAddress = bodyWalletAddress || sessionWalletAddress;

    if (!walletAddress) {
        throw new AppError('Wallet address is required to register identity', 400);
    }

    if (sessionWalletAddress && bodyWalletAddress && bodyWalletAddress.toLowerCase() !== sessionWalletAddress.toLowerCase()) {
        throw new AppError('You can only update your own profile', 403);
    }

    const user = await prisma.user.upsert({
        where: { walletAddress },
        update: {
            username: username || undefined,
            displayName: displayName || undefined,
            avatarBlobId: avatarBlobId || undefined,
            bannerBlobId: bannerBlobId || undefined,
            bio: bio || undefined,
            website: website || undefined,
            github: github || undefined,
            pinnedPostId: pinnedPostId === undefined ? undefined : pinnedPostId
        },
        create: {
            walletAddress,
            username: username || `anon_${walletAddress.substring(2, 8)}`,
            displayName: displayName || 'Anonymous Caster',
            avatarBlobId: avatarBlobId || null,
            bannerBlobId: bannerBlobId || null,
            bio: bio || null,
            website: website || null,
            github: github || null,
            pinnedPostId: pinnedPostId || null,
            verified: false
        }
    });

    res.status(200).json({
        status: 'success',
        message: 'Identity profile successfully synchronized with Supabase',
        data: { user }
    });
});

/**
 * Controller to fetch all registered users in the database.
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        status: 'success',
        data: { users }
    });
});

/**
 * Controller to follow a user by their wallet address.
 */
export const followUser = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to follow users', 401);
    }

    if (!walletAddress) {
        throw new AppError('Target wallet address is required', 400);
    }

    const targetUser = await prisma.user.findUnique({
        where: { walletAddress }
    });

    if (!targetUser) {
        throw new AppError('Target user not found', 404);
    }

    if (targetUser.id === sessionUser.id) {
        throw new AppError('You cannot follow yourself', 400);
    }

    await prisma.follow.upsert({
        where: {
            followerId_followingId: {
                followerId: sessionUser.id,
                followingId: targetUser.id
            }
        },
        update: {},
        create: {
            followerId: sessionUser.id,
            followingId: targetUser.id
        }
    });

    res.status(200).json({
        status: 'success',
        message: 'Successfully followed user'
    });
});

/**
 * Controller to unfollow a user by their wallet address.
 */
export const unfollowUser = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to unfollow users', 401);
    }

    if (!walletAddress) {
        throw new AppError('Target wallet address is required', 400);
    }

    const targetUser = await prisma.user.findUnique({
        where: { walletAddress }
    });

    if (!targetUser) {
        throw new AppError('Target user not found', 404);
    }

    try {
        await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId: sessionUser.id,
                    followingId: targetUser.id
                }
            }
        });
    } catch {
        // Silently succeed if relationship didn't exist
    }

    res.status(200).json({
        status: 'success',
        message: 'Successfully unfollowed user'
    });
});
