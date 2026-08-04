/** Дозволені підписи стану впровадження (дропдаун ССП і бейджі). */
export const EXECUTION_STATUS_LABELS = {
  deadlineNotReached: "Термін виконання не настав",
  notDone: "Не виконано",
  partial: "Виконано частково",
  full: "Виконано повністю",
} as const;

/** Варіанти для дропдауна «Стан впровадження рекомендацій» у просторі відповідального. */
export const SSP_PROGRESS_REPORT_OPTIONS = Object.values(EXECUTION_STATUS_LABELS);

export type ExecutionCanonicalLabel =
  (typeof EXECUTION_STATUS_LABELS)[keyof typeof EXECUTION_STATUS_LABELS] | "—";

const LEGACY_LABELS = {
  done: "Виконано",
  inProgress: "в процесі",
  partialLower: "виконано частково",
  ensured: "забезпечено виконання",
} as const;

const NEGATIVE_PHRASES = [
  "не було виконано",
  "не забезпечено виконання",
  "не забезпечено",
  "не виконано",
  "не виконані",
  "не виконана",
  "не виконаний",
  "не виконаних",
  "не виконаною",
  "невиконано",
  "невиконані",
  "невиконана",
  "невиконаний",
  "не виконан",
  "не реалізовано",
  "не відпрацьовано",
  "не здійснено",
  "не проведено",
  "не було здійснено",
] as const;

/**
 * Текст для оцінки стану: для опублікованих рекомендацій спочатку звіт ССП (`progressReport`),
 * інакше — індикатор з картки (`executionIndicator`).
 */
export function executionStatusSourceText(
  progressReport: string | null | undefined,
  executionIndicator: string | null | undefined,
): string {
  const fromReport = (progressReport ?? "").replace(/\s+/g, " ").trim();
  if (fromReport) return fromReport;
  return (executionIndicator ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Повертає один із дозволених підписів, якщо текст це дозволяє визначити; інакше «—»
 * (повний текст лишається в підказці на бейджі).
 */
export function resolveExecutionStatusLabel(raw: string | null | undefined): ExecutionCanonicalLabel {
  const t = (raw ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return "—";

  for (const canon of Object.values(EXECUTION_STATUS_LABELS)) {
    if (canon.toLowerCase() === t) {
      return canon;
    }
  }

  if (
    t.includes("термін виконання не настав") ||
    t.includes("термін не настав") ||
    t === LEGACY_LABELS.inProgress.toLowerCase()
  ) {
    return EXECUTION_STATUS_LABELS.deadlineNotReached;
  }

  if (NEGATIVE_PHRASES.some((phrase) => t.includes(phrase))) {
    return EXECUTION_STATUS_LABELS.notDone;
  }

  if (
    t.includes("виконано частково") ||
    t.includes(LEGACY_LABELS.partialLower) ||
    (t.includes("частково") && !t.includes("не частково"))
  ) {
    return EXECUTION_STATUS_LABELS.partial;
  }

  if (
    t.includes("виконано повністю") ||
    t === LEGACY_LABELS.done.toLowerCase() ||
    t.includes(LEGACY_LABELS.ensured.toLowerCase()) ||
    (t.includes("виконано") && !t.includes("не виконано") && !t.includes("частково"))
  ) {
    return EXECUTION_STATUS_LABELS.full;
  }

  return "—";
}

export function isFullyExecutedLabel(label: ExecutionCanonicalLabel): boolean {
  return label === EXECUTION_STATUS_LABELS.full;
}

/** @deprecated Використовуйте isFullyExecutedLabel */
export function isDoneOrEnsuredLabel(label: ExecutionCanonicalLabel): boolean {
  return isFullyExecutedLabel(label);
}

export function isPartialExecutionLabel(label: ExecutionCanonicalLabel): boolean {
  return label === EXECUTION_STATUS_LABELS.partial;
}

export type ExecutionStatusCounts = {
  full: number;
  partial: number;
  notDone: number;
  deadlineNotReached: number;
};

/** Підрахунок по верифікованих рекомендаціях для карток папок (дашборд / бібліотека). */
export function countExecutionStatuses(
  items: { progressReport?: string | null; executionIndicator?: string | null }[],
): ExecutionStatusCounts {
  let full = 0;
  let partial = 0;
  let notDone = 0;
  let deadlineNotReached = 0;

  for (const item of items) {
    const label = resolveExecutionStatusLabel(
      executionStatusSourceText(item.progressReport, item.executionIndicator),
    );
    if (label === EXECUTION_STATUS_LABELS.full) {
      full += 1;
    } else if (label === EXECUTION_STATUS_LABELS.partial) {
      partial += 1;
    } else if (label === EXECUTION_STATUS_LABELS.notDone) {
      notDone += 1;
    } else if (label === EXECUTION_STATUS_LABELS.deadlineNotReached) {
      deadlineNotReached += 1;
    }
  }

  return { full, partial, notDone, deadlineNotReached };
}
