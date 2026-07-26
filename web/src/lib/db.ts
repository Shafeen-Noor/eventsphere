import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = raw.startsWith("file:")
    ? raw.replace(/^file:/, "")
    : raw;
  // Keep DB under the web project root (avoid tracing the whole filesystem).
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
  const adapter = new PrismaBetterSqlite3({ url: `file:${resolved}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
