/** Клієнт-безпечні типи й хелпери термінів виконання (без fs/db). */

export type DeadlineReminderItem = {
  id: string;
  sequenceNumber: number;
  folderTitle: string;
  daysLeft: number;
  href: string;
  message: string;
};

export type DeadlineUrgencyBand = "red" | "yellow";

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
 * Підсвітка комірки терміну в робочих просторах ролей:
 * — 1–3 дні → червоний;
 * — 4–7 днів → жовтий.
 * Діапазон 8–30 днів підсвічується лише в «Нагадуванні», не в таблицях.
 */
export function deadlineUrgencyBand(daysLeft: number): DeadlineUrgencyBand | null {
  if (daysLeft >= 1 && daysLeft <= 3) return "red";
  if (daysLeft >= 4 && daysLeft <= 7) return "yellow";
  return null;
}

/**
 * Підсвітка лише комірки «Термін виконання».
 * На hover/focus/highlight рядка колір скидається, щоб працювала жовта підсвітка всього рядка.
 */
export function deadlineUrgencyCellClass(band: DeadlineUrgencyBand | null): string | undefined {
  if (band === "red") {
    return "bg-red-100 group-hover:bg-transparent group-focus-visible:bg-transparent group-data-[highlighted=true]:bg-transparent";
  }
  if (band === "yellow") {
    return "bg-amber-100 group-hover:bg-transparent group-focus-visible:bg-transparent group-data-[highlighted=true]:bg-transparent";
  }
  return undefined;
}

/** @deprecated Використовуйте `deadlineUrgencyCellClass` — підсвітка більше не на рядку. */
export function deadlineUrgencyRowClass(band: DeadlineUrgencyBand | null): string | undefined {
  return deadlineUrgencyCellClass(band);
}

/** Список простору з підсвіткою рядка (перший клік зі сповіщення). */
export function deadlineReminderHighlightHref(detailHref: string, recommendationId: string): string {
  const params = new URLSearchParams({ highlight: recommendationId });
  if (detailHref.startsWith("/ssp/")) return `/ssp?${params}`;
  if (detailHref.startsWith("/manager/")) return `/manager?${params}`;
  if (detailHref.startsWith("/analyst/")) return `/analyst?${params}`;
  return detailHref;
}
