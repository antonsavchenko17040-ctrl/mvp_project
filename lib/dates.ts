/** Українські назви місяців (називний відмінок) для календарів. */
export const UK_MONTH_NAMES = [
  "січень",
  "лютий",
  "березень",
  "квітень",
  "травень",
  "червень",
  "липень",
  "серпень",
  "вересень",
  "жовтень",
  "листопад",
  "грудень",
] as const;

/** Коротки підписи днів тижня, починаючи з понеділка. */
export const UK_WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;

/** Дата з поля `type="date"` / ISO-дня (YYYY-MM-DD) у локальному календарі. */
export function parseDateOnlyInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return makeLocalDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const dmy = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
  if (dmy) {
    return makeLocalDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  }
  return null;
}

function makeLocalDate(year: number, month: number, day: number): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** YYYY-MM-DD для value input / hidden field. */
export function formatDateOnlyInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Відображення дати як ДД.ММ.РРРР. */
export function formatDateOnlyDisplay(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export function startOfLocalToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function compareDateOnlyIso(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
