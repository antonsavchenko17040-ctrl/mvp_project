import {
  isAppendFieldKey,
  isReplaceFieldKey,
  isSupplementFieldKey,
  SUPPLEMENT_FIELD_LABELS,
  type SupplementFieldKey,
} from "@/lib/editor/recommendation-supplements";
import {
  formatSspStoredDate,
  isSspAppendFieldKey,
  isSspReplaceFieldKey,
  isSspSupplementFieldKey,
  isValidSspProgressReport,
  SSP_SUPPLEMENT_FIELD_LABELS,
  type SspSupplementFieldKey,
} from "@/lib/ssp/recommendation-supplements";

export type AdminSupplementFieldKey = SupplementFieldKey | SspSupplementFieldKey;

export function isAdminSupplementFieldKey(key: string): key is AdminSupplementFieldKey {
  return isSupplementFieldKey(key) || isSspSupplementFieldKey(key);
}

export function isAdminAppendFieldKey(key: string): boolean {
  return isAppendFieldKey(key) || isSspAppendFieldKey(key);
}

export function isAdminReplaceFieldKey(key: string): boolean {
  return isReplaceFieldKey(key) || isSspReplaceFieldKey(key);
}

export function adminSupplementFieldLabel(key: AdminSupplementFieldKey): string {
  if (isSupplementFieldKey(key)) return SUPPLEMENT_FIELD_LABELS[key];
  return SSP_SUPPLEMENT_FIELD_LABELS[key];
}

export function formatStoredDateValue(value: Date | null | undefined): string {
  return formatSspStoredDate(value);
}

export type SupplementRecord = {
  id: string;
  fieldKey: string;
  content: string;
  previousContent: string;
  changeReason: string;
  changeDate: Date;
};

/** Зібрати актуальне значення append-поля з історії доповнень. */
export function rebuildAppendFieldValue(items: SupplementRecord[]): string {
  if (items.length === 0) return "";
  let merged = (items[0].previousContent ?? "").trim();
  for (const item of items) {
    const chunk = item.content.trim();
    if (!chunk) continue;
    merged = merged ? `${merged}\n\n${chunk}` : chunk;
  }
  return merged;
}

/** Актуальне значення replace-поля = останнє доповнення (або previous, якщо історія порожня). */
export function rebuildReplaceFieldValue(items: SupplementRecord[]): string {
  if (items.length === 0) return "";
  return items[items.length - 1].content.trim();
}

export function recommendationFieldUpdateFromSupplementValue(
  fieldKey: AdminSupplementFieldKey,
  value: string,
  departments: { name: string }[],
): { data?: Record<string, unknown>; error?: string } {
  if (isAdminAppendFieldKey(fieldKey)) {
    if (fieldKey === "changeReason") {
      return { data: { changeReason: value || null } };
    }
    return { data: { [fieldKey]: value || null } };
  }

  if (fieldKey === "observationSignificance") {
    return { data: { observationSignificance: value } };
  }
  if (fieldKey === "sspUnit") {
    if (!departments.some((d) => d.name === value)) {
      return { error: "invalid_department" };
    }
    return { data: { sspUnit: value } };
  }
  if (fieldKey === "deadline") {
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return { error: "invalid_deadline" };
    return { data: { deadline: next } };
  }
  if (fieldKey === "informingDeadline") {
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return { error: "invalid_informing_deadline" };
    return { data: { informingDeadline: next } };
  }
  if (fieldKey === "progressReport") {
    if (value && !isValidSspProgressReport(value)) return { error: "invalid_progress_report" };
    return { data: { progressReport: value || null } };
  }
  if (fieldKey === "actualImplementationDate") {
    if (!value) return { data: { actualImplementationDate: null } };
    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return { error: "invalid_implementation_date" };
    return { data: { actualImplementationDate: next } };
  }

  return { error: "invalid_field" };
}

export function readRecommendationFieldRaw(
  recommendation: Record<string, unknown>,
  fieldKey: AdminSupplementFieldKey,
): string {
  if (fieldKey === "deadline") {
    return formatStoredDateValue(recommendation.deadline as Date | null | undefined);
  }
  if (fieldKey === "informingDeadline") {
    return formatStoredDateValue(recommendation.informingDeadline as Date | null | undefined) || "—";
  }
  if (fieldKey === "actualImplementationDate") {
    return formatStoredDateValue(recommendation.actualImplementationDate as Date | null | undefined);
  }
  const raw = recommendation[fieldKey];
  if (raw == null) return "";
  if (raw instanceof Date) return formatStoredDateValue(raw);
  return String(raw);
}
