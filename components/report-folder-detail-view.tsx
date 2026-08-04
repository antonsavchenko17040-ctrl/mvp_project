import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ArchivedFolderXlsxDownloadButton } from "@/components/archived-folder-xlsx-download-button";
import { EditorFolderSearch } from "@/components/editor/editor-folder-search";
import { DashboardExecutionFilterChips } from "@/components/portal/dashboard-execution-filter-chips";
import { DashboardFolderRecommendationsTable } from "@/components/portal/dashboard-folder-recommendations-table";
import { ReportFolderBackLink } from "@/components/report-folder-back-link";
import { ReportFolderHeaderCard } from "@/components/report-folder-header-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EXECUTION_STATUS_LABELS,
  executionStatusSourceText,
  isFullyExecutedLabel,
  isPartialExecutionLabel,
  resolveExecutionStatusLabel,
} from "@/lib/recommendation-execution-status";
import { db } from "@/lib/db";
import {
  dashboardFolderSortDefaults,
  dashboardFolderSortKeys,
} from "@/lib/dashboard/folder-table-sort";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import {
  parseDashboardExecutionListFilter,
  recommendationMatchesExecutionListFilter,
} from "@/lib/dashboard/execution-list-filters";
import {
  isExecutionPubliclyVisible,
  publicExecutionStatusFields,
} from "@/lib/public-recommendation-visibility";
import {
  executionLabelRank,
  parseTableSort,
  sortByAccessor,
} from "@/lib/table-sort";

type ReportFolderDetailViewProps = {
  folderId: string;
  folderHref: string;
  backHref: string;
  backLabel?: string;
  searchParams?: Promise<{ execution?: string; q?: string; sort?: string; dir?: string }>;
};

