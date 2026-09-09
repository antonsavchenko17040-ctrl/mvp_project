import {
  EXECUTION_STATUS_LABELS,
  executionStatusSourceText,
  resolveExecutionStatusLabel,
} from "@/lib/recommendation-execution-status";

/** Стани для dropdown «Стан» у папці бібліотеки звітів. */
export const reportsFolderStatusFilters = [
  { key: "ensured", label: "Забезпечено виконання" },
  { key: "full", label: "Виконано повністю" },
  { key: "partial", label: "Виконано частково" },
  { key: "inProgress", label: "В процесі" },
  { key: "notDone", label: "Не виконано" },
] as const;

export type ReportsFolderStatusFilterKey = (typeof reportsFolderStatusFilters)[number]["key"];

export function parseReportsFolderStatusFilter(
  raw: string | undefined,
): ReportsFolderStatusFilterKey | null {
  return reportsFolderStatusFilters.some((item) => item.key === raw)
    ? (raw as ReportsFolderStatusFilterKey)
    : null;
}

function normalizedSource(
  progressReport: string | null | undefined,
  executionIndicator: string | null | undefined,
): string {
  return executionStatusSourceText(progressReport, executionIndicator)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isEnsuredSource(source: string): boolean {
  return source.includes("забезпечено виконання") && !source.includes("не забезпечено");
}

/** Фільтр за станом у бібліотеці звітів; `null` — без обмеження. */
export function recommendationMatchesReportsFolderStatus(
  item: {
    status?: string;
    progressReport?: string | null;
    executionIndicator?: string | null;
  },
  filter: ReportsFolderStatusFilterKey | null,
): boolean {
  if (filter == null) return true;
  // Публічний стан — лише після верифікації.
  if (item.status && item.status !== "published") return false;

  const source = normalizedSource(item.progressReport, item.executionIndicator);
  const label = resolveExecutionStatusLabel(
    executionStatusSourceText(item.progressReport, item.executionIndicator),
  );

  switch (filter) {
    case "ensured":
      return isEnsuredSource(source);
    case "full":
      if (isEnsuredSource(source)) return false;
      return label === EXECUTION_STATUS_LABELS.full;
    case "partial":
      return label === EXECUTION_STATUS_LABELS.partial;
    case "inProgress":
      return (
        source.includes("в процесі") || label === EXECUTION_STATUS_LABELS.deadlineNotReached
      );
    case "notDone":
      return label === EXECUTION_STATUS_LABELS.notDone;
    default:
      return true;
  }
}

export function uniqueSspUnits(units: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of units) {
    const value = raw.replace(/\s+/g, " ").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result.sort((a, b) => a.localeCompare(b, "uk"));
}
