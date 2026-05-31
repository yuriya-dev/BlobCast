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

  console.log('🌱 Mock data seeding purged successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
