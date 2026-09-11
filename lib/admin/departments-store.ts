import { db } from "@/lib/db";

export interface DepartmentRecord {
  id: string;
  name: string;
  isActive: boolean;
  memberIds: string[];
}

export async function getDepartments(): Promise<DepartmentRecord[]> {
  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    include: { members: { select: { profileId: true } } },
  });

  return departments.map((department) => ({
    id: department.id,
    name: department.name,
    isActive: department.isActive,
    memberIds: department.members.map((member) => member.profileId),
  }));
}

/** Нормалізація назви підрозділу для порівняння (пробіли, регістр). */
export function normalizeDepartmentNameKey(name: string): string {
  return name.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase("uk");
}

/** Знайти підрозділ за назвою з імпорту/форми (нечутливо до регістру й зайвих пробілів). */
export function findDepartmentByName<T extends { name: string }>(
  departments: T[],
  importedName: string,
): T | undefined {
  const key = normalizeDepartmentNameKey(importedName);
  if (!key || key === "—") return undefined;
  return departments.find((department) => normalizeDepartmentNameKey(department.name) === key);
}

export async function createDepartment(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const exists = await db.department.findFirst({
    where: { name: { equals: trimmedName, mode: "insensitive" } },
    select: { id: true },
  });
  if (exists) return;

  await db.department.create({ data: { name: trimmedName } });
}

export async function renameDepartment(
  departmentId: string,
  name: string,
): Promise<"ok" | "empty" | "not_found" | "duplicate" | "unchanged"> {
  const trimmedName = name.trim();
  if (!trimmedName) return "empty";

  const department = await db.department.findFirst({
    where: { id: departmentId },
    select: { id: true, name: true },
  });
  if (!department) return "not_found";
  if (department.name === trimmedName) return "unchanged";

  const exists = await db.department.findFirst({
    where: {
      name: { equals: trimmedName, mode: "insensitive" },
      NOT: { id: departmentId },
    },
    select: { id: true },
  });
  if (exists) return "duplicate";

  const previousName = department.name;
  await db.$transaction([
    db.department.update({
      where: { id: departmentId },
      data: { name: trimmedName },
    }),
    db.recommendation.updateMany({
      where: { sspUnit: previousName },
      data: { sspUnit: trimmedName },
    }),
  ]);

  return "ok";
}

export async function archiveDepartment(departmentId: string) {
  await db.department.updateMany({
    where: { id: departmentId },
    data: { isActive: false },
  });
}

export async function assignDepartmentMember(departmentId: string, profileId: string) {
  const department = await db.department.findFirst({
    where: { id: departmentId, isActive: true },
    select: { id: true },
  });
  if (!department) return;

  await db.departmentMember.upsert({
    where: { departmentId_profileId: { departmentId, profileId } },
    update: {},
    create: { departmentId, profileId },
  });
}

export async function removeDepartmentMember(departmentId: string, profileId: string) {
  await db.departmentMember.deleteMany({ where: { departmentId, profileId } });
}
