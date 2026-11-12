import { editorWorkspaceStatusLabel } from "@/lib/editor/editor-workspace-status-label";
import { formatSupplementDay } from "@/lib/editor/recommendation-supplements";
import { normalizeObservationSignificance } from "@/lib/observation-significance";
import {
  resolveExecutionStatusLabel,
  type ExecutionCanonicalLabel,
} from "@/lib/recommendation-execution-status";
import type { RecommendationStatus } from "@/lib/types";

export type ViewSupplement = {
  id: string;
  fieldKey: string;
  content: string;
  previousContent: string | null;
  changeReason: string;
  changeDate: Date;
  createdAt: Date;
  authorName: string;
};

export type FieldEdition = {
  n: number;
  text: string;
  from: string;
  to: string | null;
  reason: string;
  current: boolean;
};

export type DateChange = {
  from: string;
  to: string;
  when: string;
  author: string;
  reason: string;
  current: boolean;
};

const VERSIONED_FIELDS = [
  "deficiency",
  "recommendationText",
  "executionIndicator",
  "expectedResult",
] as const;

export type VersionedFieldKey = (typeof VERSIONED_FIELDS)[number];

export const VERSIONED_FIELD_TITLES: Record<VersionedFieldKey, string> = {
  deficiency: "Недоліки, проблеми та порушення (точки зростання)",
  recommendationText: "Аудиторська рекомендація",
  executionIndicator: "Індикатор виконання",
  expectedResult: "Очікуваний результат",
};

const BANNER_FIELD_LABELS: Record<string, string> = {
  vkElement: "елемент ВК",
  observationSignificance: "значущість спостереження",
  deficiency: "недоліки, проблеми та порушення",
  recommendationText: "аудиторська рекомендація",
  executionIndicator: "індикатор виконання",
  expectedResult: "очікуваний результат",
  sspUnit: "відповідальний підрозділ",
  deadline: "термін виконання",
  informingDeadline: "строк інформування",
  changeReason: "причина зміни",
};

function compact(text: string | null | undefined): string {
  return (text ?? "").replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

export function ukCount(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  const word = n10 === 1 && n100 !== 11 ? one : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? few : many;
  return `${n} ${word}`;
}

export function buildFieldEditions(
  fieldKey: VersionedFieldKey,
  currentValue: string,
  supplements: ViewSupplement[],
  createdAt: Date,
): FieldEdition[] {
  const items = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
  const current = compact(currentValue) || "—";

  if (items.length === 0) {
    return [{ n: 1, text: current, from: formatSupplementDay(createdAt), to: null, reason: "", current: true }];
  }

  const editions: FieldEdition[] = [];
  const initial = compact(items[0].previousContent);
  if (initial) {
    const startsBeforeChange = createdAt.getTime() <= items[0].changeDate.getTime();
    editions.push({
      n: 1,
      text: initial,
      from: startsBeforeChange ? formatSupplementDay(createdAt) : "",
      to: formatSupplementDay(items[0].changeDate),
      reason: "первинна редакція",
      current: false,
    });
  }

  items.forEach((item, index) => {
    const previous = compact(item.previousContent);
    const chunk = compact(item.content);
    const snapshot = previous && chunk ? `${previous}\n\n${chunk}` : chunk || previous || "—";
    const next = items[index + 1];
    editions.push({
      n: editions.length + 1,
      text: snapshot,
      from: formatSupplementDay(item.changeDate),
      to: next ? formatSupplementDay(next.changeDate) : null,
      reason: compact(item.changeReason) || "—",
      current: !next,
    });
  });

  const last = editions[editions.length - 1];
  if (last) {
    last.current = true;
    last.to = null;
    last.text = current;
  }
  editions.forEach((edition, index) => {
    edition.current = index === editions.length - 1;
  });
  return editions;
}

export function editionOptionLabel(edition: FieldEdition): string {
  if (edition.current) return `Редакція ${edition.n} — чинна, з ${edition.from}`;
  if (!edition.from) return `Редакція ${edition.n} — до ${edition.to ?? ""}`;
  return `Редакція ${edition.n} — ${edition.from}–${edition.to ?? edition.from}`;
}

export function buildDateChanges(supplements: ViewSupplement[], fieldKey: "deadline" | "informingDeadline"): DateChange[] {
  const items = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
  return items.map((item, index) => ({
    from: formatSupplementDay(compact(item.previousContent) || "—"),
    to: formatSupplementDay(compact(item.content) || "—"),
    when: formatSupplementDay(item.changeDate),
    author: item.authorName.trim() || "—",
    reason: compact(item.changeReason) || "—",
    current: index === items.length - 1,
  }));
}

export function initialDateValue(supplements: ViewSupplement[], fieldKey: "deadline" | "informingDeadline"): string {
  const items = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime());
  const initial = compact(items[0]?.previousContent);
  return initial ? formatSupplementDay(initial) : "";
}

export function buildChangeBanner(supplements: ViewSupplement[]): {
  date: string;
  author: string;
  fields: string;
  reason: string;
} | null {
  if (supplements.length === 0) return null;
  const latest = [...supplements].sort(
    (a, b) => b.changeDate.getTime() - a.changeDate.getTime() || b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  const group = supplements.filter((item) => item.changeDate.getTime() === latest.changeDate.getTime());
  const fields = [...new Set(group.map((item) => BANNER_FIELD_LABELS[item.fieldKey] ?? item.fieldKey))];
  const reasons = [...new Set(group.map((item) => compact(item.changeReason)).filter(Boolean))];
  return {
    date: formatSupplementDay(latest.changeDate),
    author: latest.authorName.trim() || "—",
    fields: fields.join(", "),
    reason: reasons.join("; ") || "—",
  };
}

export function statusTileClass(status: RecommendationStatus): string {
  if (status === "revision") return "border-[#aa0600] bg-[#ffcaca] text-[#aa0600]";
  if (status === "in_progress") return "border-[#0069aa] bg-[#dbeffc]";
  if (status === "manager_review" || status === "on_review") return "border-[#c2a637] bg-[#fff4ca]";
  if (status === "published") return "border-[#1e6b35] bg-[#dcf3e2]";
  return "border-[#9a9a9a] bg-[#f0f0f0]";
}

export function statusLabel(status: RecommendationStatus): string {
  return editorWorkspaceStatusLabel(status);
}

export function significanceLevel(raw: string | null | undefined): number {
  const value = normalizeObservationSignificance(raw);
  if (value === "низька") return 1;
  if (value === "середня") return 2;
  if (value === "висока") return 3;
  if (value === "критична") return 4;
  return 0;
}

export function executionTileClass(label: ExecutionCanonicalLabel): string {
  if (label === "Виконано повністю") return "border-[#1e6b35] bg-[#dcf3e2]";
  if (label === "Виконано частково") return "border-[#c2a637] bg-[#fff4ca]";
  if (label === "Не виконано") return "border-[#aa0600] bg-[#ffcaca]";
  return "border-[#d9d9d9] bg-white";
}

export function executionLabel(progressReport: string | null | undefined): string {
  const canonical = resolveExecutionStatusLabel(progressReport);
  if (canonical !== "—") return canonical;
  return compact(progressReport) || "—";
}
