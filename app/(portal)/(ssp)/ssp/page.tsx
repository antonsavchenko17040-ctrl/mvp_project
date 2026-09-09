import { Suspense } from "react";

import { EditorFolderSearch } from "@/components/editor/editor-folder-search";
import {
  EditorRecommendationTableCell,
  formatRecommendationDate,
} from "@/components/editor/editor-recommendation-table-cell";
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
  deadlineUrgencyRowClass,
  type DeadlineUrgencyBand,
} from "@/lib/deadline-reminder-ui";
import {
  parseRoleWorkspaceDeadlineFilter,
  parseRoleWorkspaceStatusFilter,
  sspStatusFilterCondition,
} from "@/lib/role-workspace-list-filters";
import { recommendationsVisibleToSspWhere } from "@/lib/ssp/recommendation-access";
import { sspWorkspaceStatusLabel } from "@/lib/ssp/ssp-status-label";
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

const sspSortKeys = ["number", "folder", "deadline", "significance", "status"] as const;
type SspSortKey = (typeof sspSortKeys)[number];
const sspSortDefaults: TableSortState<SspSortKey> = { key: "number", dir: "asc", explicit: false };

export default async function SspPage({
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
  const profile = await requireRole(["ssp"]);
  const query = await searchParams;
  const activeFilter = parseRoleWorkspaceStatusFilter(query.status);
  const activeDeadlineFilter = parseRoleWorkspaceDeadlineFilter(query.deadline);
  const searchQuery = (query.q ?? "").trim().toLowerCase();
  const searchField = parseRoleWorkspaceSearchField(query.qf);
  const sort = parseTableSort(query, sspSortKeys, sspSortDefaults);
  const highlightId = (query.highlight ?? "").trim();

  const visibilityWhere = await recommendationsVisibleToSspWhere(profile.id);
  const statusCondition = sspStatusFilterCondition(activeFilter);
  const where =
    statusCondition == null ? visibilityWhere : { AND: [visibilityWhere, statusCondition] };

  const data = await db.recommendation.findMany({
    where,
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
      managerComment: true,
      analystComment: true,
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
      case "deadline":
        return sortByAccessor(
          deadlineFilteredData,
          sort.dir,
          (r) => r.deadline.getTime(),
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
        <h1 className="text-5xl font-semibold">Простір Відповідального</h1>
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
            <table className={dataTableClassName("min-w-[1240px]")}>
              <thead className={dataTable.thead}>
                <tr className={dataTable.headRow}>
                  <TableSortableTh
                    label="№"
                    column="number"
                    sort={sort}
                    defaults={sspSortDefaults}
                    pathname="/ssp"
                    preserveParams={preserveParams}
                    className="w-12"
                    align="center"
                  />
                  <TableSortableTh
                    label="Назва звіту"
                    column="folder"
                    sort={sort}
                    defaults={sspSortDefaults}
                    pathname="/ssp"
                    preserveParams={preserveParams}
                    className="w-40"
                  />
                  <th className={cn(dataTable.th, "min-w-[11rem]")}>
                    Недоліки, проблеми та порушення (точки зростання)
                  </th>
                  <th className={cn(dataTable.th, "min-w-[11rem]")}>Надані аудиторські рекомендації</th>
                  <TableSortableTh
                    label="Термін виконання"
                    column="deadline"
                    sort={sort}
                    defaults={sspSortDefaults}
                    pathname="/ssp"
                    preserveParams={preserveParams}
                    className="w-32"
                  />
                  <TableSortableTh
                    label={"Значущість\nспостереження"}
                    column="significance"
                    sort={sort}
                    defaults={sspSortDefaults}
                    pathname="/ssp"
                    preserveParams={preserveParams}
                    className="w-[8.5rem] min-w-[8.5rem]"
                  />
                  <TableSortableTh
                    label="Статус"
                    column="status"
                    sort={sort}
                    defaults={sspSortDefaults}
                    pathname="/ssp"
                    preserveParams={preserveParams}
                    className="w-36"
                    align="center"
                  />
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr className={dataTable.bodyRow}>
                    <td colSpan={7} className={dataTable.emptyCell}>
                      {searchQuery
                        ? "За вашим запитом рекомендацій не знайдено."
                        : "Рекомендацій за обраним фільтром немає."}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <EditorRecommendationTableRow
                      key={item.id}
                      href={`/ssp/recommendations/${item.id}`}
                      highlighted={highlightId === item.id}
                      className={deadlineUrgencyRowClass(item.urgency)}
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
                      <EditorRecommendationTableCell className="w-32">
                        {formatRecommendationDate(item.deadline)}
                      </EditorRecommendationTableCell>
                      <EditorRecommendationTableCell className="w-[8.5rem] min-w-[8.5rem]">
                        {item.observationSignificance}
                      </EditorRecommendationTableCell>
                      <EditorRecommendationTableCell className="w-36" align="center">
                        <div className="flex justify-center">
                          <RecommendationStatusBadge
                            status={item.status}
                            label={sspWorkspaceStatusLabel({
                              status: item.status,
                              analystComment: item.analystComment,
                              managerComment: item.managerComment,
                            })}
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
