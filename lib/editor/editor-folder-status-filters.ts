import type { RecommendationStatus } from "@/lib/types";

/** Фільтр етапу виконання в таблиці папки редактора (dropdown у шапці колонки). */
export const EDITOR_FOLDER_STATUS_FILTERS = [
  { key: "all", label: "Етап виконання" },
  { key: "draft", label: "Чернетка" },
  { key: "published", label: "Виконано" },
  { key: "on_review", label: "На верифікації" },
  { key: "in_progress", label: "На виконанні" },
  { key: "revision", label: "На доопрацюванні" },
] as const;

export type EditorFolderStatusFilterKey = (typeof EDITOR_FOLDER_STATUS_FILTERS)[number]["key"];

export function parseEditorFolderStatusFilter(
  raw: string | undefined,
): EditorFolderStatusFilterKey {
  return EDITOR_FOLDER_STATUS_FILTERS.some((item) => item.key === raw)
    ? (raw as EditorFolderStatusFilterKey)
    : "all";
}

/** Prisma-умова статусу для списку рекомендацій у папці редактора. */
export function editorFolderStatusWhere(
  filter: EditorFolderStatusFilterKey,
): { status: RecommendationStatus | { in: RecommendationStatus[] } | { not: RecommendationStatus } } {
  if (filter === "all") {
    return { status: { not: "ssp_draft" } };
  }
  if (filter === "on_review") {
    return { status: { in: ["manager_review", "on_review"] } };
  }
  return { status: filter };
}
