import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7 requires a driver adapter. `pg` is pooled internally, so a single
 * client instance is enough and each request reuses the pool.
 *
 * On RDS, append `?connection_limit=N&pool_timeout=20` to DATABASE_URL and keep
 * N comfortably below the instance's max_connections (leave headroom for the
 * Prisma CLI and admin sessions).
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }
  // The pg Node.js driver does not parse `sslmode` from the connection URL.
  // RDS requires SSL (pg_hba.conf rejects unencrypted connections), so we
  // pass a pg.PoolConfig with ssl enabled instead of a bare connection string.
  const isProduction = process.env.NODE_ENV === "production";
  const adapter = new PrismaPg(
    isProduction
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : connectionString
  );
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
