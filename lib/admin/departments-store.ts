import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const STORE_PATH = path.join(process.cwd(), "prisma", "departments.json");

export interface DepartmentRecord {
  id: string;
  name: string;
  isActive: boolean;
  memberIds: string[];
}

interface DepartmentStore {
  departments: DepartmentRecord[];
}

async function readStore(): Promise<DepartmentStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as DepartmentStore;
    return parsed?.departments ? parsed : { departments: [] };
  } catch {
    return { departments: [] };
  }
}

async function writeStore(data: DepartmentStore) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function getDepartments() {
  const data = await readStore();
  return data.departments;
}

export async function createDepartment(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const data = await readStore();
  const exists = data.departments.some(
    (item) => item.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  if (exists) return;

  data.departments.push({
    id: crypto.randomUUID(),
    name: trimmedName,
    isActive: true,
    memberIds: [],
  });
  await writeStore(data);
}

export async function archiveDepartment(departmentId: string) {
  const data = await readStore();
  const department = data.departments.find((item) => item.id === departmentId);
  if (!department) return;
  department.isActive = false;
  await writeStore(data);
}

export async function assignDepartmentMember(departmentId: string, profileId: string) {
  const data = await readStore();
  const department = data.departments.find((item) => item.id === departmentId && item.isActive);
  if (!department) return;
  if (!department.memberIds.includes(profileId)) {
    department.memberIds.push(profileId);
    await writeStore(data);
  }
}

export async function removeDepartmentMember(departmentId: string, profileId: string) {
  const data = await readStore();
  const department = data.departments.find((item) => item.id === departmentId);
  if (!department) return;
  department.memberIds = department.memberIds.filter((id) => id !== profileId);
  await writeStore(data);
}
