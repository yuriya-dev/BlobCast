import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db';
import { AppError } from '../utils/appError';
import { parseCookies, verifyAuthToken, AUTH_COOKIE_NAME } from '../lib/auth';

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[AUTH_COOKIE_NAME];
    const payload = verifyAuthToken(token);

    if (!payload) {
      throw new AppError('Authentication required', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      throw new AppError('Authenticated user not found', 401);
    }

    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
};