import { parseSspUnits } from "@/lib/ssp-units";
import { cn } from "@/lib/utils";

type SspUnitsDisplayProps = {
  value: string | null | undefined;
  className?: string;
  /** Вирівнювання списку (таблиці часто center). */
  align?: "left" | "center";
};

/** Повний список відповідальних ССП — кожна назва окремим рядком, без обрізання. */
export function SspUnitsDisplay({
  value,
  className,
  align = "left",
}: SspUnitsDisplayProps) {
  const units = parseSspUnits(value);

  if (units.length === 0) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  return (
    <ul
      className={cn(
        "m-0 list-none space-y-1 p-0 text-sm leading-snug text-foreground",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {units.map((unit) => (
        <li key={unit} className="whitespace-normal break-words">
          {unit}
        </li>
      ))}
    </ul>
  );
}
