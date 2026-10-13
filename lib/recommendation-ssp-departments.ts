import type { Prisma, PrismaClient } from "@prisma/client";

import { findDepartmentByName } from "@/lib/admin/departments-store";
import { formatSspUnits, parseSspUnits, resolveSspUnitsFromForm } from "@/lib/ssp-units";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type ResolvedSspAssignment = {
  ids: string[];
  names: string[];
  sspUnit: string;
};

/** Зчитати вибрані departmentId з форми (JSON hidden + checkbox fallback). */
export function readDepartmentIdsFromForm(
  formData: FormData,
  fieldName = "ssp_department_ids",
): string[] {
  const jsonRaw = String(formData.get(fieldName) ?? "").trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as unknown;
      if (Array.isArray(parsed)) {
        return [
          ...new Set(
            parsed
              .map((value) => String(value ?? "").trim())
              .filter(Boolean),
          ),
        ];
      }
    } catch {
      // fall through to checkbox-style fields
    }
  }

  return [
    ...new Set(
      formData
        .getAll("ssp_department_id")
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * Погодити departmentId зі списком активних підрозділів.
 * Повертає null, якщо список порожній або є невідомий id.
 */
export function resolveDepartmentsByIds(
  departmentIds: string[],
  activeDepartments: { id: string; name: string }[],
): ResolvedSspAssignment | null {
  if (departmentIds.length === 0) return null;
  const byId = new Map(activeDepartments.map((department) => [department.id, department]));
  const resolved: { id: string; name: string }[] = [];
  for (const id of departmentIds) {
    const department = byId.get(id);
    if (!department) return null;
    if (!resolved.some((item) => item.id === department.id)) {
      resolved.push(department);
    }
  }
  if (resolved.length === 0) return null;
  const names = resolved.map((item) => item.name);
  return {
    ids: resolved.map((item) => item.id),
    names,
    sspUnit: formatSspUnits(names),
  };
}

/** Резолв з назв (імпорт / legacy form ssp_unit). */
export function resolveDepartmentsByNames(
  names: string[],
  activeDepartments: { id: string; name: string }[],
): ResolvedSspAssignment | null {
  const tokens = names.flatMap((name) => {
    const parsed = parseSspUnits(name);
    return parsed.length > 0 ? parsed : [name];
  });
  const resolved: { id: string; name: string }[] = [];
  for (const token of tokens) {
    const matched = findDepartmentByName(activeDepartments, token);
    if (!matched) return null;
    if (!resolved.some((item) => item.id === matched.id)) {
      resolved.push({ id: matched.id, name: matched.name });
    }
  }
  if (resolved.length === 0) return null;
  const canonicalNames = resolved.map((item) => item.name);
  return {
    ids: resolved.map((item) => item.id),
    names: canonicalNames,
    sspUnit: formatSspUnits(canonicalNames),
  };
}

/**
 * Джерело істини з форми: JSON department ids (`ssp_department_ids` / `content`),
 * інакше legacy checkbox-назви (`ssp_unit`).
 */
export function resolveSspAssignmentFromForm(
  formData: FormData,
  activeDepartments: { id: string; name: string }[],
  options?: { idField?: string; nameField?: string },
): ResolvedSspAssignment | null {
  const idField = options?.idField ?? "ssp_department_ids";
  const nameField = options?.nameField ?? "ssp_unit";

  const fromIds = readDepartmentIdsFromForm(formData, idField);
  if (fromIds.length > 0) {
    return resolveDepartmentsByIds(fromIds, activeDepartments);
  }

  // Форми, що ще передають JSON ids у полі ssp_unit / content.
  if (nameField !== idField) {
    const fromNameFieldIds = readDepartmentIdsFromForm(formData, nameField);
    if (fromNameFieldIds.length > 0) {
      return resolveDepartmentsByIds(fromNameFieldIds, activeDepartments);
    }
  }

  const sspUnit = resolveSspUnitsFromForm(formData, activeDepartments, nameField);
  if (!sspUnit) return null;
  return resolveDepartmentsByNames(parseSspUnits(sspUnit), activeDepartments);
}

/** Повна заміна набору відповідальних ССП + оновлення денормалізованого sspUnit. */
export async function syncRecommendationSspDepartments(
  db: DbClient,
  recommendationId: string,
  departmentIds: string[],
  sspUnitDisplay: string,
): Promise<void> {
  const uniqueIds = [...new Set(departmentIds.filter(Boolean))];
  await db.recommendationSspDepartment.deleteMany({ where: { recommendationId } });
  if (uniqueIds.length > 0) {
    await db.recommendationSspDepartment.createMany({
      data: uniqueIds.map((departmentId) => ({ recommendationId, departmentId })),
      skipDuplicates: true,
    });
  }
  await db.recommendation.update({
    where: { id: recommendationId },
    data: { sspUnit: sspUnitDisplay },
  });
}

/** Prisma-умова видимості для ССП за membership departmentId (+ legacy sspUnit fallback). */
export function sspDepartmentsVisibilityWhere(
  departmentIds: string[],
  departmentNames: string[],
): Prisma.RecommendationWhereInput {
  const byRelation =
    departmentIds.length > 0
      ? {
          sspDepartments: {
            some: { departmentId: { in: departmentIds } },
          },
        }
      : null;

  // Legacy rows without join rows: match denormalized sspUnit tokens exactly via OR of equals
  // after we also keep string helpers for transitional data.
  const legacyNameOr =
    departmentNames.length > 0
      ? {
          AND: [
            { sspDepartments: { none: {} } },
            {
              OR: departmentNames.flatMap((name) => [
                { sspUnit: name },
                { sspUnit: { startsWith: `${name} | ` } },
                { sspUnit: { endsWith: ` | ${name}` } },
                { sspUnit: { contains: ` | ${name} | ` } },
              ]),
            },
          ],
        }
      : null;

  const branches = [byRelation, legacyNameOr].filter(Boolean) as Prisma.RecommendationWhereInput[];
  if (branches.length === 0) return { id: { in: [] } };
  if (branches.length === 1) return branches[0];
  return { OR: branches };
}
