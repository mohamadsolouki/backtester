import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Serverless functions (Vercel) spin up many short-lived instances; keep each
// instance's own pool tiny and rely on an upstream pooler (e.g. Neon's pooled
// connection string / PgBouncer) for fan-out. DATABASE_URL should be the
// pooled connection string in production; migrations use DIRECT_URL instead
// (see prisma.config.ts).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === "production" ? 1 : 5,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
