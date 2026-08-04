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
