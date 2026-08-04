import type { TableSortState } from "@/lib/table-sort";

export const dashboardFolderSortKeys = ["number", "sspUnit", "execution"] as const;
export type DashboardFolderSortKey = (typeof dashboardFolderSortKeys)[number];
export const dashboardFolderSortDefaults: TableSortState<DashboardFolderSortKey> = {
  key: "number",
  dir: "asc",
  explicit: false,
};
