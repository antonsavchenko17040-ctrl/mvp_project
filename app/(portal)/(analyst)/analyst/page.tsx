import { Suspense } from "react";

import { EditorFolderSearch } from "@/components/editor/editor-folder-search";
import { EditorRecommendationTableCell } from "@/components/editor/editor-recommendation-table-cell";
import { EditorRecommendationTableRow } from "@/components/editor/editor-recommendation-table-row";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { RoleWorkspaceListFilters } from "@/components/role-workspace-list-filters";
import { TableSortableTh } from "@/components/table-sortable-th";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  daysUntilDeadline,
  deadlineUrgencyBand,
  type DeadlineUrgencyBand,
} from "@/lib/deadline-reminder-ui";
import {
  analystStatusFilterWhere,
  parseRoleWorkspaceDeadlineFilter,
  parseRoleWorkspaceStatusFilter,
} from "@/lib/role-workspace-list-filters";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import {
  matchesRoleWorkspaceSearch,
  parseRoleWorkspaceSearchField,
  ROLE_WORKSPACE_SEARCH_FIELDS,
} from "@/lib/role-workspace-search";
import {
  parseTableSort,
  significanceRank,
  sortByAccessor,
  statusRank,
  type TableSortState,
} from "@/lib/table-sort";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";
import { verificationWorkspaceStatusLabel } from "@/lib/verification-workspace-status-label";

const analystSortKeys = ["number", "folder", "significance", "status"] as const;
type AnalystSortKey = (typeof analystSortKeys)[number];
const analystSortDefaults: TableSortState<AnalystSortKey> = { key: "number", dir: "asc", explicit: false };

