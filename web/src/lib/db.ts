import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Use a Postgres URL from Neon, Supabase, or Vercel Postgres.",
    );
  }

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      // Neon / most hosted Postgres use TLS in production
      ssl:
        process.env.NODE_ENV === "production" ||
        connectionString.includes("sslmode=require") ||
        connectionString.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
