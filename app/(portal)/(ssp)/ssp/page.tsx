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
import { recommendationsVisibleToSspWhere } from "@/lib/ssp/recommendation-access";
import { sspWorkspaceStatusLabel } from "@/lib/ssp/ssp-status-label";
import type { RecommendationStatus } from "@/lib/types";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
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

const sspListFilters = [
  {
    key: "all" as const,
    label: "Усі",
    chip: "border-neutral-900 text-neutral-900 hover:bg-neutral-50",
    dot: "bg-neutral-900",
    active: "bg-neutral-100",
  },
  {
    key: "in_progress" as const,
    label: "Виконати",
    chip: "border-sky-600 text-sky-800 hover:bg-sky-50/70",
    dot: "bg-sky-600",
    active: "bg-sky-50",
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
    label: "Доопрацювати",
    chip: "border-orange-600 text-orange-900 hover:bg-orange-50/70",
    dot: "bg-orange-600",
    active: "bg-orange-50",
  },
  {
    key: "ssp_draft" as const,
    label: "Чернетка",
    chip: "border-violet-500 text-violet-800 hover:bg-violet-50/60",
    dot: "bg-violet-500",
    active: "bg-violet-50",
  },
  {
    key: "published" as const,
    label: "Виконано",
    chip: "border-emerald-600 text-emerald-700 hover:bg-emerald-50/60",
    dot: "bg-emerald-600",
    active: "bg-emerald-50",
  },
] as const;

type SspListFilterKey = (typeof sspListFilters)[number]["key"];

const sspDeadlineFilters = [
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

type SspDeadlineFilterKey = (typeof sspDeadlineFilters)[number]["key"];

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
    sort?: string;
    dir?: string;
    highlight?: string;
  }>;
}) {
  const profile = await requireRole(["ssp"]);
  const query = await searchParams;
  const raw = query.status ?? "";
  const activeFilter: SspListFilterKey = sspListFilters.some((f) => f.key === raw)
    ? (raw as SspListFilterKey)
    : "all";
  const rawDeadline = query.deadline ?? "";
  const activeDeadlineFilter: SspDeadlineFilterKey = sspDeadlineFilters.some((f) => f.key === rawDeadline)
    ? (rawDeadline as SspDeadlineFilterKey)
    : "all";
  const searchQuery = (query.q ?? "").trim().toLowerCase();
  const sort = parseTableSort(query, sspSortKeys, sspSortDefaults);
  const highlightId = (query.highlight ?? "").trim();

  const visibilityWhere = await recommendationsVisibleToSspWhere(profile.id);
  const statusCondition =
    activeFilter === "on_review"
      ? { status: { in: ["manager_review", "on_review"] as RecommendationStatus[] } }
      : { status: activeFilter as RecommendationStatus };
  const where =
    activeFilter === "all" ? visibilityWhere : { AND: [visibilityWhere, statusCondition] };

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
    ? withDeadlineMeta.filter((item) => {
        const statusLabel = sspWorkspaceStatusLabel({
          status: item.status,
          analystComment: item.analystComment,
          managerComment: item.managerComment,
        });
        const haystack = [
          item.sequenceNumber,
          item.auditFolder.title,
          item.deficiency,
          item.recommendationText,
          item.observationSignificance,
          formatRecommendationDate(item.deadline),
          statusLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchQuery);
      })
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
    highlight: highlightId || undefined,
  };

  const statusHref = (key: SspListFilterKey) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("status", key);
    if (activeDeadlineFilter !== "all") params.set("deadline", activeDeadlineFilter);
    if (searchQuery) params.set("q", searchQuery);
    applySortParams(params, sort);
    const qs = params.toString();
    return qs ? `/ssp?${qs}` : "/ssp";
  };

  const deadlineHref = (key: SspDeadlineFilterKey) => {
    const params = new URLSearchParams();
    if (activeFilter !== "all") params.set("status", activeFilter);
    if (key !== "all") params.set("deadline", key);
    if (searchQuery) params.set("q", searchQuery);
    applySortParams(params, sort);
    const qs = params.toString();
    return qs ? `/ssp?${qs}` : "/ssp";
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-semibold">Простір Відповідального</h1>
      </div>

      <Card className="relative w-full gap-0 overflow-hidden rounded-lg border border-black/20 bg-white py-0 pb-3 shadow-sm ring-0">
        <CardContent className="space-y-3 pt-3 sm:pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {sspListFilters.map((item) => {
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
                {sspDeadlineFilters.map((item) => {
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
            <Suspense
              fallback={
                <div className="h-9 min-w-[12rem] flex-1 rounded-3xl border bg-white sm:h-10 sm:max-w-xs" />
              }
            >
              <EditorFolderSearch />
            </Suspense>
          </div>

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
