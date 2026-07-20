import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads in dev (avoids exhausting
// connections). In production one instance is created per server process.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
