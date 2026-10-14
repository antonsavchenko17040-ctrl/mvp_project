import { DATA_TABLE_CELL_TEXT, dataTable } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

export function EditorRecommendationTableCell({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  const content =
    typeof children === "string" || typeof children === "number" ? (
      <p
        className={cn(
          DATA_TABLE_CELL_TEXT,
          align === "center" && "text-center",
        )}
      >
        {children}
      </p>
    ) : (
      children
    );

  return (
    <td
      className={cn(
        dataTable.cell,
        align === "center" && "text-center",
        className,
      )}
      style={{ verticalAlign: "middle" }}
    >
      <div
        className={cn(
          "flex h-full max-h-full min-h-0 w-full items-center overflow-hidden",
          align === "center" && "justify-center text-center",
        )}
      >
        <div className="min-h-0 w-full overflow-hidden">{content}</div>
      </div>
    </td>
  );
}

export function formatRecommendationDate(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
