-- AI moderation fields for posts and comments
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "moderation_status" VARCHAR(20) NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "moderation_reason" VARCHAR(20);

ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "moderation_status" VARCHAR(20) NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "moderation_reason" VARCHAR(20);

CREATE INDEX IF NOT EXISTS "posts_moderation_status_created_at_idx" ON "posts" ("moderation_status", "created_at" DESC);
