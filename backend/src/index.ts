import { env } from './lib/env';
import { prisma } from './lib/prisma';
import { createApp } from './app';

async function main() {
  await prisma.$connect(); // fail fast if MySQL is unreachable
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`CSC API running on http://localhost:${env.PORT}/api`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
