import type { RecommendationStatus } from "@/lib/types";

/** Спільний фільтр статусу для ССП / керівника / аналітика. */
export const ROLE_WORKSPACE_STATUS_FILTERS = [
  { key: "all", label: "Усі" },
  { key: "in_progress", label: "Виконати" },
  { key: "on_review", label: "На верифікації" },
  { key: "revision", label: "Доопрацювати" },
  { key: "ssp_draft", label: "Чернетка" },
  { key: "published", label: "Виконано" },
] as const;

export type RoleWorkspaceStatusFilterKey = (typeof ROLE_WORKSPACE_STATUS_FILTERS)[number]["key"];

/** Спільний фільтр терміну (ті самі `deadline` ключі: blue/yellow/red). */
export const ROLE_WORKSPACE_DEADLINE_FILTERS = [
  { key: "all", label: "Усі терміни" },
  { key: "blue", label: "8–30 днів" },
  { key: "yellow", label: "4–7 днів" },
  { key: "red", label: "1–3 дні" },
] as const;

export type RoleWorkspaceDeadlineFilterKey = (typeof ROLE_WORKSPACE_DEADLINE_FILTERS)[number]["key"];

export function parseRoleWorkspaceStatusFilter(
  raw: string | undefined,
): RoleWorkspaceStatusFilterKey {
  // Старий ключ керівника для «На верифікації».
  if (raw === "manager_review") return "on_review";
  return ROLE_WORKSPACE_STATUS_FILTERS.some((item) => item.key === raw)
    ? (raw as RoleWorkspaceStatusFilterKey)
    : "all";
}

export function parseRoleWorkspaceDeadlineFilter(
  raw: string | undefined,
): RoleWorkspaceDeadlineFilterKey {
  return ROLE_WORKSPACE_DEADLINE_FILTERS.some((item) => item.key === raw)
    ? (raw as RoleWorkspaceDeadlineFilterKey)
    : "all";
}

/** Умова статусу для простору відповідального (разом із visibilityWhere). */
export function sspStatusFilterCondition(
  filter: RoleWorkspaceStatusFilterKey,
): { status: RecommendationStatus | { in: RecommendationStatus[] } } | null {
  if (filter === "all") return null;
  if (filter === "on_review") {
    return { status: { in: ["manager_review", "on_review"] } };
  }
  return { status: filter as RecommendationStatus };
}

/** Умова статусу для простору керівника. */
export function managerStatusFilterWhere(
  filter: RoleWorkspaceStatusFilterKey,
): { status: RecommendationStatus | { in: RecommendationStatus[] } } {
  if (filter === "all") {
    return { status: { in: ["manager_review", "revision"] } };
  }
  // «На верифікації» у керівника — статус manager_review.
  if (filter === "on_review") {
    return { status: "manager_review" };
  }
  return { status: filter as RecommendationStatus };
}

/** Умова статусу для простору аналітика. */
export function analystStatusFilterWhere(
  filter: RoleWorkspaceStatusFilterKey,
): { status: RecommendationStatus | { in: RecommendationStatus[] } } {
  if (filter === "all") {
    return { status: { in: ["on_review", "revision"] } };
  }
  return { status: filter as RecommendationStatus };
}
