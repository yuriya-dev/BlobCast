import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { visiblePostWhere } from '../lib/moderation';
import { validateAndNormalizeUsername } from '../utils/validation';

const withTimeout = <T>(promise: Promise<T>, ms = 1500, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
};

/**
 * Controller to fetch User Profile details by wallet address OR username.
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;

    if (!walletAddress) {
        throw new AppError('Wallet address or username parameter is required', 400);
    }

    // Determine if this is a wallet address (starts with 0x) or a username
    const isWalletAddress = walletAddress.startsWith('0x');

    const user = await prisma.user.findUnique({
        where: isWalletAddress
            ? { walletAddress }
            : { username: walletAddress },
        include: {
            posts: {
                where: visiblePostWhere,
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
        throw new AppError(`User profile not found for "${walletAddress}"`, 404);
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

    let normalizedUsername = undefined;
    if (username) {
        normalizedUsername = await validateAndNormalizeUsername(username, walletAddress);
    }

    const user = await prisma.user.upsert({
        where: { walletAddress },
        update: {
            username: normalizedUsername || undefined,
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
            username: normalizedUsername || `anon_${walletAddress.substring(2, 8).toLowerCase()}`,
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

    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followingId: {
                followerId: sessionUser.id,
                followingId: targetUser.id
            }
        }
    });

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

    if (!existingFollow) {
        try {
            await prisma.notification.create({
                data: {
                    userId: targetUser.id,
                    actorId: sessionUser.id,
                    type: 'follow'
                }
            });
        } catch (notifErr) {
            console.error('⚠️ Failed to create follow notification:', notifErr);
        }
    }

    const followersCount = await prisma.follow.count({
        where: { followingId: targetUser.id }
    });

    res.status(200).json({
        status: 'success',
        message: 'Successfully followed user',
        data: { isFollowing: true, followersCount }
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

    const followersCount = await prisma.follow.count({
        where: { followingId: targetUser.id }
    });

    res.status(200).json({
        status: 'success',
        message: 'Successfully unfollowed user',
        data: { isFollowing: false, followersCount }
    });
});

/**
 * Controller to fetch all followers of a user.
 */
export const getUserFollowers = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;

    if (!walletAddress) {
        throw new AppError('Wallet address is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const follows = await prisma.follow.findMany({
        where: { followingId: user.id },
        include: { follower: true }
    });

    const followers = follows.map(f => f.follower);

    res.status(200).json({
        status: 'success',
        data: { followers }
    });
});

/**
 * Controller to fetch all users followed by a user.
 */
export const getUserFollowing = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;

    if (!walletAddress) {
        throw new AppError('Wallet address is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const follows = await prisma.follow.findMany({
        where: { followerId: user.id },
        include: { following: true }
    });

    const following = follows.map(f => f.following);

    res.status(200).json({
        status: 'success',
        data: { following }
    });
});

/**
 * Controller to fetch all notifications for the authenticated user.
 */
export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to retrieve notifications', 401);
    }

    const notifications = await prisma.notification.findMany({
        where: {
            userId: sessionUser.id
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            actor: true,
            post: {
                include: {
                    author: true
                }
            }
        }
    });

    res.status(200).json({
        status: 'success',
        data: { notifications }
    });
});

/**
 * Controller to mark all unread notifications for the authenticated user as read.
 */
export const markNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
    const sessionUser = req.authUser;

    if (!sessionUser) {
        throw new AppError('Authentication required to update notifications', 401);
    }

    await prisma.notification.updateMany({
        where: {
            userId: sessionUser.id,
            isRead: false
        },
        data: {
            isRead: true
        }
    });

    res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read'
    });
});

/**
 * Controller to fetch verified and active spotlight creators from PostgreSQL.
 */
export const getSpotlightCreators = asyncHandler(async (req: Request, res: Response) => {
    try {
        const users = await withTimeout(
            prisma.user.findMany({
                take: 5,
                orderBy: [
                    { verified: 'desc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    followers: true
                }
            }),
            1200,
            []
        );
        
        const formattedCreators = users.map(user => ({
            id: user.id,
            displayName: user.displayName || 'Anonymous Caster',
            username: user.username || `anon_${user.walletAddress.substring(2, 8)}`,
            walletAddress: user.walletAddress,
            followers: user.followers.length,
            bio: user.bio || 'Decentralized creator on BlobCast.',
            verified: user.verified
        }));
        
        res.status(200).json({
            status: 'success',
            data: { creators: formattedCreators }
        });
    } catch (err) {
        // Fallback default creators
        const defaultCreators = [
            {
                id: 'c1',
                displayName: 'Walrus',
                username: 'walrus',
                walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
                followers: 4800000,
                bio: 'Decentralized social layer on Sui.',
                verified: true
            },
            {
                id: 'c2',
                displayName: 'Yuriya',
                username: 'yuriya',
                walletAddress: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
                followers: 1248,
                bio: 'BlobCast core architect. Writing social schemas directly onto the Walrus storage layers.',
                verified: true
            },
            {
                id: 'c3',
                displayName: 'Tatum',
                username: 'tatum',
                walletAddress: '0x81b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
                followers: 4200,
                bio: 'Decentralized social layer on Sui.',
                verified: true
            }
        ];
        res.status(200).json({
            status: 'success',
            data: { creators: defaultCreators }
        });
    }
});
