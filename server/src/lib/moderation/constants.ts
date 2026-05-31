export const MODERATION_STATUS = {
  VISIBLE: 'VISIBLE',
  HIDDEN: 'HIDDEN',
} as const;

export type ModerationStatus = (typeof MODERATION_STATUS)[keyof typeof MODERATION_STATUS];

export const MODERATION_REASONS = ['none', 'spam', 'scam', 'hate', 'explicit'] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];

import type { Prisma } from '@prisma/client';

export const visiblePostWhere: Prisma.PostWhereInput = {
  moderationStatus: MODERATION_STATUS.VISIBLE,
  OR: [
    { repostOfId: null },
    { repostOf: { moderationStatus: MODERATION_STATUS.VISIBLE } },
  ],
};

export const visibleCommentWhere: Prisma.CommentWhereInput = {
  moderationStatus: MODERATION_STATUS.VISIBLE,
};
