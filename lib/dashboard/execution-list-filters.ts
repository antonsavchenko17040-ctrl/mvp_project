import {
  EXECUTION_STATUS_LABELS,
  executionStatusSourceText,
  resolveExecutionStatusLabel,
  type ExecutionCanonicalLabel,
} from "@/lib/recommendation-execution-status";

export const dashboardExecutionListFilters = [
  {
    key: "all" as const,
    label: "Усі",
    chip: "border-neutral-900 text-neutral-900 hover:bg-neutral-50",
    dot: "bg-neutral-900",
    active: "bg-neutral-100",
  },
  {
    key: "full" as const,
    label: "Виконано повністю",
    chip: "border-[#3d8b24] text-[#3d8b24] hover:bg-[#cfecc4]/40",
    dot: "bg-[#3d8b24]",
    active: "bg-[#cfecc4]/60",
  },
  {
    key: "partial" as const,
    label: "Виконано частково",
    chip: "border-[#9f8413] text-[#9f8413] hover:bg-[#f3e9b6]/50",
    dot: "bg-[#9f8413]",
    active: "bg-[#f3e9b6]/70",
  },
  {
    key: "notDone" as const,
    label: "Не виконано",
    chip: "border-[#9b2f2f] text-[#9b2f2f] hover:bg-[#f3c8c8]/40",
    dot: "bg-[#9b2f2f]",
    active: "bg-[#f3c8c8]/60",
  },
  {
    key: "deadlineNotReached" as const,
    label: "Термін не настав",
    chip: "border-[#2f5e9a] text-[#2f5e9a] hover:bg-[#c8def6]/40",
    dot: "bg-[#2f5e9a]",
    active: "bg-[#c8def6]/60",
  },
] as const;

export type DashboardExecutionListFilterKey = (typeof dashboardExecutionListFilters)[number]["key"];

export function parseDashboardExecutionListFilter(
  raw: string | undefined,
): DashboardExecutionListFilterKey {
  return dashboardExecutionListFilters.some((f) => f.key === raw)
    ? (raw as DashboardExecutionListFilterKey)
    : "all";
}

function labelToFilterKey(label: ExecutionCanonicalLabel): DashboardExecutionListFilterKey | null {
  if (label === EXECUTION_STATUS_LABELS.full) return "full";
  if (label === EXECUTION_STATUS_LABELS.partial) return "partial";
  if (label === EXECUTION_STATUS_LABELS.notDone) return "notDone";
  if (label === EXECUTION_STATUS_LABELS.deadlineNotReached) return "deadlineNotReached";
  return null;
}

export function recommendationMatchesExecutionListFilter(
  item: {
    status?: string;
    progressReport?: string | null;
    executionIndicator?: string | null;
  },
  filter: DashboardExecutionListFilterKey,
): boolean {
  if (filter === "all") return true;
  // Стан виконання публічно — лише після верифікації.
  if (item.status && item.status !== "published") return false;
  const label = resolveExecutionStatusLabel(
    executionStatusSourceText(item.progressReport, item.executionIndicator),
  );
  return labelToFilterKey(label) === filter;
}
