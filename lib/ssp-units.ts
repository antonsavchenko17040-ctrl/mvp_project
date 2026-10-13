import type { Prisma } from "@prisma/client";

import { findDepartmentByName } from "@/lib/admin/departments-store";

/** Роздільник кількох відповідальних ССП у полі `sspUnit`. */
export const SSP_UNIT_SEPARATOR = " | ";

/** Розбити збережене значення на окремі назви підрозділів. */
export function parseSspUnits(value: string | null | undefined): string[] {
  const raw = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
  if (!raw || raw === "—") return [];

  const parts = raw.includes(SSP_UNIT_SEPARATOR.trim())
    ? raw.split(/\s*\|\s*/)
    : [raw];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const name = part.replace(/\s+/g, " ").trim();
    if (!name || name === "—" || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

/** Канонічний рядок для збереження (відсортовано, роздільник ` | `). */
export function formatSspUnits(names: string[]): string {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of names) {
    const name = String(raw ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!name || name === "—" || seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  unique.sort((a, b) => a.localeCompare(b, "uk"));
  return unique.join(SSP_UNIT_SEPARATOR);
}

/** Повний текст для UI: кожна назва ССП з нового рядка. */
export function formatSspUnitsMultiline(value: string | null | undefined): string {
  return parseSspUnits(value).join("\n");
}

/** Чи рекомендація призначена хоча б одному з підрозділів користувача. */
export function recommendationMatchesSspDepartments(
  sspUnit: string | null | undefined,
  departmentNames: string[],
): boolean {
  if (departmentNames.length === 0) return false;
  const assigned = parseSspUnits(sspUnit);
  if (assigned.length === 0) return false;
  const allowed = new Set(departmentNames);
  return assigned.some((name) => allowed.has(name));
}

/** Чи входить підрозділ до списку відповідальних у `sspUnit`. */
export function sspUnitIncludesDepartment(
  sspUnit: string | null | undefined,
  departmentName: string,
): boolean {
  const target = departmentName.replace(/\s+/g, " ").trim();
  if (!target) return false;
  return parseSspUnits(sspUnit).some((name) => name === target);
}

/**
 * Prisma-умова: рекомендація призначена хоча б одному з підрозділів.
 * Підтримує одне значення та список «A | B | C» (будь-яка позиція).
 * Точну відповідність токенів додатково перевіряйте через `recommendationMatchesSspDepartments`.
 */
export function sspUnitVisibilityWhere(
  departmentNames: string[],
): Prisma.RecommendationWhereInput {
  if (departmentNames.length === 0) {
    return { id: { in: [] } };
  }

  return {
    OR: departmentNames.flatMap((name) => [
      { sspUnit: name },
      { sspUnit: { startsWith: `${name}${SSP_UNIT_SEPARATOR}` } },
      { sspUnit: { endsWith: `${SSP_UNIT_SEPARATOR}${name}` } },
      { sspUnit: { contains: `${SSP_UNIT_SEPARATOR}${name}${SSP_UNIT_SEPARATOR}` } },
      // Запасний варіант, якщо в збереженому рядку трохи інші пробіли навколо `|`.
      { sspUnit: { contains: `| ${name} |` } },
      { sspUnit: { contains: `|${name}|` } },
      { sspUnit: { startsWith: `${name} |` } },
      { sspUnit: { endsWith: `| ${name}` } },
    ]),
  };
}

/**
 * Зчитати вибрані ССП з форми (`ssp_unit` checkbox/select multiple),
 * зіставити з активними підрозділами й повернути канонічний рядок.
 * `null` — нічого не вибрано або є невідома назва.
 */
export function resolveSspUnitsFromForm(
  formData: FormData,
  activeDepartments: { name: string }[],
  fieldName = "ssp_unit",
): string | null {
  const rawValues = formData
    .getAll(fieldName)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (rawValues.length === 0) return null;

  const resolved: string[] = [];
  for (const value of rawValues) {
    // Уже збережений multi-рядок (приховані поля тощо) — розгортаємо.
    const tokens = parseSspUnits(value);
    const names = tokens.length > 0 ? tokens : [value];
    for (const token of names) {
      const matched = findDepartmentByName(activeDepartments, token);
      if (!matched) return null;
      if (!resolved.includes(matched.name)) resolved.push(matched.name);
    }
  }

  if (resolved.length === 0) return null;
  return formatSspUnits(resolved);
}

/** Звести довільний рядок (імпорт / доповнення) до канонічних назв. */
export function resolveSspUnitsFromNames(
  names: string[],
  activeDepartments: { name: string }[],
): string | null {
  const resolved: string[] = [];
  for (const name of names) {
    const matched = findDepartmentByName(activeDepartments, name);
    if (!matched) return null;
    if (!resolved.includes(matched.name)) resolved.push(matched.name);
  }
  if (resolved.length === 0) return null;
  return formatSspUnits(resolved);
}

/** Замінити назву підрозділу всередині multi-рядка `sspUnit`. */
export function renameSspUnitToken(
  sspUnit: string,
  previousName: string,
  nextName: string,
): string {
  const units = parseSspUnits(sspUnit).map((name) =>
    name === previousName ? nextName : name,
  );
  return formatSspUnits(units);
}
