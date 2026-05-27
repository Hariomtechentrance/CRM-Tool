import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Wrap a Prisma call with automatic retry for DB wake-up (Neon free tier suspends after inactivity)
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isConnErr =
        err instanceof Prisma.PrismaClientInitializationError ||
        (err instanceof Error && err.message.includes("Can't reach database"));
      if (isConnErr && i < retries - 1) {
        const delay = (i + 1) * 3000; // 3s, 6s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
