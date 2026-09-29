import "dotenv/config";
import { Pool } from "pg";
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

  const isProduction = process.env.NODE_ENV === "production";
  let pool: Pool;

  if (isProduction) {
    const url = new URL(connectionString);
    const limit = url.searchParams.get("connection_limit");
    pool = new Pool({
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.replace(/^\//, ""),
      ssl: { rejectUnauthorized: false },
      max: limit ? parseInt(limit, 10) : 5,
    });
  } else {
    pool = new Pool({ connectionString });
  }

  const adapter = new PrismaPg(pool);
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
