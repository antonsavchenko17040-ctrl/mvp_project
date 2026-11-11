import {
  buildAppendFieldDisplayContent,
  formatSupplementDay,
  type SupplementHistoryItem,
} from "@/lib/editor/recommendation-supplements";
import { uk } from "@/lib/i18n/uk";
import type { RecommendationStatus } from "@/lib/types";

export type RecommendationSibling = {
  id: string;
  sequenceNumber: number;
  title: string;
  status: string;
  statusLabel: string;
  significance: string;
  sspUnit: string;
  href: string;
  current?: boolean;
};

export type FieldRevision = {
  n: number;
  fromLabel: string;
  toLabel: string | null;
  reason: string;
  text: string;
  current: boolean;
};

const TEXT_FIELDS = [
  { key: "deficiency", label: "Недоліки, проблеми та порушення (точки зростання)" },
  { key: "recommendationText", label: "Аудиторська рекомендація" },
  { key: "executionIndicator", label: "Індикатор виконання" },
  { key: "expectedResult", label: "Очікуваний результат" },
] as const;

export function statusTone(status: string): string {
  switch (status) {
    case "draft":
    case "ssp_draft":
      return "draft";
    case "in_progress":
      return "progress";
    case "revision":
      return "revision";
    case "manager_review":
      return "approval";
    case "on_review":
      return "verify";
    case "published":
      return "done";
    default:
      return "draft";
  }
}

export function statusLabel(status: string): string {
  if (status in uk.status) return uk.status[status as RecommendationStatus];
  return status;
}

function formatDay(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function buildFieldRevisions(
  fieldKey: (typeof TEXT_FIELDS)[number]["key"],
  currentValue: string,
  supplements: SupplementHistoryItem[],
): FieldRevision[] {
  const built = buildAppendFieldDisplayContent(fieldKey, currentValue, supplements);
  if (!built || ( !built.base && built.supplements.length === 0)) {
    return [
      {
        n: 1,
        fromLabel: "",
        toLabel: null,
        reason: "",
        text: currentValue.trim() || "—",
        current: true,
      },
    ];
  }

  const versions: FieldRevision[] = [];
  if (built.base) {
    versions.push({
      n: 1,
      fromLabel: "",
      toLabel: built.supplements[0]?.changeDateLabel ?? null,
      reason: "початкове значення",
      text: built.base,
      current: built.supplements.length === 0,
    });
  }
  built.supplements.forEach((item, index) => {
    const n = versions.length + 1;
    const isLast = index === built.supplements.length - 1;
    versions.push({
      n,
      fromLabel: item.changeDateLabel,
      toLabel: isLast ? null : built.supplements[index + 1]?.changeDateLabel ?? null,
      reason: item.changeReason,
      text: item.chunk,
      current: isLast,
    });
  });
  if (versions.length === 0) {
    versions.push({
      n: 1,
      fromLabel: "",
      toLabel: null,
      reason: "",
      text: currentValue.trim() || "—",
      current: true,
    });
  }
  return versions;
}

export function buildDateHistory(
  fieldKey: "deadline" | "informingDeadline",
  current: Date | null | undefined,
  supplements: SupplementHistoryItem[],
) {
  const items = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime());
  const currentLabel = formatDay(current);
  if (items.length === 0) {
    return { count: 0, initial: currentLabel, entries: [] as Array<{ from: string; to: string; when: string; reason: string; current: boolean }> };
  }
  const initial = (items[0].previousContent ?? "").trim()
    ? formatSupplementDay(items[0].previousContent ?? "")
    : currentLabel;
  const entries = items.map((item, index) => ({
    from: (item.previousContent ?? "").trim() ? formatSupplementDay(item.previousContent ?? "") : "—",
    to: formatSupplementDay(item.content),
    when: formatSupplementDay(item.changeDate),
    reason: (item.changeReason ?? "").trim() || "—",
    current: index === items.length - 1,
  }));
  return { count: entries.length, initial, entries };
}

export const DESIGN_TEXT_FIELDS = TEXT_FIELDS;

export function designContentFromRecommendation(
  recommendation: {
    deficiency: string;
    recommendationText: string;
    executionIndicator: string;
    expectedResult: string;
    deadline: Date | null;
    informingDeadline: Date | null;
  },
  supplements: SupplementHistoryItem[],
) {
  const fields = DESIGN_TEXT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    revisions: buildFieldRevisions(field.key, recommendation[field.key] ?? "", supplements),
  }));
  const deadlineHistory = buildDateHistory("deadline", recommendation.deadline, supplements);
  const informingHistory = buildDateHistory("informingDeadline", recommendation.informingDeadline, supplements);
  const latest = [...supplements].sort((a, b) => b.changeDate.getTime() - a.changeDate.getTime())[0];
  const changeBanner = latest
    ? {
        title: "Рекомендацію змінено",
        meta: formatSupplementDay(latest.changeDate),
        text: (latest.changeReason ?? "").trim() || "Збережено нову редакцію.",
      }
    : null;
  return { fields, deadlineHistory, informingHistory, changeBanner };
}

export function daysUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}
