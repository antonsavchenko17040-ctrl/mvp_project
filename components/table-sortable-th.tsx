import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { dataTable } from "@/lib/ui/data-table";
import {
  applySortParams,
  defaultDirForSortKey,
  nextTableSort,
  type SortDir,
  type TableSortState,
} from "@/lib/table-sort";
import { cn } from "@/lib/utils";

type TableSortableThProps<TKey extends string> = {
  label: string;
  column: TKey;
  sort: TableSortState<TKey>;
  defaults: TableSortState<TKey>;
  /** Базовий шлях без query, напр. `/ssp` */
  pathname: string;
  /** Інші query-параметри, які треба зберегти (status, q, execution…). */
  preserveParams?: Record<string, string | undefined | null>;
  className?: string;
  align?: "left" | "center";
};

export function TableSortableTh<TKey extends string>({
  label,
  column,
  sort,
  defaults,
  pathname,
  preserveParams = {},
  className,
  align = "left",
}: TableSortableThProps<TKey>) {
  const active = sort.explicit && sort.key === column;
  const next = nextTableSort(sort, column, defaults);
  const willReset = active && sort.dir !== defaultDirForSortKey(column);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preserveParams)) {
    if (value) params.set(key, value);
  }
  applySortParams(params, next);
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  const baseTh = align === "center" ? dataTable.thCenter : dataTable.th;
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className={cn(baseTh, className)} aria-sort={ariaSort}>
      <Link
        href={href}
        className={cn(
          "inline-flex max-w-full items-start gap-1 rounded-sm text-inherit transition-colors hover:text-foreground",
          align === "center" && "justify-center",
          active ? "text-foreground" : "text-foreground/80",
        )}
        title={
          willReset
            ? "Скинути сортування"
            : `Сортувати за: ${label.replace(/\n/g, " ")}`
        }
      >
        <span className="min-w-0 text-left leading-tight whitespace-pre-line">{label}</span>
        <SortIcon active={active} dir={sort.dir} />
      </Link>
    </th>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  const className = "size-3.5 shrink-0 opacity-70";
  if (!active) return <ArrowUpDown className={className} aria-hidden />;
  if (dir === "asc") return <ArrowUp className={className} aria-hidden />;
  return <ArrowDown className={className} aria-hidden />;
}
