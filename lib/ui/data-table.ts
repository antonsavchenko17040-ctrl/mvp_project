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

export function dataTableWrapClassName(className?: string) {
  return cn(dataTable.wrap, className);
}

export function dataTableClassName(className?: string) {
  return cn(dataTable.table, className);
}