/** Деталі папки звіту — усі рекомендації; динаміка виконання лише після верифікації. */
export async function ReportFolderDetailView({
  folderId,
  folderHref,
  backHref,
  backLabel = "Повернутися до дашборду",
  searchParams,
}: ReportFolderDetailViewProps) {
  const query = searchParams ? await searchParams : {};
  const executionFilter = parseDashboardExecutionListFilter(query.execution);
  const searchQuery = (query.q ?? "").trim().toLowerCase();
  const sort = parseTableSort(query, dashboardFolderSortKeys, dashboardFolderSortDefaults);
  const folder = await db.auditFolder.findFirst({
    where: { id: folderId },
    select: {
      id: true,
      title: true,
      year: true,
      createdAt: true,
      archivedAt: true,
      recommendations: {
        where: { isActive: true },
        select: {
          id: true,
          status: true,
          sequenceNumber: true,
          recommendationText: true,
          sspUnit: true,
          measuresDescription: true,
          executionIndicator: true,
          progressReport: true,
          deadline: true,
          informingDeadline: true,
          updatedAt: true,
        },
        orderBy: recommendationSequenceOrderBy,
      },
    },
  });

  if (!folder) {
    notFound();
  }

  const recs = folder.recommendations;
  const verifiedRecs = recs.filter((item) => isExecutionPubliclyVisible(item.status));
  const filteredByExecution = recs.filter((item) =>
    recommendationMatchesExecutionListFilter(item, executionFilter),
  );
  const searchedRecs = searchQuery
    ? filteredByExecution.filter((item) => {
        const executionVisible = isExecutionPubliclyVisible(item.status);
        const executionFields = publicExecutionStatusFields(item);
        const executionLabel = executionVisible
          ? resolveExecutionStatusLabel(
              executionStatusSourceText(executionFields.progressReport, executionFields.executionIndicator),
            )
          : "";
        const haystack = [
          item.sequenceNumber,
          item.recommendationText,
          item.sspUnit,
          executionVisible ? item.measuresDescription : "",
          executionLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchQuery);
      })
    : filteredByExecution;

  const filteredRecs = (() => {
    const withPublicFields = searchedRecs.map((item) => {
      const executionVisible = isExecutionPubliclyVisible(item.status);
      const executionFields = publicExecutionStatusFields(item);
      return {
        ...item,
        measuresDescription: executionVisible ? item.measuresDescription : null,
        executionIndicator: executionFields.executionIndicator,
        progressReport: executionFields.progressReport,
      };
    });

    switch (sort.key) {
      case "sspUnit":
        return sortByAccessor(withPublicFields, sort.dir, (r) => r.sspUnit, (r) => r.sequenceNumber);
      case "execution":
        return sortByAccessor(
          withPublicFields,
          sort.dir,
          (r) => executionLabelRank(r.progressReport, r.executionIndicator),
          (r) => r.sequenceNumber,
        );
      case "number":
      default:
        return sortByAccessor(withPublicFields, sort.dir, (r) => r.sequenceNumber);
    }
  })();

  const countByLabel = (matcher: (label: ReturnType<typeof resolveExecutionStatusLabel>) => boolean) =>
    verifiedRecs.filter((item) =>
      matcher(
        resolveExecutionStatusLabel(executionStatusSourceText(item.progressReport, item.executionIndicator)),
      ),
    ).length;

  const fullByIndicator = countByLabel(isFullyExecutedLabel);
  const partialByIndicator = countByLabel(isPartialExecutionLabel);
  const notDoneByIndicator = countByLabel((label) => label === EXECUTION_STATUS_LABELS.notDone);
  const deadlineNotReachedByIndicator = countByLabel(
    (label) => label === EXECUTION_STATUS_LABELS.deadlineNotReached,
  );

  const folderStatBlocks = [
    { key: "total", value: recs.length, label: "всього" },
    { key: "full", value: fullByIndicator, label: "виконано повністю" },
    { key: "partial", value: partialByIndicator, label: "частково" },
    { key: "notDone", value: notDoneByIndicator, label: "не виконані" },
    { key: "deadline", value: deadlineNotReachedByIndicator, label: "термін не настав" },
  ] as const;

  return (
    <section className="space-y-5">
      <ReportFolderBackLink href={backHref} label={backLabel} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <ReportFolderHeaderCard
              title={folder.title}
              createdAt={folder.createdAt}
              archivedAt={folder.archivedAt}
              stats={folderStatBlocks}
            />
          </div>
          {folder.archivedAt ? (
            <ArchivedFolderXlsxDownloadButton folderId={folder.id} className="shrink-0 self-start" />
          ) : null}
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Рекомендації цієї папки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recs.length === 0 ? (
              <p className="text-base text-muted-foreground">У цій папці немає рекомендацій.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <DashboardExecutionFilterChips
                    folderHref={folderHref}
                    activeFilter={executionFilter}
                    searchQuery={searchQuery}
                    sort={sort}
                  />
                  <Suspense
                    fallback={
                      <div className="h-9 min-w-[12rem] flex-1 rounded-3xl border bg-white sm:h-10 sm:max-w-xs" />
                    }
                  >
                    <EditorFolderSearch />
                  </Suspense>
                </div>
                {filteredRecs.length === 0 ? (
                  <p className="text-base text-muted-foreground">
                    {searchQuery
                      ? "За вашим запитом рекомендацій не знайдено."
                      : "Немає рекомендацій із обраним станом виконання."}
                  </p>
                ) : (
                  <DashboardFolderRecommendationsTable
                    recommendationHrefPrefix={`${folderHref}/recommendations`}
                    folderHref={folderHref}
                    executionQuery={executionFilter}
                    searchQuery={searchQuery}
                    sort={sort}
                    recommendations={filteredRecs.map((item) => ({
                      id: item.id,
                      sequenceNumber: item.sequenceNumber,
                      recommendationText: item.recommendationText,
                      sspUnit: item.sspUnit,
                      measuresDescription: item.measuresDescription,
                      executionIndicator: item.executionIndicator,
                      progressReport: item.progressReport,
                    }))}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
