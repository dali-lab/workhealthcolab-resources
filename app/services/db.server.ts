import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~/generated/prisma/client";

// One client, reused across requests and across dev-server reloads.
const globalForDb = globalThis as typeof globalThis & { __prisma?: PrismaClient };

export const prisma =
  globalForDb.__prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalForDb.__prisma = prisma;
