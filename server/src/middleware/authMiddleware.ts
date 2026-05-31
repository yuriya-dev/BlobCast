import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import { AppError } from '../utils/appError';
import { parseCookies, verifyAuthToken, AUTH_COOKIE_NAME } from '../lib/auth';

async function attachAuthUser(req: Request): Promise<boolean> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME];
  const payload = verifyAuthToken(token);

  if (!payload) {
    return false;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user) {
    return false;
  }

  req.authUser = user;
  return true;
}

/** Sets req.authUser when a valid session cookie is present; does not reject anonymous requests. */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    await attachAuthUser(req);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authenticated = await attachAuthUser(req);

    if (!authenticated) {
      throw new AppError('Authentication required', 401);
    }

    next();
  } catch (error) {
    next(error);
  }
};