import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env';

// Prisma v7 requires a driver adapter for database connections
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * Gracefully disconnect Prisma on process termination.
 * Called from index.ts SIGTERM/SIGINT handlers.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
