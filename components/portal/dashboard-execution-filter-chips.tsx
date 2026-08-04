import Link from "next/link";

import { dashboardExecutionListFilters, type DashboardExecutionListFilterKey } from "@/lib/dashboard/execution-list-filters";
import { applySortParams, type TableSortState } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

type DashboardExecutionFilterChipsProps = {
  folderHref: string;
  activeFilter: DashboardExecutionListFilterKey;
  searchQuery?: string;
  sort?: TableSortState;
};

export function DashboardExecutionFilterChips({
  folderHref,
  activeFilter,
  searchQuery = "",
  sort,
}: DashboardExecutionFilterChipsProps) {
  const hrefFor = (key: DashboardExecutionListFilterKey) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("execution", key);
    if (searchQuery) params.set("q", searchQuery);
    if (sort) applySortParams(params, sort);
    const qs = params.toString();
    return qs ? `${folderHref}?${qs}` : folderHref;
  };

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {dashboardExecutionListFilters.map((item) => {
        const selected = activeFilter === item.key;
        return (
          <Link
            key={item.key}
            href={hrefFor(item.key)}
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
  );
}
