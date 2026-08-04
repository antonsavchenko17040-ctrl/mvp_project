import { FileText } from "lucide-react";
import type { ReactNode } from "react";

export function RecommendationDetailHeader({
  title,
  updatedAtLabel,
  meta,
}: {
  title: ReactNode;
  updatedAtLabel: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <span className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#3a6fb8] text-white shadow-sm sm:mt-1">
        <FileText className="size-6" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-1 sm:gap-x-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{updatedAtLabel}</p>
          </div>
          {meta ? <div className="min-w-0 shrink-0">{meta}</div> : null}
        </div>
      </div>
    </div>
  );
}
