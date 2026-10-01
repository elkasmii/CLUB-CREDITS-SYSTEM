/**
 * Seeds the first admin account and a few starter store items.
 * Safe to run more than once (uses upsert / skip-if-exists).
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME ?? 'CSC Admin';

  if (!email || !password || password.length < 8) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 8 chars) in backend/.env');
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      status: 'ACTIVE',
      approvedAt: new Date(),
    },
  });
  console.log(`Admin ready: ${admin.email}`);

  if ((await prisma.storeItem.count()) === 0) {
    await prisma.storeItem.createMany({
      data: [
        { name: 'CSC Sticker', description: 'Holographic CSC laptop sticker.', priceInCredits: 30, stock: 100 },
        { name: 'CSC Cup', description: 'Ceramic mug for late-night debugging.', priceInCredits: 150, stock: 30 },
        { name: 'CSC T-Shirt', description: 'Official CSC t-shirt.', priceInCredits: 250, stock: 25 },
        { name: 'CSC Hoodie', description: 'Official CSC hoodie.', priceInCredits: 400, stock: 15 },
      ],
    });
    console.log('Starter store items created.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
