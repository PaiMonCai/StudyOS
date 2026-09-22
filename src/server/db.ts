import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/server/env";

const adapter = new PrismaMariaDb({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  connectionLimit: 5,
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function getDefaultUser() {
  return prisma.user.upsert({
    where: { email: env.DEFAULT_USER_EMAIL },
    update: { name: env.DEFAULT_USER_NAME },
    create: {
      email: env.DEFAULT_USER_EMAIL,
      name: env.DEFAULT_USER_NAME,
    },
  });
}
