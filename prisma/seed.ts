import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { backfillAllRecommendationSequenceNumbers } from "../lib/recommendation-sequence";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "TempPass#2026";

async function upsertUser(email: string, roles: UserRole[], fullName: string) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return prisma.profile.upsert({
    where: { email },
    update: {
      fullName,
      isActive: true,
      mustChangePassword: true,
      passwordHash,
      roles: {
        deleteMany: {},
        create: roles.map((role) => ({ role })),
      },
    },
    create: {
      email,
      fullName,
      isActive: true,
      mustChangePassword: true,
      passwordHash,
      roles: {
        create: roles.map((role) => ({ role })),
      },
    },
  });
}

async function main() {
  await upsertUser("admin@e-nazk", ["admin"], "Перший адміністратор");
  await upsertUser("editor@e-nazk", ["editor"], "Редактор MVP");
  await upsertUser("ssp@e-nazk", ["ssp"], "Відповідальна особа ССП");
  await upsertUser("manager@e-nazk", ["manager"], "Керівник MVP");
  await upsertUser("analyst@e-nazk", ["analyst"], "Аналітик MVP");
  await backfillAllRecommendationSequenceNumbers();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
