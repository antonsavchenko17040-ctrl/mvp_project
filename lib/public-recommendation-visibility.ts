/** Динаміка ходу виконання (звіт ССП тощо) видима лише після успішної верифікації. */
export function isExecutionPubliclyVisible(status: string): boolean {
  return status === "published";
}

/**
 * Поля стану виконання для дашборду/бібліотеки:
 * до верифікації не підставляємо звіт ССП і не використовуємо індикатор як стан виконання.
 */
export function publicExecutionStatusFields(item: {
  status: string;
  progressReport?: string | null;
  executionIndicator?: string | null;
}): { progressReport: string | null; executionIndicator: string } {
  if (!isExecutionPubliclyVisible(item.status)) {
    return { progressReport: null, executionIndicator: "" };
  }
  return {
    progressReport: item.progressReport ?? null,
    executionIndicator: item.executionIndicator ?? "",
  };
}