export default async function AnalystPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    deadline?: string;
    q?: string;
    qf?: string;
    sort?: string;
    dir?: string;
    highlight?: string;
  }>;
}) {
  await requireRole(["analyst"]);
  const query = await searchParams;
  const activeFilter = parseRoleWorkspaceStatusFilter(query.status);
  const activeDeadlineFilter = parseRoleWorkspaceDeadlineFilter(query.deadline);
  const searchQuery = (query.q ?? "").trim().toLowerCase();
  const searchField = parseRoleWorkspaceSearchField(query.qf);
  const sort = parseTableSort(query, analystSortKeys, analystSortDefaults);
  const highlightId = (query.highlight ?? "").trim();

  const statusWhere = analystStatusFilterWhere(activeFilter);

  const data = await db.recommendation.findMany({
    where: { ...statusWhere, isActive: true },
    select: {
      id: true,
      sequenceNumber: true,
      vkElement: true,
      deficiency: true,
      observationSignificance: true,
      recommendationText: true,
      executionIndicator: true,
      expectedResult: true,
      status: true,
      deadline: true,
      informingDeadline: true,
      expectedAchievement: true,
      supportingDocuments: true,
      sspNotes: true,
      actualImplementationDate: true,
      auditFolder: { select: { title: true } },
    },
    orderBy: recommendationSequenceOrderBy,
  });

  const withDeadlineMeta = data.map((item) => {
    const daysLeft = daysUntilDeadline(item.deadline);
    const urgency = deadlineUrgencyBand(daysLeft);
    return { ...item, daysLeft, urgency };
  });

  const searchedData = searchQuery
    ? withDeadlineMeta.filter((item) => matchesRoleWorkspaceSearch(item, searchQuery, searchField))
    : withDeadlineMeta;

  const deadlineFilteredData =
    activeDeadlineFilter === "all"
      ? searchedData
      : searchedData.filter((item) => item.urgency === (activeDeadlineFilter as DeadlineUrgencyBand));

  const filteredData = (() => {
    switch (sort.key) {
      case "folder":
        return sortByAccessor(
          deadlineFilteredData,
          sort.dir,
          (r) => r.auditFolder.title,
          (r) => r.sequenceNumber,
        );
      case "significance":
        return sortByAccessor(
          deadlineFilteredData,
          sort.dir,
          (r) => significanceRank(r.observationSignificance),
          (r) => r.sequenceNumber,
        );
      case "status":
        return sortByAccessor(
          deadlineFilteredData,
          sort.dir,
          (r) => statusRank(r.status),
          (r) => r.sequenceNumber,
        );
      case "number":
      default:
        return sortByAccessor(deadlineFilteredData, sort.dir, (r) => r.sequenceNumber);
    }
  })();

  const preserveParams = {
    status: activeFilter === "all" ? undefined : activeFilter,
    deadline: activeDeadlineFilter === "all" ? undefined : activeDeadlineFilter,
    q: searchQuery || undefined,
    qf: searchField || undefined,
    highlight: highlightId || undefined,
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-semibold">Простір Аналітика</h1>
      </div>

      <Card className="relative w-full gap-0 overflow-hidden rounded-lg border border-black/20 bg-white py-0 pb-3 shadow-sm ring-0">
        <CardContent className="space-y-3 pt-3 sm:pt-4">
          <div className="rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:p-3.5">
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="h-9 min-w-0 flex-1 rounded-3xl border bg-white sm:h-10" />
                  <div className="h-9 w-full rounded-3xl border bg-white sm:h-10 sm:w-[28rem]" />
                </div>
              }
            >
              <EditorFolderSearch fields={[...ROLE_WORKSPACE_SEARCH_FIELDS]} />
            </Suspense>
          </div>

          <Suspense
            fallback={
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <div className="h-9 w-full rounded-3xl border bg-white sm:h-10 sm:w-52" />
                <div className="h-9 w-full rounded-3xl border bg-white sm:h-10 sm:w-52" />
              </div>
            }
          >
            <RoleWorkspaceListFilters />
          </Suspense>

          <div className={dataTableWrapClassName()}>
            <table className={dataTableClassName("min-w-[1100px]")}>
              <thead className={dataTable.thead}>
                <tr className={dataTable.headRow}>
                  <TableSortableTh
                    label="№"
                    column="number"
                    sort={sort}
                    defaults={analystSortDefaults}
                    pathname="/analyst"
                    preserveParams={preserveParams}
                    className="w-12"
                    align="center"
                  />
                  <TableSortableTh
                    label="Назва звіту"
                    column="folder"
                    sort={sort}
                    defaults={analystSortDefaults}
                    pathname="/analyst"
                    preserveParams={preserveParams}
                    className="w-40"
                  />
                  <th className={cn(dataTable.th, "min-w-[11rem]")}>
                    Недоліки, проблеми та порушення (точки зростання)
                  </th>
                  <th className={cn(dataTable.th, "min-w-[11rem]")}>Надані аудиторські рекомендації</th>
                  <TableSortableTh
                    label="Значущість спостереження"
                    column="significance"
                    sort={sort}
                    defaults={analystSortDefaults}
                    pathname="/analyst"
                    preserveParams={preserveParams}
                    className="w-28"
                  />
                  <TableSortableTh
                    label="Статус"
                    column="status"
                    sort={sort}
                    defaults={analystSortDefaults}
                    pathname="/analyst"
                    preserveParams={preserveParams}
                    className="w-36"
                    align="center"
                  />
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr className={dataTable.bodyRow}>
                    <td colSpan={6} className={dataTable.emptyCell}>
                      {searchQuery
                        ? "За вашим запитом рекомендацій не знайдено."
                        : "Рекомендацій за обраним фільтром немає."}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <EditorRecommendationTableRow
                      key={item.id}
                      href={`/analyst/recommendations/${item.id}`}
                      highlighted={highlightId === item.id}
                    >
                      <EditorRecommendationTableCell className="w-12 text-center" align="center">
                        {item.sequenceNumber}
                      </EditorRecommendationTableCell>
                      <EditorRecommendationTableCell className="w-40">
                        {item.auditFolder.title}
                      </EditorRecommendationTableCell>
                      <EditorRecommendationTableCell className="min-w-[11rem]">
                        {item.deficiency}
                      </EditorRecommendationTableCell>
                      <EditorRecommendationTableCell className="min-w-[11rem]">
                        {item.recommendationText}
                      </EditorRecommendationTableCell>
                      <EditorRecommendationTableCell className="w-28">
                        {item.observationSignificance}
                      </EditorRecommendationTableCell>
                      <EditorRecommendationTableCell className="w-36" align="center">
                        <div className="flex justify-center">
                          <RecommendationStatusBadge
                            status={item.status}
                            label={verificationWorkspaceStatusLabel(item.status)}
                          />
                        </div>
                      </EditorRecommendationTableCell>
                    </EditorRecommendationTableRow>
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
