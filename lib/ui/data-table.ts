import { cn } from "@/lib/utils";

/** Єдиний дизайн data-таблиць (еталон — робоча область редактора). */
export const dataTable = {
  wrap: "overflow-x-auto rounded-3xl border border-black",
  table: "w-full border-collapse text-sm",
  thead: "bg-[#f5f7fa] text-xs font-semibold leading-tight text-foreground",
  headRow: "border-b border-black",
  th: "p-3 text-left align-middle",
  thCenter: "p-3 text-center align-middle",
  bodyRow: "border-t border-black",
  rowHover: "transition-colors hover:bg-[#f2ecbe] focus-visible:bg-[#f2ecbe]",
  cell: "p-3 align-middle [vertical-align:middle]",
  emptyCell: "p-6 text-center align-middle [vertical-align:middle] text-base text-muted-foreground",
} as const;

/**
 * Спільні ширини колонок рекомендаційних таблиць між ролями.
 * Однакові ключі → однакова ширина в усіх робочих просторах.
 */
export const dataTableCols = {
  /** Мінімальна ширина таблиці рекомендацій (рольові списки / папка). */
  recommendationTableMin: "min-w-[1240px]",
  num: "w-12",
  folder: "w-40",
  text: "min-w-[11rem]",
  deadline: "w-40 min-w-[10rem]",
  significance: "w-[8.5rem] min-w-[8.5rem]",
  status: "w-40 min-w-[10rem]",
  ssp: "w-40",
  actions: "w-28",
} as const;

export function dataTableWrapClassName(className?: string) {
  return cn(dataTable.wrap, className);
}

export function dataTableClassName(className?: string) {
  return cn(dataTable.table, className);
}
