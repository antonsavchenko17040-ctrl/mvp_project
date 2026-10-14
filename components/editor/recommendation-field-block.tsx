import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function RecommendationFieldBlock({
  label,
  htmlFor,
  hint,
  required = false,
  optional = false,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  /** Показує позначку обов’язкового поля. */
  required?: boolean;
  /** Показує позначку необов’язкового поля. */
  optional?: boolean;
  children: React.ReactNode;
}) {
  const showOptional = optional && !required;

  return (
    <div className="flex gap-3 sm:gap-4">
      <span
        className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#3a6fb8] sm:mt-3 sm:h-1.5 sm:w-1.5"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={htmlFor} className="text-base font-medium">
          <span>{label}</span>
          {required ? (
            <span className="ml-1 font-semibold text-destructive" title="Обов’язкове поле">
              *
              <span className="sr-only"> (обов’язкове)</span>
            </span>
          ) : null}
          {showOptional ? (
            <span className={cn("ml-1.5 text-sm font-normal text-muted-foreground")}>
              (необов’язково)
            </span>
          ) : null}
        </Label>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {children}
      </div>
    </div>
  );
}
