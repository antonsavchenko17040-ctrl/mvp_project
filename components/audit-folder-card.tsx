import Link from "next/link";
import { FileText } from "lucide-react";

import type { RecommendationStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { countExecutionStatuses } from "@/lib/recommendation-execution-status";
import { cn } from "@/lib/utils";

export type AuditFolderCardFolderBase = {
  id: string;
  title: string;
  year: number;
  archivedAt?: Date | string | null;
};

export type AuditFolderCardWorkflowFolder = AuditFolderCardFolderBase & {
  recommendations: { status: RecommendationStatus }[];
};

export type AuditFolderCardExecutionFolder = AuditFolderCardFolderBase & {
  recommendations: {
    status?: RecommendationStatus | string;
    progressReport?: string | null;
    executionIndicator?: string | null;
  }[];
};

export type AuditFolderCardFolder = AuditFolderCardWorkflowFolder | AuditFolderCardExecutionFolder;

type AuditFolderCardProps =
  | { folder: AuditFolderCardWorkflowFolder; href: string; variant?: "workflow" }
  | { folder: AuditFolderCardExecutionFolder; href: string; variant: "execution" };

const EXECUTION_BADGES = [
  { key: "full" as const, label: "Виконано повністю", className: "bg-[#cfecc4] text-[#3d8b24]" },
  { key: "partial" as const, label: "Виконано частково", className: "bg-[#f3e9b6] text-[#9f8413]" },
  { key: "notDone" as const, label: "Не виконано", className: "bg-[#f3c8c8] text-[#9b2f2f]" },
  {
    key: "deadlineNotReached" as const,
    label: "Термін виконання не настав",
    className: "bg-[#c8def6] text-[#2f5e9a]",
  },
] as const;

export function AuditFolderCard(props: AuditFolderCardProps) {
  const { folder, href, variant = "workflow" } = props;
  const total = folder.recommendations.length;
  const isArchived = folder.archivedAt != null && folder.archivedAt !== "";

const executionCounts =
  props.variant === "execution"
    ? countExecutionStatuses(
        props.folder.recommendations.filter(
          (item) => !item.status || item.status === "published",
        ),
      )
    : null;

  const workflowCounts =
    variant === "workflow"
      ? {
          inProgress: folder.recommendations.filter(
            (item) => item.status === "in_progress" || item.status === "ssp_draft",
          ).length,
          revision: folder.recommendations.filter((item) => item.status === "revision").length,
          onReview: folder.recommendations.filter((item) => item.status === "on_review").length,
          done: folder.recommendations.filter((item) => item.status === "published").length,
        }
      : null;

  return (
    <Link href={href} className="block h-full min-h-0">
      <Card
        className={cn(
          "h-full min-h-0 origin-center rounded-2xl border shadow-sm transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out will-change-transform",
          "motion-safe:hover:z-10 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.03] motion-safe:hover:shadow-md",
          "focus-within:z-10 motion-safe:focus-within:-translate-y-0.5 motion-safe:focus-within:scale-[1.03]",
          isArchived
            ? "border-slate-500 bg-[#d5d9e0] text-slate-900 shadow-inner hover:border-slate-600 hover:bg-[#c4c9d2]"
            : "border-[#b9c2ce] bg-[#edf2f8] hover:border-[#7f93ad] hover:bg-[#e2ebf6]",
        )}
      >
        <CardHeader className="shrink-0 pb-1">
          <div className="flex items-start gap-2">
            <FileText
              className={cn("mt-0.5 size-5 shrink-0 2xl:size-6", isArchived && "text-slate-700")}
            />
            <div className="min-w-0 flex-1">
              <CardTitle
                className={cn(
                  "line-clamp-2 text-xl leading-6 2xl:text-2xl 2xl:leading-7",
                  isArchived && "text-slate-900",
                )}
              >
                {folder.title}
              </CardTitle>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground 2xl:text-sm">
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                    isArchived
                      ? "border-slate-500 bg-slate-100 text-slate-800"
                      : "border-black/40 bg-white text-foreground",
                  )}
                >
                  {folder.year}
                </span>
                {isArchived ? (
                  <span className="shrink-0 rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-xs font-semibold text-white">
                    Архівовано
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-2 text-base">
          <p className="shrink-0">
            Кількість рекомендацій: <span className="font-semibold">{total}</span>
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {executionCounts
              ? EXECUTION_BADGES.map((badge) => (
                  <span key={badge.key} className={`rounded-full px-3 py-1 ${badge.className}`}>
                    {badge.label}: <strong>{executionCounts[badge.key]}</strong>
                  </span>
                ))
              : workflowCounts
                ? (
                    <>
                      <span className="rounded-full bg-[#c8def6] px-3 py-1 text-[#2f5e9a]">
                        На виконанні: <strong>{workflowCounts.inProgress}</strong>
                      </span>
                      <span className="rounded-full bg-[#f3c8c8] px-3 py-1 text-[#9b2f2f]">
                        На доопрацюванні: <strong>{workflowCounts.revision}</strong>
                      </span>
                      <span className="rounded-full bg-[#f3e9b6] px-3 py-1 text-[#9f8413]">
                        На перевірці: <strong>{workflowCounts.onReview}</strong>
                      </span>
                      <span className="rounded-full bg-[#cfecc4] px-3 py-1 text-[#3d8b24]">
                        Виконані: <strong>{workflowCounts.done}</strong>
                      </span>
                    </>
                  )
                : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
