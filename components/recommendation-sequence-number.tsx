export function RecommendationSequenceNumber({ sequenceNumber }: { sequenceNumber: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-black/10 bg-muted/30 px-2.5 py-0.5 text-base font-semibold tabular-nums text-foreground sm:px-3 sm:py-1 sm:text-lg">
      № {sequenceNumber}
    </span>
  );
}
