import type { RecommendationStatus, UserRole } from "@/lib/types";

export interface TransitionInput {
  currentStatus: RecommendationStatus;
  nextStatus: RecommendationStatus;
  role: UserRole;
  analystComment?: string | null;
  managerComment?: string | null;
}

const transitions: Record<RecommendationStatus, RecommendationStatus[]> = {
  draft: ["in_progress"],
  ssp_draft: ["manager_review", "in_progress"],
  in_progress: ["manager_review", "ssp_draft"],
  manager_review: ["on_review", "revision"],
  on_review: ["published", "revision"],
  revision: ["manager_review", "ssp_draft"],
  published: [],
};

export function canTransition({
  currentStatus,
  nextStatus,
  role,
  analystComment,
  managerComment,
}: TransitionInput): { ok: boolean; message?: string } {
  if (!transitions[currentStatus].includes(nextStatus)) {
    return { ok: false, message: "Недопустимий перехід статусу." };
  }

  if (currentStatus === "draft" && nextStatus === "in_progress" && role !== "editor") {
    return { ok: false, message: "Лише редактор може запустити виконання." };
  }

  if (currentStatus === "ssp_draft" && nextStatus === "in_progress" && role !== "editor") {
    return { ok: false, message: "Лише редактор може повернути рекомендацію до опрацювання." };
  }

  if (
    (currentStatus === "in_progress" || currentStatus === "ssp_draft") &&
    nextStatus === "manager_review" &&
    role !== "ssp" &&
    role !== "admin"
  ) {
    return { ok: false, message: "Лише ССП може подати на верифікацію." };
  }

  if (
    (currentStatus === "in_progress" || currentStatus === "revision") &&
    nextStatus === "ssp_draft" &&
    role !== "ssp" &&
    role !== "admin"
  ) {
    return {
      ok: false,
      message: "Лише відповідальний ССП може зберегти чернетку виконання.",
    };
  }

  if (
    currentStatus === "manager_review" &&
    nextStatus === "on_review" &&
    role !== "manager" &&
    role !== "admin"
  ) {
    return { ok: false, message: "Лише керівник може передати рекомендацію аналітику." };
  }

  if (
    currentStatus === "manager_review" &&
    nextStatus === "revision" &&
    role !== "manager" &&
    role !== "admin"
  ) {
    return { ok: false, message: "Лише керівник може повернути рекомендацію на доопрацювання." };
  }

  if (
    currentStatus === "manager_review" &&
    nextStatus === "revision" &&
    (!managerComment || managerComment.trim().length < 5)
  ) {
    return {
      ok: false,
      message: "Для повернення на доопрацювання обов'язковий коментар керівника.",
    };
  }

  if (
    currentStatus === "on_review" &&
    (nextStatus === "published" || nextStatus === "revision") &&
    role !== "analyst" &&
    role !== "admin"
  ) {
    return { ok: false, message: "Лише аналітик може завершити верифікацію." };
  }

  if (
    currentStatus === "on_review" &&
    nextStatus === "revision" &&
    (!analystComment || analystComment.trim().length < 5)
  ) {
    return {
      ok: false,
      message: "Для повернення на доопрацювання обов'язковий коментар аналітика.",
    };
  }

  if (
    currentStatus === "revision" &&
    nextStatus === "manager_review" &&
    role !== "ssp" &&
    role !== "admin"
  ) {
    return { ok: false, message: "Лише ССП може повторно подати на верифікацію." };
  }

  return { ok: true };
}
