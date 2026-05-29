import type { Prisma } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      authUser?: Prisma.UserGetPayload<{}>;
    }
  }
}

export {};