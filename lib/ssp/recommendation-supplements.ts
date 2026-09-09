import { SSP_PROGRESS_REPORT_OPTIONS } from "@/lib/recommendation-execution-status";

export const SSP_SUPPLEMENT_FIELD_KEYS = [
  "progressReport",
  "measuresDescription",
  "actualImplementationDate",
  "expectedAchievement",
  "supportingDocuments",
  "sspNotes",
] as const;

export type SspSupplementFieldKey = (typeof SSP_SUPPLEMENT_FIELD_KEYS)[number];

export const SSP_SUPPLEMENT_FIELD_LABELS: Record<SspSupplementFieldKey, string> = {
  progressReport: "Стан впровадження рекомендацій",
  measuresDescription: "Заходи з впровадження рекомендацій",
  actualImplementationDate: "Фактична дата впровадження",
  expectedAchievement: "Досягнення очікуваного",
  supportingDocuments: "Підтверджуючі документи",
  sspNotes: "Примітки",
};

/** Текстові поля ССП: доповнення додається до поточного значення. */
export const SSP_APPEND_FIELD_KEYS = [
  "measuresDescription",
  "expectedAchievement",
  "supportingDocuments",
  "sspNotes",
] as const satisfies readonly SspSupplementFieldKey[];

/** Select / дата ССП: попереднє значення зберігається в історії, актуальне замінюється. */
export const SSP_REPLACE_FIELD_KEYS = [
  "progressReport",
  "actualImplementationDate",
] as const satisfies readonly SspSupplementFieldKey[];

export function isSspSupplementFieldKey(key: string): key is SspSupplementFieldKey {
  return (SSP_SUPPLEMENT_FIELD_KEYS as readonly string[]).includes(key);
}

export function isSspAppendFieldKey(key: string): key is (typeof SSP_APPEND_FIELD_KEYS)[number] {
  return (SSP_APPEND_FIELD_KEYS as readonly string[]).includes(key);
}

export function isSspReplaceFieldKey(key: string): key is (typeof SSP_REPLACE_FIELD_KEYS)[number] {
  return (SSP_REPLACE_FIELD_KEYS as readonly string[]).includes(key);
}

export function isValidSspProgressReport(value: string): boolean {
  return (SSP_PROGRESS_REPORT_OPTIONS as readonly string[]).includes(value);
}

export function formatSspStoredDate(value: Date | null | undefined): string {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Доповнення для відповідального доступні лише після верифікації аналітиком
 * (`published`) і до архівації / завершення папки звіту.
 */
export function canSspSupplementRecommendation(input: {
  status: string;
  archivedAt: Date | string | null | undefined;
}): boolean {
  if (input.status !== "published") return false;
  return input.archivedAt == null || input.archivedAt === "";
}
