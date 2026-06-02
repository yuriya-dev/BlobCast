import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { buildAuthCookie, clearAuthCookie, createAuthToken, verifyAuthToken } from '../lib/auth';
import { validateAndNormalizeUsername } from '../utils/validation';

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

  let normalizedUsername = undefined;
  if (username) {
    normalizedUsername = await validateAndNormalizeUsername(username, walletAddress);
  }

  return prisma.user.upsert({
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
    },
    select: userSelect
  });
}

function attachSession(res: Response, userId: string) {
  const token = createAuthToken(userId);
  res.setHeader('Set-Cookie', buildAuthCookie(token));
  return token;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await upsertIdentityProfile(req.body);
  const token = attachSession(res, user.id);

  res.status(201).json({
    status: 'success',
    message: 'Account registered successfully',
    data: { user, token }
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

  const token = attachSession(res, user.id);

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    data: { user, token }
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  // 1. Try checking the Authorization header first (Bearer Token)
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // 2. Fall back to reading from session cookies
  if (!token) {
    const cookies = req.headers.cookie || '';
    const cookieToken = cookies
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('blobcast_session='))
      ?.split('=')[1];
    
    token = cookieToken ? decodeURIComponent(cookieToken) : null;
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    throw new AppError('Session expired or invalid', 401, 'INVALID_TOKEN');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: userSelect
  });

  if (!user) {
    throw new AppError('Authenticated user not found', 401, 'INVALID_TOKEN');
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