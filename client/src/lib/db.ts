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
    // Add default users
    const user1: MockUser = {
      id: 'usr-1-vitalik',
      walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
      username: 'vitalik',
      displayName: 'Vitalik Buterin',
      avatarBlobId: 'walrus://vitalik-avatar',
      bannerBlobId: 'walrus://vitalik-banner',
      bio: 'Sui & decentralized protocols enthusiast. Keeping the internet free and open.',
      verified: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const user2: MockUser = {
      id: 'usr-2-sademir',
      walletAddress: '0x14b6a2164130de573dcdd114299ba144629979fe9423bc8e81bc06754e6b3e43',
      username: 'yuriya',
      displayName: 'Yuriya',
      avatarBlobId: 'walrus://yuriya-avatar',
      bannerBlobId: 'walrus://yuriya-banner',
      bio: 'Building BlobCast: own your social posts forever. Powered by Walrus & Sui.',
      verified: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };

    const user3: MockUser = {
      id: 'usr-3-mysten',
      walletAddress: '0x81b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
      username: 'mystenlabs',
      displayName: 'Mysten Labs',
      avatarBlobId: 'walrus://mysten-avatar',
      bannerBlobId: 'walrus://mysten-banner',
      bio: 'Creating tools for the decentralized future. Creators of @SuiNetwork and @WalrusProtocol.',
      verified: true,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    };

    this.users.push(user1, user2, user3);

    // Initial Posts
    const post1: MockPost = {
      id: 'post-1',
      authorId: 'usr-2-sademir',
      suiObjectId: '0x5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      walrusBlobId: 'walrus://blob-post-1',
      blobHash: 'sha256-h7f9e8d7c6b5a4',
      contentType: 0,
      visibility: 0,
      replyToId: null,
      repostOfId: null,
      likeCount: 42,
      commentCount: 5,
      repostCount: 12,
      score: 85.5,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    };

    const post2: MockPost = {
      id: 'post-2',
      authorId: 'usr-1-vitalik',
      suiObjectId: '0x0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e',
      walrusBlobId: 'walrus://blob-post-2',
      blobHash: 'sha256-abc123xyz789',
      contentType: 1, // media
      visibility: 0,
      replyToId: null,
      repostOfId: null,
      likeCount: 256,
      commentCount: 18,
      repostCount: 64,
      score: 512.2,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    };

    this.posts.push(post1, post2);

    // Media
    this.media.push({
      id: 'media-1',
      postId: 'post-2',
      mediaType: 'image',
      walrusBlobId: 'walrus://blob-post-2-image',
      mimeType: 'image/png',
      width: 1200,
      height: 800,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    });

    // Follows
    this.follows.push(
      { followerId: 'usr-2-sademir', followingId: 'usr-1-vitalik', createdAt: new Date() },
      { followerId: 'usr-2-sademir', followingId: 'usr-3-mysten', createdAt: new Date() },
      { followerId: 'usr-1-vitalik', followingId: 'usr-2-sademir', createdAt: new Date() }
    );

    // Likes
    this.likes.push(
      { userId: 'usr-1-vitalik', postId: 'post-1', createdAt: new Date() },
      { userId: 'usr-3-mysten', postId: 'post-1', createdAt: new Date() }
    );

    // Comments
    this.comments.push({
      id: 'comment-1',
      postId: 'post-1',
      authorId: 'usr-1-vitalik',
      walrusBlobId: 'walrus://blob-comment-1',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    });
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
    console.warn("⚠️ Failed to initialize actual Prisma Client. Falling back to InMemory Mock Database.", error);
    isMock = true;
    prisma = {} as PrismaClient; // empty fallback so compilation does not complain
  }
} else {
  console.warn("⚠️ DATABASE_URL is not set. Falling back to InMemory Mock Database.");
  isMock = true;
  prisma = {} as PrismaClient;
}

export { prisma, isMock };
