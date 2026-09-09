import Link from "next/link";
import { Suspense } from "react";

import { EditorFolderSearch } from "@/components/editor/editor-folder-search";
import {
  EditorRecommendationTableCell,
  formatRecommendationDate,
} from "@/components/editor/editor-recommendation-table-cell";
import { EditorRecommendationTableRow } from "@/components/editor/editor-recommendation-table-row";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
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

const managerListFilters = [
  {
    key: "all" as const,
    label: "Усі",
    chip: "border-neutral-900 text-neutral-900 hover:bg-neutral-50",
    dot: "bg-neutral-900",
    active: "bg-neutral-100",
  },
  {
    key: "manager_review" as const,
    label: "На верифікації",
    chip: "border-indigo-600 text-indigo-900 hover:bg-indigo-50/70",
    dot: "bg-indigo-600",
    active: "bg-indigo-50",
  },
  {
    key: "revision" as const,
    label: "На доопрацюванні",
    chip: "border-orange-500 text-orange-900 hover:bg-orange-50/70",
    dot: "bg-orange-500",
    active: "bg-orange-50",
  },
] as const;

type ManagerListFilterKey = (typeof managerListFilters)[number]["key"];

const managerDeadlineFilters = [
  {
    key: "all" as const,
    label: "Усі терміни",
    chip: "border-neutral-900 text-neutral-900 hover:bg-neutral-50",
    dot: "bg-neutral-900",
    active: "bg-neutral-100",
  },
  {
    key: "blue" as const,
    label: "8–30 днів",
    chip: "border-sky-600 text-sky-900 hover:bg-sky-50/70",
    dot: "bg-sky-600",
    active: "bg-sky-50",
  },
  {
    key: "yellow" as const,
    label: "4–7 днів",
    chip: "border-amber-500 text-amber-900 hover:bg-amber-50/70",
    dot: "bg-amber-500",
    active: "bg-amber-50",
  },
  {
    key: "red" as const,
    label: "1–3 дні",
    chip: "border-red-600 text-red-900 hover:bg-red-50/70",
    dot: "bg-red-600",
    active: "bg-red-50",
  },
] as const;

type ManagerDeadlineFilterKey = (typeof managerDeadlineFilters)[number]["key"];

const managerSortKeys = ["number", "folder", "deadline", "significance", "status"] as const;
type ManagerSortKey = (typeof managerSortKeys)[number];
const managerSortDefaults: TableSortState<ManagerSortKey> = { key: "number", dir: "asc", explicit: false };

export default async function ManagerPage({
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
  await requireRole(["manager"]);
  const query = await searchParams;
  const raw = query.status ?? "";
  const activeFilter: ManagerListFilterKey = managerListFilters.some((f) => f.key === raw)
    ? (raw as ManagerListFilterKey)
    : "all";
  const rawDeadline = query.deadline ?? "";
  const activeDeadlineFilter: ManagerDeadlineFilterKey = managerDeadlineFilters.some(
    (f) => f.key === rawDeadline,
  )
    ? (rawDeadline as ManagerDeadlineFilterKey)
    : "all";
  const searchQuery = (query.q ?? "").trim().toLowerCase();
  const searchField = parseRoleWorkspaceSearchField(query.qf);
  const sort = parseTableSort(query, managerSortKeys, managerSortDefaults);
  const highlightId = (query.highlight ?? "").trim();

  const statusWhere: { status: RecommendationStatus | { in: RecommendationStatus[] } } =
    activeFilter === "all"
      ? { status: { in: ["manager_review", "revision"] } }
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

  const statusHref = (key: ManagerListFilterKey) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("status", key);
    if (activeDeadlineFilter !== "all") params.set("deadline", activeDeadlineFilter);
    if (searchQuery) params.set("q", searchQuery);
    if (searchField) params.set("qf", searchField);
    applySortParams(params, sort);
    const qs = params.toString();
    return qs ? `/manager?${qs}` : "/manager";
  };

  const deadlineHref = (key: ManagerDeadlineFilterKey) => {
    const params = new URLSearchParams();
    if (activeFilter !== "all") params.set("status", activeFilter);
    if (key !== "all") params.set("deadline", key);
    if (searchQuery) params.set("q", searchQuery);
    if (searchField) params.set("qf", searchField);
    applySortParams(params, sort);
    const qs = params.toString();
    return qs ? `/manager?${qs}` : "/manager";
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-semibold">Простір Керівника</h1>
      </div>

      <Card className="relative w-full gap-0 overflow-hidden rounded-lg border border-black/20 bg-white py-0 pb-3 shadow-sm ring-0">
        <CardContent className="space-y-3 pt-3 sm:pt-4">
          <div className="rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:p-3.5">
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="h-9 min-w-0 flex-1 rounded-3xl border bg-white sm:h-10" />
                  <div className="h-9 w-full rounded-3xl border bg-white sm:h-10 sm:w-72" />
                </div>
              }
            >
              <EditorFolderSearch fields={[...ROLE_WORKSPACE_SEARCH_FIELDS]} />
            </Suspense>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {managerListFilters.map((item) => {
                const selected = activeFilter === item.key;
                return (
                  <Link
                    key={item.key}
                    href={statusHref(item.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-bold transition-colors sm:text-sm",
                      item.chip,
                      selected && item.active,
                    )}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", item.dot)} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
              <div className="ms-1 flex flex-wrap items-center gap-1.5 border-l border-black/20 pl-3 sm:ms-2 sm:gap-2 sm:pl-4">
                {managerDeadlineFilters.map((item) => {
                  const selected = activeDeadlineFilter === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={deadlineHref(item.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-bold transition-colors sm:text-sm",
                        item.chip,
                        selected && item.active,
                      )}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", item.dot)} aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={dataTableWrapClassName()}>
            <table className={dataTableClassName("min-w-[1240px]")}>
              <thead className={dataTable.thead}>
                <tr className={dataTable.headRow}>
                  <TableSortableTh
                    label="№"
                    column="number"
                    sort={sort}
                    defaults={managerSortDefaults}
                    pathname="/manager"
                    preserveParams={preserveParams}
                    className="w-12"
                    align="center"
                  />
                  <TableSortableTh
                    label="Назва звіту"
                    column="folder"
                    sort={sort}
                    defaults={managerSortDefaults}
                    pathname="/manager"
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
                    defaults={managerSortDefaults}
                    pathname="/manager"
                    preserveParams={preserveParams}
                    className="w-32"
                  />
                  <TableSortableTh
                    label={"Значущість\nспостереження"}
                    column="significance"
                    sort={sort}
                    defaults={managerSortDefaults}
                    pathname="/manager"
                    preserveParams={preserveParams}
                    className="w-[8.5rem] min-w-[8.5rem]"
                  />
                  <TableSortableTh
                    label="Статус"
                    column="status"
                    sort={sort}
                    defaults={managerSortDefaults}
                    pathname="/manager"
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
                      href={`/manager/recommendations/${item.id}`}
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
