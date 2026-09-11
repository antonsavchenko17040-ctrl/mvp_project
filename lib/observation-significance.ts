/** Допустимі значення «Значущість спостереження» (жіночий рід). */
export const OBSERVATION_SIGNIFICANCE_VALUES = [
  "низька",
  "середня",
  "висока",
  "критична",
] as const;

export type ObservationSignificanceValue = (typeof OBSERVATION_SIGNIFICANCE_VALUES)[number];

const LEGACY_TO_CURRENT: Record<string, ObservationSignificanceValue> = {
  низький: "низька",
  середній: "середня",
  високий: "висока",
  критичний: "критична",
};

/** Порожнє / «—» / застарілі чоловічі форми → актуальне значення або "". */
export function normalizeObservationSignificance(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "—") return "";
  return LEGACY_TO_CURRENT[trimmed] ?? trimmed;
}

export function isObservationSignificanceSelected(raw: string | null | undefined): boolean {
  const normalized = normalizeObservationSignificance(raw);
  return (OBSERVATION_SIGNIFICANCE_VALUES as readonly string[]).includes(normalized);
}

/** Значення для `<select defaultValue>` (порожнє = «Не обрано»). */
export function observationSignificanceSelectValue(raw: string | null | undefined): string {
  return normalizeObservationSignificance(raw);
}
