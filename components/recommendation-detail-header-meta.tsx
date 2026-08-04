import type { ReactNode } from "react";

import { RecommendationSequenceNumber } from "@/components/recommendation-sequence-number";

export function RecommendationDetailHeaderMeta({
  sequenceNumber,
  reportTitle,
  children,
}: {
  sequenceNumber: number;
  /** Назва звіту / папки — праворуч від номера рекомендації. */
  reportTitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <RecommendationSequenceNumber sequenceNumber={sequenceNumber} />
        {reportTitle ? (
          <span className="inline-flex max-w-[min(100%,28rem)] items-center truncate rounded-md border border-[#3a6fb8]/30 bg-[#e8f0fa] px-2.5 py-0.5 text-sm font-medium text-[#2f5e9a] sm:px-3 sm:py-1 sm:text-base">
            Звіт: «{reportTitle}»
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
