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

type FilterOption = { key: string; label: string };

type RoleWorkspaceColumnFilterThProps<TKey extends string> = {
  /** Для aria/title сортування (напр. «Етап виконання», «Термін виконання»). */
  label: string;
  column: TKey;
  filterParam: "status" | "deadline";
  sort: TableSortState<TKey>;
  defaults: TableSortState<TKey>;
  pathname: string;
  preserveParams?: Record<string, string | undefined | null>;
  /** Якщо передано — замість стандартних ROLE_WORKSPACE_* опцій. */
  options?: readonly FilterOption[];
  className?: string;
  align?: "left" | "center";
};

/** Заголовок колонки = dropdown фільтра; поруч іконка сортування. */
export function RoleWorkspaceColumnFilterTh<TKey extends string>({
  label,
  column,
  filterParam,
  sort,
  defaults,
  pathname,
  preserveParams = {},
  options: optionsProp,
  className,
  align = "left",
}: RoleWorkspaceColumnFilterThProps<TKey>) {
  const router = useRouter();
  const currentPathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const searchParamsKey = searchParams.toString();

  const options =
    optionsProp ??
    (filterParam === "status" ? ROLE_WORKSPACE_STATUS_FILTERS : ROLE_WORKSPACE_DEADLINE_FILTERS);
  const rawSelected = searchParams.get(filterParam) ?? undefined;
  const selectedValue = optionsProp
    ? options.some((item) => item.key === rawSelected)
      ? (rawSelected as string)
      : "all"
    : filterParam === "status"
      ? parseRoleWorkspaceStatusFilter(rawSelected)
      : parseRoleWorkspaceDeadlineFilter(rawSelected);

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
  const sortTitle = willReset ? "Скинути сортування" : `Сортувати за: ${label}`;
  const selectedLabel =
    options.find((item) => item.key === selectedValue)?.label ?? label;

  return (
    <th className={cn(baseTh, className)} aria-sort={ariaSort}>
      <div
        className={cn(
          align === "center" ? dataTable.thInnerCenter : dataTable.thInner,
          "w-full",
        )}
      >
        <label className="relative min-w-0 flex-1 cursor-pointer">
          <span
            className={cn(
              dataTable.thLabel,
              "pointer-events-none block pr-3.5",
              align === "center" && "text-center",
              active ? "text-foreground" : "text-foreground/80",
              isPending && "opacity-80",
            )}
            aria-hidden
          >
            {selectedLabel}
          </span>
          <select
            value={selectedValue}
            onChange={(e) => onFilterChange(e.target.value)}
            aria-label={label}
            title={selectedLabel}
            className={cn(
              "absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0",
              "opacity-0 outline-none",
            )}
          >
            {options.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute top-0.5 right-0 text-[10px] leading-none text-foreground/70"
            aria-hidden
          >
            ▾
          </span>
        </label>
        <Link
          href={sortHref}
          className={cn(
            "inline-flex shrink-0 items-start rounded-sm text-inherit transition-colors hover:text-foreground",
            active ? "text-foreground" : "text-foreground/80",
          )}
          title={sortTitle}
          aria-label={sortTitle}
        >
          <SortIcon active={active} dir={sort.dir} />
        </Link>
      </div>
    </th>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  const className = "mt-0.5 size-3.5 shrink-0 opacity-70";
  if (!active) return <ArrowUpDown className={className} aria-hidden />;
  if (dir === "asc") return <ArrowUp className={className} aria-hidden />;
  return <ArrowDown className={className} aria-hidden />;
}
