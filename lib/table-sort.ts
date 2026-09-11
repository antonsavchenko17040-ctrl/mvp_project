import {
  EXECUTION_STATUS_LABELS,
  executionStatusSourceText,
  resolveExecutionStatusLabel,
  type ExecutionCanonicalLabel,
} from "@/lib/recommendation-execution-status";
import type { RecommendationStatus } from "@/lib/types";

export type SortDir = "asc" | "desc";

export type TableSortState<TKey extends string = string> = {
  key: TKey;
  dir: SortDir;
  /** true лише коли `sort` явно в URL — інакше дефолтний порядок без «активного» фільтра. */
  explicit: boolean;
};

/** Порядок статусів workflow для сортування таблиць. */
const STATUS_RANK: Record<RecommendationStatus, number> = {
  draft: 1,
  ssp_draft: 2,
  in_progress: 3,
  revision: 4,
  manager_review: 5,
  on_review: 6,
  published: 7,
};

const EXECUTION_RANK: Record<ExecutionCanonicalLabel, number> = {
  [EXECUTION_STATUS_LABELS.deadlineNotReached]: 1,
  [EXECUTION_STATUS_LABELS.notDone]: 2,
  [EXECUTION_STATUS_LABELS.partial]: 3,
  [EXECUTION_STATUS_LABELS.full]: 4,
  "—": 0,
};

export function parseTableSort<TKey extends string>(
  raw: { sort?: string; dir?: string },
  allowed: readonly TKey[],
  defaults: TableSortState<TKey>,
): TableSortState<TKey> {
  const allowedKeys = Array.isArray(allowed) ? allowed : [];
  const key = allowedKeys.includes((raw.sort ?? "") as TKey) ? (raw.sort as TKey) : null;
  if (!key) {
    return { key: defaults.key, dir: defaults.dir, explicit: false };
  }
  const dir: SortDir =
    raw.dir === "desc" || raw.dir === "asc" ? raw.dir : defaultDirForSortKey(key);
  return { key, dir, explicit: true };
}

/** Дефолтний напрям при першому кліку на колонку. */
export function defaultDirForSortKey(key: string): SortDir {
  if (key === "significance") return "desc";
  if (key === "deadline") return "asc";
  return "asc";
}

/**
 * Цикл сортування колонки: увімкнути → протилежний напрям → скинути (дефолт без explicit).
 */
export function nextTableSort<TKey extends string>(
  current: TableSortState<TKey>,
  clicked: TKey,
  defaults: TableSortState<TKey>,
): TableSortState<TKey> {
  if (!current.explicit || current.key !== clicked) {
    return { key: clicked, dir: defaultDirForSortKey(clicked), explicit: true };
  }

  const firstDir = defaultDirForSortKey(clicked);
  const secondDir: SortDir = firstDir === "asc" ? "desc" : "asc";
  if (current.dir === firstDir) {
    return { key: clicked, dir: secondDir, explicit: true };
  }

  return { key: defaults.key, dir: defaults.dir, explicit: false };
}

export function applySortParams(
  params: URLSearchParams,
  sort: TableSortState,
  _defaults?: TableSortState,
) {
  if (!sort.explicit) {
    params.delete("sort");
    params.delete("dir");
    return;
  }
  params.set("sort", sort.key);
  params.set("dir", sort.dir);
}

export function significanceRank(value: string): number {
  const n = value.trim().toLowerCase();
  if (n === "критична" || n === "критичний") return 4;
  if (n === "висока" || n === "високий") return 3;
  if (n === "середня" || n === "середній") return 2;
  if (n === "низька" || n === "низький") return 1;
  return 0;
}

export function statusRank(status: RecommendationStatus): number {
  return STATUS_RANK[status] ?? 0;
}

export function executionLabelRank(
  progressReport: string | null | undefined,
  executionIndicator: string | null | undefined,
): number {
  const label = resolveExecutionStatusLabel(
    executionStatusSourceText(progressReport, executionIndicator),
  );
  return EXECUTION_RANK[label] ?? 0;
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "uk", { sensitivity: "base", numeric: true });
}

export function sortByAccessor<T>(
  rows: T[],
  dir: SortDir,
  accessor: (row: T) => string | number,
  tieBreaker?: (row: T) => string | number,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const primary = compareValues(accessor(left), accessor(right));
    if (primary !== 0) return primary * sign;
    if (tieBreaker) {
      const secondary = compareValues(tieBreaker(left), tieBreaker(right));
      if (secondary !== 0) return secondary;
    }
    return 0;
  });
}
