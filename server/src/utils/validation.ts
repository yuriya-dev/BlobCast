import { AppError } from './appError';
import { prisma } from '../lib/db';

const RESERVED_USERNAMES = new Set([
  'admin',
  'support',
  'blobcast',
  'api',
  'root',
  'system',
  'official',
  'wallet',
  'moderator',
  'null',
  'undefined'
]);

/**
 * Validates and normalizes a BlobCast username.
 * Throws a structured AppError (400) if validation fails.
 */
export async function validateAndNormalizeUsername(username: string, currentWalletAddress?: string): Promise<string> {
  if (!username) {
    throw new AppError('Username is required', 400);
  }

  // Normalize to lowercase
  const normalized = username.trim().toLowerCase();

  // Validate length
  if (normalized.length < 3 || normalized.length > 20) {
    throw new AppError('Username must be between 3 and 20 characters', 400);
  }

  // Validate characters (alphanumeric and underscore)
  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(normalized)) {
    throw new AppError('Username can only contain letters, numbers, and underscores (_)', 400);
  }

  // Check reserved usernames
  if (RESERVED_USERNAMES.has(normalized)) {
    throw new AppError(`Username "${normalized}" is reserved and cannot be used`, 400);
  }

  // Check uniqueness in database (excluding the current user's wallet address if updating)
  const existingUser = await prisma.user.findUnique({
    where: { username: normalized }
  });

  if (existingUser) {
    if (!currentWalletAddress || existingUser.walletAddress.toLowerCase() !== currentWalletAddress.toLowerCase()) {
      throw new AppError('Username is already taken by another account', 400);
    }
  }

  return normalized;
}
