import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding actual PostgreSQL database...');

  // Clean existing tables
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.media.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      id: 'usr-1-vitalik',
      walletAddress: '0x321a5cf4de7c89f01a34d284a1e948cde7231456107b22d148cd90ef718cda12',
      username: 'vitalik',
      displayName: 'Vitalik Buterin',
      avatarBlobId: 'walrus://vitalik-avatar',
      bannerBlobId: 'walrus://vitalik-banner',
      bio: 'Sui & decentralized protocols enthusiast. Keeping the internet free and open.',
      verified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: 'usr-2-sademir',
      walletAddress: '0x91abc6f3e1b7d8c09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
      username: 'yuriya',
      displayName: 'Yuriya',
      avatarBlobId: 'walrus://yuriya-avatar',
      bannerBlobId: 'walrus://yuriya-banner',
      bio: 'Building BlobCast: own your social posts forever. Powered by Walrus & Sui.',
      verified: true,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      id: 'usr-3-mysten',
      walletAddress: '0x81b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
      username: 'mystenlabs',
      displayName: 'Mysten Labs',
      avatarBlobId: 'walrus://mysten-avatar',
      bannerBlobId: 'walrus://mysten-banner',
      bio: 'Creating tools for the decentralized future. Creators of @SuiNetwork and @WalrusProtocol.',
      verified: true,
    },
  });

  // Create Posts
  const post1 = await prisma.post.create({
    data: {
      id: 'post-1',
      authorId: user2.id,
      suiObjectId: '0x5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      walrusBlobId: 'walrus://blob-post-1',
      blobHash: 'sha256-h7f9e8d7c6b5a4',
      contentType: 0,
      visibility: 0,
      likeCount: 42,
      commentCount: 5,
      repostCount: 12,
      score: 85.5,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      id: 'post-2',
      authorId: user1.id,
      suiObjectId: '0x0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e',
      walrusBlobId: 'walrus://blob-post-2',
      blobHash: 'sha256-abc123xyz789',
      contentType: 1, // media
      visibility: 0,
      likeCount: 256,
      commentCount: 18,
      repostCount: 64,
      score: 512.2,
    },
  });

  // Create Media
  await prisma.media.create({
    data: {
      id: 'media-1',
      postId: post2.id,
      mediaType: 'image',
      walrusBlobId: 'walrus://blob-post-2-image',
      mimeType: 'image/png',
      width: 1200,
      height: 800,
    },
  });

  // Create Follows
  await prisma.follow.createMany({
    data: [
      { followerId: user2.id, followingId: user1.id },
      { followerId: user2.id, followingId: user3.id },
      { followerId: user1.id, followingId: user2.id },
    ],
  });

  // Create Likes
  await prisma.like.createMany({
    data: [
      { userId: user1.id, postId: post1.id },
      { userId: user3.id, postId: post1.id },
    ],
  });

  // Create Comment
  await prisma.comment.create({
    data: {
      id: 'comment-1',
      postId: post1.id,
      authorId: user1.id,
      walrusBlobId: 'walrus://blob-comment-1',
    },
  });

  console.log('🌱 Seeding database completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
