import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "127.0.0.1",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "studyos",
  password: process.env.DATABASE_PASSWORD ?? "studyos",
  database: process.env.DATABASE_NAME ?? "studyos",
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function getDefaultUser() {
  const email = process.env.DEFAULT_USER_EMAIL ?? "dev@studyos.local";
  const name = process.env.DEFAULT_USER_NAME ?? "StudyOS Learner";

  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });
}
