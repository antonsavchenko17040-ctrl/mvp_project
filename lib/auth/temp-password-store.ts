import { db } from "@/lib/db";

type TempPasswordMap = Record<string, string>;

export async function getTempPasswords(): Promise<TempPasswordMap> {
  const rows = await db.tempPassword.findMany({
    select: { profileId: true, password: true },
  });
  return Object.fromEntries(rows.map((row) => [row.profileId, row.password]));
}

export async function setTempPassword(userId: string, password: string) {
  await db.tempPassword.upsert({
    where: { profileId: userId },
    update: { password },
    create: { profileId: userId, password },
  });
}

export async function clearTempPassword(userId: string) {
  await db.tempPassword.deleteMany({ where: { profileId: userId } });
}
