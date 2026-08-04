import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ReportFolderStatBlock = {
  key: string;
  value: number;
  label: string;
};

type ReportFolderHeaderCardProps = {
  title: string;
  createdAt: Date;
  stats: readonly ReportFolderStatBlock[];
  /** `banner` — повний синій хіро (простір редактора). */
  variant?: "default" | "banner";
  archivedAt?: Date | null;
};

export function ReportFolderHeaderCard({
  title,
  createdAt,
  stats,
  variant = "default",
  archivedAt = null,
}: ReportFolderHeaderCardProps) {
  const folderCreatedLabel = createdAt.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const archivedLabel = archivedAt
    ? archivedAt.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  if (variant === "banner") {
    return (
      <div className="relative w-full overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#3a6fb5_0%,#4a7fc7_42%,#5c8fd4_72%,#6b9cdc_100%)] py-5 pr-5 pl-8 text-white shadow-sm sm:py-6 sm:pr-6 sm:pl-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, #fff 0%, transparent 42%), radial-gradient(circle at 88% 0%, #fff 0%, transparent 36%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 min-w-0 space-y-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-white/95">Папка звіту</span>
            <span className="text-sm text-white/75">Створено {folderCreatedLabel}</span>
            {archivedLabel ? (
              <span className="rounded-full border border-white/50 bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                Архівовано {archivedLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2.5 text-left text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl md:text-3xl">
            {title}
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-0">
            {stats.map((block, index) => (
              <div
                key={block.key}
                className={cn(
                  "flex flex-col items-start gap-0.5 pr-3 sm:pr-5",
                  index > 0 && "border-t border-white/25 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5",
                )}
              >
                <span className="text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
                  {block.value}
                </span>
                <span className="text-xs font-normal lowercase leading-tight text-white/80 sm:text-sm">
                  {block.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="relative w-full gap-0 overflow-hidden rounded-lg border border-black/20 bg-white py-0 shadow-sm ring-0">
      <div
        className="pointer-events-none absolute top-0 left-0 bottom-0 z-0 w-[2%] bg-[linear-gradient(to_right,#4a7fc7_0%,#5c8fd4_9%,#7caee6_20%,#a8c9f0_36%,#d6e6f7_54%,#eef4fb_72%,#ffffff_100%)]"
        aria-hidden
      />
      <CardContent className="relative z-10 min-w-0 space-y-0 pl-[2%] pr-4 py-4 sm:pr-5 sm:py-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-foreground">Папка звіту</span>
          <span className="text-sm text-muted-foreground">Створено {folderCreatedLabel}</span>
          {archivedLabel ? (
            <span className="rounded-full border border-slate-400/70 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Архівовано {archivedLabel}
            </span>
          ) : null}
        </div>
        <h2 className="mt-2.5 text-left text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-0">
          {stats.map((block, index) => (
            <div
              key={block.key}
              className={cn(
                "flex flex-col items-start gap-0.5 pr-3 sm:pr-4",
                index > 0 && "border-t border-[#e5e7eb] pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4",
              )}
            >
              <span className="text-lg font-bold tabular-nums leading-none text-foreground sm:text-xl">
                {block.value}
              </span>
              <span className="text-xs font-normal lowercase leading-tight text-muted-foreground sm:text-sm">
                {block.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
