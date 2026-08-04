import { uk } from "@/lib/i18n/uk";
import type { RecommendationStatus } from "@/lib/types";

/** Підписи статусів у просторах керівника та аналітика (колір бейджа не змінюється). */
export function verificationWorkspaceStatusLabel(status: RecommendationStatus): string {
  if (status === "manager_review" || status === "on_review") {
    return "На верифікації";
  }
  return uk.status[status];
}
