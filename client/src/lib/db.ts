import { PrismaClient } from '@prisma/client';

// Define TS types for our in-memory mock database
export interface MockUser {
  id: string;
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  avatarBlobId: string | null;
  bannerBlobId: string | null;
  bio: string | null;
  website?: string | null;
  github?: string | null;
  pinnedPostId?: string | null;
  verified: boolean;
  createdAt: Date;
}

export interface MockPost {
  id: string;
  authorId: string;
  suiObjectId: string | null;
  walrusBlobId: string;
  blobHash: string;
  contentType: number;
  visibility: number;
  replyToId: string | null;
  repostOfId: string | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  score: number;
  createdAt: Date;
  walrusContent?: any;
}

export interface MockMedia {
  id: string;
  postId: string | null;
  mediaType: string | null;
  walrusBlobId: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export interface MockFollow {
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface MockLike {
  userId: string;
  postId: string;
  createdAt: Date;
}

export interface MockComment {
  id: string;
  postId: string;
  authorId: string;
  walrusBlobId: string | null;
  createdAt: Date;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: string;
  actorId: string;
  postId: string | null;
  isRead: boolean;
  createdAt: Date;
}

// In-Memory Database store
class InMemoryDatabase {
  users: MockUser[] = [];
  posts: MockPost[] = [];
  media: MockMedia[] = [];
  follows: MockFollow[] = [];
  likes: MockLike[] = [];
  comments: MockComment[] = [];
  notifications: MockNotification[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    // Purged all mockup users (usr-1-vitalik, usr-2-sademir, usr-3-mysten) and their mock posts/actions.
  }
}

// Global mock database instance
export const mockDb = new InMemoryDatabase();

// Instantiate actual Prisma Client or provide fallback
let prisma: PrismaClient;
let isMock = false;

if (process.env.DATABASE_URL) {
  try {
    const globalForPrisma = global as unknown as { prisma: PrismaClient };
    prisma = globalForPrisma.prisma || new PrismaClient();
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
  } catch (error) {
    // Silently fall back to in-memory mock
    isMock = true;
    prisma = {} as PrismaClient;
  }
} else {
  // DATABASE_URL is intentionally a server-only var (no NEXT_PUBLIC_ prefix).
  // In the browser, always use the in-memory mock DB for demo/outage mode.
  isMock = true;
  prisma = {} as PrismaClient;
}

export { prisma, isMock };
