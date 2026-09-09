import Link from "next/link";
import { Suspense } from "react";

import { EditorFolderSearch } from "@/components/editor/editor-folder-search";
import { EditorRecommendationTableCell } from "@/components/editor/editor-recommendation-table-cell";
import { EditorRecommendationTableRow } from "@/components/editor/editor-recommendation-table-row";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { TableSortableTh } from "@/components/table-sortable-th";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { RecommendationStatus } from "@/lib/types";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import {
  matchesRoleWorkspaceSearch,
  parseRoleWorkspaceSearchField,
  ROLE_WORKSPACE_SEARCH_FIELDS,
} from "@/lib/role-workspace-search";
import {
  applySortParams,
  parseTableSort,
  significanceRank,
  sortByAccessor,
  statusRank,
  type TableSortState,
} from "@/lib/table-sort";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";
import { verificationWorkspaceStatusLabel } from "@/lib/verification-workspace-status-label";

const analystListFilters = [
  {
    key: "all" as const,
    label: "Усі",
    chip: "border-neutral-900 text-neutral-900 hover:bg-neutral-50",
    dot: "bg-neutral-900",
    active: "bg-neutral-100",
  },
  {
    key: "on_review" as const,
    label: "На верифікації",
    chip: "border-amber-500 text-amber-800 hover:bg-amber-50/70",
    dot: "bg-amber-500",
    active: "bg-amber-50",
  },
  {
    key: "revision" as const,
    label: "На доопрацюванні",
    chip: "border-orange-500 text-orange-900 hover:bg-orange-50/70",
    dot: "bg-orange-500",
    active: "bg-orange-50",
  },
] as const;

type AnalystListFilterKey = (typeof analystListFilters)[number]["key"];

const analystSortKeys = ["number", "folder", "significance", "status"] as const;
type AnalystSortKey = (typeof analystSortKeys)[number];
const analystSortDefaults: TableSortState<AnalystSortKey> = { key: "number", dir: "asc", explicit: false };

export default async function AnalystPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    qf?: string;
    sort?: string;
    dir?: string;
    highlight?: string;
  }>;
}) {
  await requireRole(["analyst"]);
  const query = await searchParams;
  const raw = query.status ?? "";
  const activeFilter: AnalystListFilterKey = analystListFilters.some((f) => f.key === raw)
    ? (raw as AnalystListFilterKey)
    : "all";
  const searchQuery = (query.q ?? "").trim().toLowerCase();
  const searchField = parseRoleWorkspaceSearchField(query.qf);
  const sort = parseTableSort(query, analystSortKeys, analystSortDefaults);
  const highlightId = (query.highlight ?? "").trim();

  const statusWhere: { status: RecommendationStatus | { in: RecommendationStatus[] } } =
    activeFilter === "all"
      ? { status: { in: ["on_review", "revision"] } }
      : { status: activeFilter as RecommendationStatus };

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

  const searchedData = searchQuery
    ? data.filter((item) => matchesRoleWorkspaceSearch(item, searchQuery, searchField))
    : data;

  const filteredData = (() => {
    switch (sort.key) {
      case "folder":
        return sortByAccessor(
          searchedData,
          sort.dir,
          (r) => r.auditFolder.title,
          (r) => r.sequenceNumber,
        );
      case "significance":
        return sortByAccessor(
          searchedData,
          sort.dir,
          (r) => significanceRank(r.observationSignificance),
          (r) => r.sequenceNumber,
        );
      case "status":
        return sortByAccessor(searchedData, sort.dir, (r) => statusRank(r.status), (r) => r.sequenceNumber);
      case "number":
      default:
        return sortByAccessor(searchedData, sort.dir, (r) => r.sequenceNumber);
    }
  })();

  const preserveParams = {
    status: activeFilter === "all" ? undefined : activeFilter,
    q: searchQuery || undefined,
    qf: searchField || undefined,
    highlight: highlightId || undefined,
  };

  const statusHref = (key: AnalystListFilterKey) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("status", key);
    if (searchQuery) params.set("q", searchQuery);
    if (searchField) params.set("qf", searchField);
    applySortParams(params, sort);
    const qs = params.toString();
    return qs ? `/analyst?${qs}` : "/analyst";
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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {analystListFilters.map((item) => {
                const selected = activeFilter === item.key;
                return (
                  <Link
                    key={item.key}
                    href={statusHref(item.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm font-bold transition-colors sm:text-base",
                      item.chip,
                      selected && item.active,
                    )}
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", item.dot)} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

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
