import {
  executionStatusSourceText,
  isDoneOrEnsuredLabel,
  isPartialExecutionLabel,
  resolveExecutionStatusLabel,
} from "@/lib/recommendation-execution-status";
import { db } from "@/lib/db";
import { isExecutionPubliclyVisible } from "@/lib/public-recommendation-visibility";

export interface DashboardStats {
  total: number;
  done: number;
  partial: number;
  notDone: number;
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
  const done = verified.filter((item) =>
    isDoneOrEnsuredLabel(
      resolveExecutionStatusLabel(executionStatusSourceText(item.progressReport, item.executionIndicator)),
    ),
  ).length;
  const partial = verified.filter((item) =>
    isPartialExecutionLabel(
      resolveExecutionStatusLabel(executionStatusSourceText(item.progressReport, item.executionIndicator)),
    ),
  ).length;

  return {
    total: rows.length,
    done,
    partial,
    notDone: Math.max(verified.length - done - partial, 0),
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
