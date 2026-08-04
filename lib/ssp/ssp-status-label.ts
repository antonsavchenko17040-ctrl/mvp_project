import { uk } from "@/lib/i18n/uk";
import type { RecommendationStatus } from "@/lib/types";

type SspStatusLabelInput = {
  status: RecommendationStatus;
  analystComment?: string | null;
  managerComment?: string | null;
};

/** Підписи статусів у просторі відповідального (колір бейджа не змінюється). */
export function sspWorkspaceStatusLabel({
  status,
  analystComment,
  managerComment,
}: SspStatusLabelInput): string {
  if (status === "in_progress") {
    return "Виконати";
  }

  if (status === "manager_review" || status === "on_review") {
    return "На верифікації";
  }

  if (status === "revision") {
    if (analystComment?.trim() || managerComment?.trim()) {
      return "Доопрацювати";
    }
    return uk.status.revision;
  }

  if (status === "published") {
    return "Виконано";
  }

  return uk.status[status];
}
