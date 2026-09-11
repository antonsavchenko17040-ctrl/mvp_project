"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import type { RecommendationStatus } from "@/lib/types";
import { dataTable, dataTableCols } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

type AdminRecommendationRowProps = {
  id: string;
  vkElement: string;
  recommendationText: string;
  observationSignificance: string;
  status: RecommendationStatus;
  progressReport: string | null;
  isActive: boolean;
  actions: ReactNode;
};

export function AdminRecommendationRow({
  id,
  vkElement,
  recommendationText,
  observationSignificance,
  status,
  progressReport,
  isActive,
  actions,
}: AdminRecommendationRowProps) {
  const router = useRouter();

  return (
    <tr
      role="link"
      tabIndex={0}
      className={cn(
        dataTable.bodyRow,
        dataTable.rowHover,
        "cursor-pointer align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        !isActive && "bg-muted/40 text-muted-foreground",
      )}
      onClick={() => router.push(`/admin/recommendations/${id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/admin/recommendations/${id}`);
        }
      }}
    >
      <td className={cn(dataTable.cell, dataTableCols.folder)}>{vkElement}</td>
      <td className={cn(dataTable.cell, dataTableCols.text)}>
        {recommendationText}
        {!isActive ? (
          <span className="mt-1 block text-sm font-medium text-destructive">Деактивована</span>
        ) : null}
      </td>
      <td className={cn(dataTable.cell, dataTableCols.significance, "whitespace-nowrap text-center")}>
        {observationSignificance}
      </td>
      <td className={cn(dataTable.cell, dataTableCols.status, "whitespace-nowrap text-center")}>
        <div className="flex justify-center">
          <RecommendationStatusBadge status={status} className="whitespace-nowrap" />
        </div>
      </td>
      <td className={cn(dataTable.cell, dataTableCols.text, "whitespace-nowrap")}>{progressReport ?? "-"}</td>
      <td
        className={cn(dataTable.cell, dataTableCols.actions)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {actions}
      </td>
    </tr>
  );
}
