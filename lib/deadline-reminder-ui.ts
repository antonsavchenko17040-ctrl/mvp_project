/** Клієнт-безпечні типи й хелпери термінів виконання (без fs/db). */

export type DeadlineReminderItem = {
  id: string;
  sequenceNumber: number;
  folderTitle: string;
  daysLeft: number;
  href: string;
  message: string;
};

export type DeadlineUrgencyBand = "red" | "yellow" | "blue";

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Календарні дні до терміну виконання (від сьогоднішньої дати). */
export function daysUntilDeadline(deadline: Date, now = new Date()): number {
  const start = startOfLocalDay(now).getTime();
  const end = startOfLocalDay(deadline).getTime();
  return Math.round((end - start) / 86_400_000);
}

/**
 * Підсвітка за залишком днів:
 * — 1–3 дні → червоний;
 * — 4–7 днів → жовтий;
 * — 8–30 днів → синій.
 */
export function deadlineUrgencyBand(daysLeft: number): DeadlineUrgencyBand | null {
  if (daysLeft >= 1 && daysLeft <= 3) return "red";
  if (daysLeft >= 4 && daysLeft <= 7) return "yellow";
  if (daysLeft >= 8 && daysLeft <= 30) return "blue";
  return null;
}

export function deadlineUrgencyRowClass(band: DeadlineUrgencyBand | null): string | undefined {
  if (band === "red") return "bg-red-100 hover:bg-red-200/90 focus-visible:bg-red-200/90";
  if (band === "yellow") return "bg-amber-100 hover:bg-amber-200/90 focus-visible:bg-amber-200/90";
  if (band === "blue") return "bg-sky-100 hover:bg-sky-200/90 focus-visible:bg-sky-200/90";
  return undefined;
}

/** Список простору з підсвіткою рядка (перший клік зі сповіщення). */
export function deadlineReminderHighlightHref(detailHref: string, recommendationId: string): string {
  const params = new URLSearchParams({ highlight: recommendationId });
  if (detailHref.startsWith("/ssp/")) return `/ssp?${params}`;
  if (detailHref.startsWith("/manager/")) return `/manager?${params}`;
  if (detailHref.startsWith("/analyst/")) return `/analyst?${params}`;
  return detailHref;
}
