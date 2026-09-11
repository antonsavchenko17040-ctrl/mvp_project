import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminRecommendationRow } from "@/components/admin/admin-recommendation-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";

import { hardDeleteRecommendation } from "../../actions";

const folderPageErrors: Record<string, string> = {
  missing_recommendation: "Не вказано рекомендацію.",
  recommendation_not_found: "Рекомендацію не знайдено.",
  already_archived: "Папку вже завершено.",
  cannot_archive_incomplete: "Завершити можна лише папку, де всі активні рекомендації виконані.",
};

const folderPageOk: Record<string, string> = {
  recommendation_created: "Рекомендацію створено.",
  published: "Рекомендацію верифіковано.",
  deactivated: "Рекомендацію деактивовано.",
  imported: "Повністю заповнений звіт імпортовано. Завершіть його вручну, коли будете готові.",
  archived: "Папку аудиту завершено.",
};

export default async function AdminAuditFolderCriticalOpsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole(["admin"]);
  const { id: folderId } = await params;
  const query = await searchParams;

  const folder = await db.auditFolder.findUnique({
    where: { id: folderId },
    select: { id: true, title: true, year: true, archivedAt: true },
  });
  if (!folder) notFound();

  const pageError = query.error && folderPageErrors[query.error] ? folderPageErrors[query.error] : null;
  const pageOk = query.ok && folderPageOk[query.ok] ? folderPageOk[query.ok] : null;

  const recommendations = await db.recommendation.findMany({
        where: { auditFolderId: folder.id },
        select: {
          id: true,
          vkElement: true,
          observationSignificance: true,
          recommendationText: true,
          status: true,
          progressReport: true,
          isActive: true,
        },
        orderBy: recommendationSequenceOrderBy,
      });

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href="/admin"
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-foreground transition-colors hover:bg-muted sm:gap-2.5 sm:px-2.5 sm:pr-4"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-left text-sm font-medium sm:text-base">Назад до списку аудитів</span>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-semibold">Критичні операції з рекомендаціями</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Звіт: «{folder.title}» ({folder.year})
        </p>
      </div>

      {pageError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
          {pageError}
        </p>
      ) : null}
      {pageOk ? (
        <p className="rounded-md border border-emerald-600/30 bg-emerald-50 p-3 text-base text-emerald-800">
          {pageOk}
        </p>
      ) : null}

      <Card>
        <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span>
                Критичні операції з рекомендаціями — {folder.title} ({folder.year})
              </span>
              {folder.archivedAt ? (
                <span className="rounded-full border border-slate-400/70 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  Завершено
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={dataTableWrapClassName()}>
              <table className={dataTableClassName("min-w-[1100px]")}>
                <thead className={dataTable.thead}>
                  <tr className={dataTable.headRow}>
                    <th className={dataTable.th}>Елемент ВК</th>
                    <th className={dataTable.th}>Рекомендація</th>
                    <th className={`${dataTable.th} whitespace-nowrap`}>Значущість спостереження</th>
                    <th className={`${dataTable.th} whitespace-nowrap`}>Стан</th>
                    <th className={`${dataTable.th} whitespace-nowrap`}>Стан виконання</th>
                    <th className={dataTable.th}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.length === 0 ? (
                    <tr className={dataTable.bodyRow}>
                      <td className={dataTable.emptyCell} colSpan={6}>
                        У цій папці ще немає рекомендацій.
                      </td>
                    </tr>
                  ) : (
                    recommendations.map((item) => (
                      <AdminRecommendationRow
                        key={item.id}
                        id={item.id}
                        vkElement={item.vkElement}
                        recommendationText={item.recommendationText}
                        observationSignificance={item.observationSignificance}
                        status={item.status}
                        progressReport={item.progressReport}
                        isActive={item.isActive}
                        actions={
                          <form action={hardDeleteRecommendation}>
                            <input type="hidden" name="recommendation_id" value={item.id} />
                            <Button type="submit" variant="destructive">
                              Видалити
                            </Button>
                          </form>
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    </section>
  );
}
