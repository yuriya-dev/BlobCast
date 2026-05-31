export const MODERATION_STATUS = {
  VISIBLE: 'VISIBLE',
  HIDDEN: 'HIDDEN',
} as const;

export type ModerationStatus = (typeof MODERATION_STATUS)[keyof typeof MODERATION_STATUS];

export function isContentVisible(
  status?: string | null
): status is typeof MODERATION_STATUS.VISIBLE {
  return !status || status === MODERATION_STATUS.VISIBLE;
}

export const HIDDEN_CONTENT_MESSAGE =
  'This content violates BlobCast guidelines.';
