import { Label } from "@/components/ui/label";

export function RecommendationFieldBlock({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <span
        className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#3a6fb8] sm:mt-3 sm:h-1.5 sm:w-1.5"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={htmlFor} className="text-base font-medium">
          {label}
        </Label>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {children}
      </div>
    </div>
  );
}
