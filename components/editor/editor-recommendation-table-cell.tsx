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
          "m-0 line-clamp-3 break-words text-sm leading-snug text-foreground",
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
        "p-3 align-middle",
        align === "center" && "text-center",
        className,
      )}
      style={{ verticalAlign: "middle" }}
    >
      {content}
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
