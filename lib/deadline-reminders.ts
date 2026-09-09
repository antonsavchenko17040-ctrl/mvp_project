import { db } from "@/lib/db";
import {
  daysUntilDeadline,
  type DeadlineReminderItem,
} from "@/lib/deadline-reminder-ui";
import { recommendationsVisibleToSspWhere } from "@/lib/ssp/recommendation-access";
import type { UserRole } from "@/lib/types";

export type { DeadlineReminderItem, DeadlineUrgencyBand } from "@/lib/deadline-reminder-ui";
export {
  daysUntilDeadline,
  deadlineReminderHighlightHref,
  deadlineUrgencyBand,
  deadlineUrgencyCellClass,
  deadlineUrgencyRowClass,
} from "@/lib/deadline-reminder-ui";

export const DEADLINE_REMINDER_THRESHOLDS = [30, 7, 3] as const;

/** Нагадування, якщо до терміну лишилось від 1 до 30 днів. */
export function isDeadlineReminderActive(daysLeft: number): boolean {
  return daysLeft >= 1 && daysLeft <= 30;
}

export function ukDaysWord(count: number): string {
  const n10 = count % 10;
  const n100 = count % 100;
  if (n10 === 1 && n100 !== 11) return "день";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "дні";
  return "днів";
}

export function formatDeadlineReminderMessage(input: {
  sequenceNumber: number;
  folderTitle: string;
  daysLeft: number;
}): string {
  const daysLabel = `${input.daysLeft} ${ukDaysWord(input.daysLeft)}`;
  return `⏰ Нагадування. Термін виконання рекомендації №${input.sequenceNumber} у папці «${input.folderTitle}» спливає через ${daysLabel}`;
}

type ReminderAudience = "ssp" | "manager";

function reminderHref(role: ReminderAudience, recommendationId: string): string {
  if (role === "ssp") return `/ssp/recommendations/${recommendationId}`;
  return `/manager/recommendations/${recommendationId}`;
}

type ReminderRow = {
  id: string;
  sequenceNumber: number;
  deadline: Date;
  auditFolder: { title: string; archivedAt: Date | null };
};

function toReminderItems(rows: ReminderRow[], role: ReminderAudience): DeadlineReminderItem[] {
  const items: DeadlineReminderItem[] = [];
  for (const row of rows) {
    if (row.auditFolder.archivedAt) continue;
    const daysLeft = daysUntilDeadline(row.deadline);
    if (!isDeadlineReminderActive(daysLeft)) continue;
    items.push({
      id: row.id,
      sequenceNumber: row.sequenceNumber,
      folderTitle: row.auditFolder.title,
      daysLeft,
      href: reminderHref(role, row.id),
      message: formatDeadlineReminderMessage({
        sequenceNumber: row.sequenceNumber,
        folderTitle: row.auditFolder.title,
        daysLeft,
      }),
    });
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft || a.sequenceNumber - b.sequenceNumber);
}

/** Активні неархівовані рекомендації з терміном у межах 1–30 днів. */
function deadlineWindowFilter(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  const deadlineTo = new Date(in30.getFullYear(), in30.getMonth(), in30.getDate(), 23, 59, 59, 999);
  return {
    isActive: true as const,
    deadline: { gte: today, lte: deadlineTo },
    auditFolder: { archivedAt: null },
  };
}

const reminderSelect = {
  id: true,
  sequenceNumber: true,
  deadline: true,
  auditFolder: { select: { title: true, archivedAt: true } },
} as const;

/**
 * Сповіщення за ролями (термін виконання 1–30 днів):
 * - відповідальний — статус «Виконати» (`in_progress`), видимі йому в таблиці ССП;
 * - керівник — «На верифікації» керівником (`manager_review`).
 * Аналітик сповіщень не отримує.
 */
export async function getDeadlineRemindersForProfile(input: {
  profileId: string;
  roles: UserRole[];
}): Promise<DeadlineReminderItem[]> {
  const isSsp = input.roles.includes("ssp");
  const isManager = input.roles.includes("manager");
  if (!isSsp && !isManager) return [];

  const baseWhere = deadlineWindowFilter();

  const sspPromise = isSsp
    ? (async () => {
        const visibility = await recommendationsVisibleToSspWhere(input.profileId);
        return db.recommendation.findMany({
          where: {
            AND: [visibility, baseWhere, { status: "in_progress" }],
          },
          select: reminderSelect,
          orderBy: [{ deadline: "asc" }, { sequenceNumber: "asc" }],
          take: 50,
        });
      })()
    : Promise.resolve([]);

  const managerPromise = isManager
    ? db.recommendation.findMany({
        where: {
          AND: [baseWhere, { status: "manager_review" }],
        },
        select: reminderSelect,
        orderBy: [{ deadline: "asc" }, { sequenceNumber: "asc" }],
        take: 50,
      })
    : Promise.resolve([]);

  const [sspRows, managerRows] = await Promise.all([sspPromise, managerPromise]);

  // Якщо користувач має кілька ролей — пріоритет посилання: ssp → manager.
  const byId = new Map<string, DeadlineReminderItem>();
  for (const item of toReminderItems(sspRows, "ssp")) byId.set(item.id, item);
  for (const item of toReminderItems(managerRows, "manager")) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  return [...byId.values()].sort(
    (a, b) => a.daysLeft - b.daysLeft || a.sequenceNumber - b.sequenceNumber,
  );
}
