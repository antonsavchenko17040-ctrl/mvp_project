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
  /**
   * Єдина мінімальна ширина таблиць рекомендацій (еталон — простір Редактора).
   * w-full з dataTable.table + цей min-w — однакова поведінка в усіх робочих просторах.
   */
  recommendationTableMin: "min-w-[1280px]",
  num: "w-12",
  folder: "w-40",
  text: "min-w-[11rem]",
  deadline: "w-40 min-w-[10rem]",
  significance: "w-[10rem] min-w-[10rem]",
  status: "w-40 min-w-[10rem]",
  /** Ширша колонка: повні назви одного або кількох ССП у кілька рядків. */
  ssp: "min-w-[16rem] w-64",
  actions: "w-28",
} as const;

/**
 * Картка списку Відповідальний / Керівник / Аналітик.
 * Еталон зовнішніх розмірів — поточний вигляд Відповідального:
 * однакова ширина контейнера й таблиці, стабільні відступи, table-fixed.
 */
export const roleWorkspaceListCard = {
  card: "relative w-full min-w-0 max-w-full gap-0 overflow-hidden rounded-3xl border border-black/10 bg-white py-0 pb-4 shadow-sm ring-0",
  content: "w-full min-w-0 space-y-4 px-4 pt-4 sm:pt-5",
  searchWrap: "w-full min-w-0 rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:p-3.5",
  tableWrap: "w-full min-w-0 max-w-full overflow-x-auto rounded-3xl border border-black",
  /** Та сама min-ширина, що recommendationTableMin, + table-fixed щоб вміст не роздував таблицю. */
  table: "w-full min-w-[1280px] table-fixed border-collapse text-sm",
} as const;

export function dataTableWrapClassName(className?: string) {
  return cn(dataTable.wrap, className);
}

export function dataTableClassName(className?: string) {
  return cn(dataTable.table, className);
}
