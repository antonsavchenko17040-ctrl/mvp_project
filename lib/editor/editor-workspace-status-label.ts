import { uk } from "@/lib/i18n/uk";
import type { RecommendationStatus } from "@/lib/types";

/** Підписи статусів у робочому просторі редактора (колір бейджа не змінюється). */
export function editorWorkspaceStatusLabel(status: RecommendationStatus): string {
  if (status === "manager_review" || status === "on_review") {
    return "На верифікації";
  }
  if (status === "published") {
    return "Виконано";
  }
  return uk.status[status];
}
