import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import { AppError } from '../utils/appError';
import { parseCookies, verifyAuthToken, AUTH_COOKIE_NAME } from '../lib/auth';

/**
 * Verifies the incoming request token and retrieves the authenticated user.
 * Throws precise, structured AppErrors to distinguish different failure modes.
 */
async function verifyAndGetAuthUser(req: Request): Promise<any> {
  // 1. Prioritize the Authorization header (Bearer Token)
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // 2. Fall back to reading from session cookies
  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies[AUTH_COOKIE_NAME];
  }

  if (!token) {
    throw new AppError('Authentication required', 401, 'INVALID_TOKEN');
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    throw new AppError('Session expired or invalid', 401, 'INVALID_TOKEN');
  }

  // Any DB query errors here will propagate as 500 Internal Server Errors,
  // which is correct (it indicates infrastructure failure, not an authentication issue).
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user) {
    throw new AppError('Authenticated user not found in database', 401, 'USER_NOT_FOUND');
  }

  return user;
}

/** Sets req.authUser when a valid session token is present; does not reject anonymous requests. */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const user = await verifyAndGetAuthUser(req).catch(() => null);
    if (user) {
      req.authUser = user;
    }
    next();
  } catch (error) {
    next(error);
  }
};

/** Protects endpoints by requiring a valid authenticated session. */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const user = await verifyAndGetAuthUser(req);
    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
};