"use client";

import { EditorRecommendationTableCell } from "@/components/editor/editor-recommendation-table-cell";
import { EditorRecommendationTableRow } from "@/components/editor/editor-recommendation-table-row";
import { RecommendationExecutionStatusBadge } from "@/components/recommendation-execution-status-badge";
import { SspUnitsDisplay } from "@/components/ssp-units-display";
import { TableSortableTh } from "@/components/table-sortable-th";
import { Badge } from "@/components/ui/badge";
import {
  dashboardFolderSortDefaults,
  type DashboardFolderSortKey,
} from "@/lib/dashboard/folder-table-sort";
import {
  dataTable,
  dataTableClassName,
  dataTableCols,
  dataTableWrapClassName,
} from "@/lib/ui/data-table";
import { type TableSortState, applySortParams } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

const clampText = "m-0 break-words text-left text-sm leading-snug text-foreground line-clamp-3";

export type { DashboardFolderSortKey } from "@/lib/dashboard/folder-table-sort";
export { dashboardFolderSortDefaults, dashboardFolderSortKeys } from "@/lib/dashboard/folder-table-sort";

export type DashboardFolderRecommendationRow = {
  id: string;
  sequenceNumber: number;
  recommendationText: string;
  sspUnit: string;
  measuresDescription: string | null;
  executionIndicator: string;
  progressReport: string | null;
};

type DashboardFolderRecommendationsTableProps = {
  recommendationHrefPrefix: string;
  folderHref: string;
  executionQuery?: string;
  searchQuery?: string;
  sspQuery?: string;
  statusQuery?: string;
  sort: TableSortState<DashboardFolderSortKey>;
  recommendations: DashboardFolderRecommendationRow[];
};

export function DashboardFolderRecommendationsTable({
  recommendationHrefPrefix,
  folderHref,
  executionQuery,
  searchQuery = "",
  sspQuery = "",
  statusQuery = "",
  sort,
  recommendations,
}: DashboardFolderRecommendationsTableProps) {
  const preserveParams = {
    execution: executionQuery && executionQuery !== "all" ? executionQuery : undefined,
    q: searchQuery || undefined,
    ssp: sspQuery || undefined,
    status: statusQuery || undefined,
  };

  const detailQuery = () => {
    const params = new URLSearchParams();
    if (preserveParams.execution) params.set("execution", preserveParams.execution);
    if (preserveParams.q) params.set("q", preserveParams.q);
    if (preserveParams.ssp) params.set("ssp", preserveParams.ssp);
    if (preserveParams.status) params.set("status", preserveParams.status);
    applySortParams(params, sort);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <div className={dataTableWrapClassName()}>
      <table className={dataTableClassName(dataTableCols.recommendationTableMin)}>
        <thead className={dataTable.thead}>
          <tr className={dataTable.headRow}>
            <TableSortableTh
              label="№"
              column="number"
              sort={sort}
              defaults={dashboardFolderSortDefaults}
              pathname={folderHref}
              preserveParams={preserveParams}
              className={dataTableCols.num}
              align="center"
            />
            <th className={cn(dataTable.th, dataTableCols.text)}>Рекомендація</th>
            <th className={cn(dataTable.th, dataTableCols.text)}>Заходи</th>
            <TableSortableTh
              label="Підрозділ"
              column="sspUnit"
              sort={sort}
              defaults={dashboardFolderSortDefaults}
              pathname={folderHref}
              preserveParams={preserveParams}
              className={dataTableCols.ssp}
            />
            <TableSortableTh
              label="Стан виконання"
              column="execution"
              sort={sort}
              defaults={dashboardFolderSortDefaults}
              pathname={folderHref}
              preserveParams={preserveParams}
              className={dataTableCols.status}
              align="center"
            />
          </tr>
        </thead>
        <tbody>
          {recommendations.map((item) => (
            <EditorRecommendationTableRow
              key={item.id}
              href={`${recommendationHrefPrefix}/${item.id}${detailQuery()}`}
            >
              <EditorRecommendationTableCell
                className={cn(dataTableCols.num, "text-sm tabular-nums")}
                align="center"
              >
                {item.sequenceNumber}
              </EditorRecommendationTableCell>
              <EditorRecommendationTableCell className={dataTableCols.text}>
                <p className={cn(clampText, "w-full min-w-0")}>{item.recommendationText}</p>
              </EditorRecommendationTableCell>
              <EditorRecommendationTableCell className={dataTableCols.text}>
                <p className={clampText}>{item.measuresDescription ?? "—"}</p>
              </EditorRecommendationTableCell>
              <EditorRecommendationTableCell className={dataTableCols.ssp}>
                <SspUnitsDisplay value={item.sspUnit} />
              </EditorRecommendationTableCell>
              <EditorRecommendationTableCell className={dataTableCols.status} align="center">
                <div className="flex items-center justify-center">
                  {item.progressReport || item.executionIndicator.trim() ? (
                    <RecommendationExecutionStatusBadge
                      progressReport={item.progressReport}
                      executionIndicator={item.executionIndicator}
                      className="whitespace-normal"
                    />
                  ) : (
                    <Badge className="whitespace-normal bg-muted font-medium text-muted-foreground">—</Badge>
                  )}
                </div>
              </EditorRecommendationTableCell>
            </EditorRecommendationTableRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}
