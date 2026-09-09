"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ROLE_WORKSPACE_DEADLINE_FILTERS,
  ROLE_WORKSPACE_STATUS_FILTERS,
  parseRoleWorkspaceDeadlineFilter,
  parseRoleWorkspaceStatusFilter,
} from "@/lib/role-workspace-list-filters";
import { dataTable } from "@/lib/ui/data-table";
import {
  applySortParams,
  defaultDirForSortKey,
  nextTableSort,
  type SortDir,
  type TableSortState,
} from "@/lib/table-sort";
import { cn } from "@/lib/utils";

type RoleWorkspaceColumnFilterThProps<TKey extends string> = {
  label: string;
  column: TKey;
  filterParam: "status" | "deadline";
  sort: TableSortState<TKey>;
  defaults: TableSortState<TKey>;
  pathname: string;
  preserveParams?: Record<string, string | undefined | null>;
  className?: string;
  align?: "left" | "center";
};

export function RoleWorkspaceColumnFilterTh<TKey extends string>({
  label,
  column,
  filterParam,
  sort,
  defaults,
  pathname,
  preserveParams = {},
  className,
  align = "left",
}: RoleWorkspaceColumnFilterThProps<TKey>) {
  const router = useRouter();
  const currentPathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const searchParamsKey = searchParams.toString();

  const options =
    filterParam === "status" ? ROLE_WORKSPACE_STATUS_FILTERS : ROLE_WORKSPACE_DEADLINE_FILTERS;
  const selectedValue =
    filterParam === "status"
      ? parseRoleWorkspaceStatusFilter(searchParams.get("status") ?? undefined)
      : parseRoleWorkspaceDeadlineFilter(searchParams.get("deadline") ?? undefined);

  const active = sort.explicit && sort.key === column;
  const next = nextTableSort(sort, column, defaults);
  const willReset = active && sort.dir !== defaultDirForSortKey(column);
  const sortParams = new URLSearchParams();
  for (const [key, value] of Object.entries(preserveParams)) {
    if (value) sortParams.set(key, value);
  }
  applySortParams(sortParams, next);
  const sortQs = sortParams.toString();
  const sortHref = sortQs ? `${pathname}?${sortQs}` : pathname;

  const onFilterChange = (nextValue: string) => {
    const params = new URLSearchParams(searchParamsKey);
    if (nextValue && nextValue !== "all") params.set(filterParam, nextValue);
    else params.delete(filterParam);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${currentPathname}?${qs}` : currentPathname);
    });
  };

  const baseTh = align === "center" ? dataTable.thCenter : dataTable.th;
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className={cn(baseTh, className)} aria-sort={ariaSort}>
      <div className={cn("flex flex-col gap-1.5", align === "center" && "items-center")}>
        <Link
          href={sortHref}
          className={cn(
            "inline-flex max-w-full items-start gap-1 rounded-sm text-inherit transition-colors hover:text-foreground",
            align === "center" && "justify-center",
            active ? "text-foreground" : "text-foreground/80",
          )}
          title={willReset ? "Скинути сортування" : `Сортувати за: ${label.replace(/\n/g, " ")}`}
        >
          <span className="min-w-0 text-left leading-tight whitespace-pre-line">{label}</span>
          <SortIcon active={active} dir={sort.dir} />
        </Link>
        <select
          value={selectedValue}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label={label.replace(/\n/g, " ")}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-white px-2 text-xs font-normal text-foreground outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            isPending && "opacity-80",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </th>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  const className = "size-3.5 shrink-0 opacity-70";
  if (!active) return <ArrowUpDown className={className} aria-hidden />;
  if (dir === "asc") return <ArrowUp className={className} aria-hidden />;
  return <ArrowDown className={className} aria-hidden />;
}
