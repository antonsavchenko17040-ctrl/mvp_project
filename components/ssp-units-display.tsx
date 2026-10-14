import { parseSspUnits } from "@/lib/ssp-units";
import { cn } from "@/lib/utils";

type SspUnitsDisplayProps = {
  value: string | null | undefined;
  className?: string;
  /** Вирівнювання списку (таблиці часто center). */
  align?: "left" | "center";
  /**
   * У таблицях обмежуємо висоту до 6 рядків (фіксований рядок).
   * Поза таблицями — повний список без обрізання.
   */
  clamp?: boolean;
};

/** Список відповідальних ССП — кожна назва окремим рядком. */
export function SspUnitsDisplay({
  value,
  className,
  align = "left",
  clamp = true,
}: SspUnitsDisplayProps) {
  const units = parseSspUnits(value);

  if (units.length === 0) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  // Один текстовий блок з переносами — коректно працює з line-clamp-6.
  const text = units.join("\n");

  return (
    <p
      className={cn(
        "m-0 whitespace-pre-line break-words text-sm leading-snug text-foreground",
        clamp && "line-clamp-6",
        align === "center" && "text-center",
        className,
      )}
    >
      {text}
    </p>
  );
}
