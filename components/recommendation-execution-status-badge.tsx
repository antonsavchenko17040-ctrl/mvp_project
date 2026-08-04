"use client";

import { Badge } from "@/components/ui/badge";
import {
  EXECUTION_STATUS_LABELS,
  executionStatusSourceText,
  resolveExecutionStatusLabel,
  type ExecutionCanonicalLabel,
} from "@/lib/recommendation-execution-status";
import { cn } from "@/lib/utils";

const BADGE_CLASS: Record<ExecutionCanonicalLabel, string> = {
  [EXECUTION_STATUS_LABELS.deadlineNotReached]: "bg-sky-100 text-sky-900",
  [EXECUTION_STATUS_LABELS.notDone]: "bg-rose-100 text-rose-900",
  [EXECUTION_STATUS_LABELS.partial]: "bg-amber-100 text-amber-950",
  [EXECUTION_STATUS_LABELS.full]: "bg-emerald-100 text-emerald-900",
  "—": "bg-muted text-muted-foreground",
};

export function RecommendationExecutionStatusBadge({
  progressReport,
  executionIndicator,
  className,
}: {
  progressReport?: string | null;
  executionIndicator: string;
  className?: string;
}) {
  const source = executionStatusSourceText(progressReport, executionIndicator);
  const label = resolveExecutionStatusLabel(source);
  return (
    <Badge
      className={cn("max-w-full whitespace-normal text-left font-medium", BADGE_CLASS[label], className)}
      title={source.trim() ? source : undefined}
    >
      {label}
    </Badge>
  );
}
