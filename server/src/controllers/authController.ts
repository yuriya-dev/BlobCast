import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { buildAuthCookie, clearAuthCookie, createAuthToken, verifyAuthToken } from '../lib/auth';

const userSelect = {
  id: true,
  walletAddress: true,
  username: true,
  displayName: true,
  avatarBlobId: true,
  bannerBlobId: true,
  bio: true,
  website: true,
  github: true,
  pinnedPostId: true,
  verified: true,
  createdAt: true
} as const;

async function upsertIdentityProfile(body: Record<string, any>) {
  const { walletAddress, username, displayName, avatarBlobId, bannerBlobId, bio, website, github, pinnedPostId } = body;

  if (!walletAddress) {
    throw new AppError('Wallet address is required', 400);
  }

  return prisma.user.upsert({
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
    },
    select: userSelect
  });
}

function attachSession(res: Response, userId: string) {
  const token = createAuthToken(userId);
  res.setHeader('Set-Cookie', buildAuthCookie(token));
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await upsertIdentityProfile(req.body);
  attachSession(res, user.id);

  res.status(201).json({
    status: 'success',
    message: 'Account registered successfully',
    data: { user }
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    throw new AppError('Wallet address is required to login', 400);
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: userSelect
  });

  if (!user) {
    throw new AppError('Profile not found for this wallet. Please register first.', 404);
  }

  attachSession(res, user.id);

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    data: { user }
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const cookies = req.headers.cookie || '';
  const token = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('blobcast_session='))
    ?.split('=')[1];

  const decodedToken = token ? decodeURIComponent(token) : null;
  const payload = verifyAuthToken(decodedToken);

  if (!payload) {
    throw new AppError('Session expired or invalid', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: userSelect
  });

  if (!user) {
    throw new AppError('Authenticated user not found', 401);
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', clearAuthCookie());
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});