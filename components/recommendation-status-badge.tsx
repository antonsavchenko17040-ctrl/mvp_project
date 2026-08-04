import { Badge } from "@/components/ui/badge";
import { uk } from "@/lib/i18n/uk";
import type { RecommendationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const mapClass: Record<RecommendationStatus, string> = {
  draft: "bg-slate-100 text-slate-800",
  ssp_draft: "bg-violet-100 text-violet-900",
  in_progress: "bg-blue-100 text-blue-800",
  manager_review: "bg-indigo-100 text-indigo-900",
  on_review: "bg-amber-100 text-amber-800",
  revision: "bg-orange-100 text-orange-800",
  published: "bg-emerald-100 text-emerald-800",
};

export function RecommendationStatusBadge({
  status,
  className,
  label,
}: {
  status: RecommendationStatus;
  className?: string;
  /** Якщо задано — показується замість стандартного підпису з uk.status */
  label?: string;
}) {
  return <Badge className={cn(mapClass[status], className)}>{label ?? uk.status[status]}</Badge>;
}
