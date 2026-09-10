import {
  countExecutionStatuses,
} from "@/lib/recommendation-execution-status";
import { db } from "@/lib/db";
import { isExecutionPubliclyVisible } from "@/lib/public-recommendation-visibility";

export interface DashboardStats {
  total: number;
  full: number;
  partial: number;
  notDone: number;
  deadlineNotReached: number;
}

/**
 * Дашборд / бібліотека: усі рекомендації (без фільтра за сесією).
 * Лічильники виконання — лише по верифікованих (`published`).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await db.recommendation.findMany({
    where: { isActive: true },
    select: { status: true, executionIndicator: true, progressReport: true },
  });

  const verified = rows.filter((item) => isExecutionPubliclyVisible(item.status));
  const counts = countExecutionStatuses(verified);

  return {
    total: rows.length,
    full: counts.full,
    partial: counts.partial,
    notDone: counts.notDone,
    deadlineNotReached: counts.deadlineNotReached,
  };
}

/**
 * Усі папки й усі рекомендації. Лічильники виконання на картках — лише `published`.
 */
export async function getVerifiedRecentFolders(limit?: number) {
  return db.auditFolder.findMany({
    orderBy: { createdAt: "desc" },
    ...(typeof limit === "number" ? { take: limit } : {}),
    include: {
      recommendations: {
        where: { isActive: true },
        select: { status: true, executionIndicator: true, progressReport: true },
      },
    },
  });
}
