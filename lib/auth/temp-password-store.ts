import { promises as fs } from "node:fs";
import path from "node:path";

const STORE_PATH = path.join(process.cwd(), "prisma", "temp-passwords.json");

type TempPasswordMap = Record<string, string>;

async function readStore(): Promise<TempPasswordMap> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as TempPasswordMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writeStore(data: TempPasswordMap) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function getTempPasswords() {
  return readStore();
}

export async function setTempPassword(userId: string, password: string) {
  const data = await readStore();
  data[userId] = password;
  await writeStore(data);
}

export async function clearTempPassword(userId: string) {
  const data = await readStore();
  if (userId in data) {
    delete data[userId];
    await writeStore(data);
  }
}
