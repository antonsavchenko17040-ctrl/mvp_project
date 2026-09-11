import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditFolderCard } from "@/components/audit-folder-card";
import { ReportsLibraryFilters } from "@/components/reports-library-filters";
import { ReportsYearXlsxExport } from "@/components/reports-year-xlsx-export";
import { getDashboardStats, getVerifiedRecentFolders } from "@/lib/repositories/dashboard-repository";

type ManagementReportsOverviewProps = {
  /** Префікс посилання на папку, напр. `/dashboard/folders` або `/reports/folders`. */
  folderHrefPrefix: string;
  /** Блок із картками статистики статусів виконання (лише дашборд / головна). */
  showDashboardSummary?: boolean;
  foldersSectionTitle?: string;
  /** Скільки папок показати; `"all"` — усі з рекомендаціями (бібліотека звітів). */
  verifiedFolderLimit?: number | "all";
  /** Панель пошуку/фільтра року для бібліотеки звітів. */
  enableFolderFilters?: boolean;
  /** Зведений Excel за минулі роки (портальна бібліотека звітів). */
  enableYearExport?: boolean;
  titleQuery?: string;
  yearFilter?: number | null;
  /** Фільтр архіву папок: активні / завершені / усі. */
  archiveFilter?: "active" | "archived" | "all";
};

export async function ManagementReportsOverview({
  folderHrefPrefix,
  showDashboardSummary = false,
  foldersSectionTitle = "Додані звіти",
  verifiedFolderLimit = "all",
  enableFolderFilters = false,
  enableYearExport = false,
  titleQuery = "",
  yearFilter = null,
  archiveFilter = "all",
}: ManagementReportsOverviewProps) {
  const folderFetchLimit = verifiedFolderLimit === "all" ? undefined : verifiedFolderLimit;
  const folders = await getVerifiedRecentFolders(folderFetchLimit);
  const stats = showDashboardSummary ? await getDashboardStats() : null;

  const archiveScopedFolders = folders.filter((folder) => {
    const isArchived = folder.archivedAt != null;
    if (archiveFilter === "active") return !isArchived;
    if (archiveFilter === "archived") return isArchived;
    return true;
  });

  const availableYears = Array.from(new Set(archiveScopedFolders.map((folder) => folder.year))).sort(
    (a, b) => b - a,
  );
  const currentYear = new Date().getFullYear();
  const exportYears = Array.from(new Set(folders.map((folder) => folder.year)))
    .filter((year) => year !== currentYear)
    .sort((a, b) => b - a);
  const normalizedTitleQuery = titleQuery.trim().toLowerCase();
  const filteredFolders = archiveScopedFolders.filter((folder) => {
    if (yearFilter != null && folder.year !== yearFilter) return false;
    if (!normalizedTitleQuery) return true;
    return folder.title.toLowerCase().includes(normalizedTitleQuery);
  });

  const summaryCards = stats
    ? [
        { title: "Рекомендацій", value: stats.total },
        { title: "Виконано повністю", value: stats.full },
        { title: "Виконано частково", value: stats.partial },
        { title: "Не виконано", value: stats.notDone },
        { title: "Термін виконання не настав", value: stats.deadlineNotReached },
      ]
    : [];

  return (
    <section className="space-y-6">
      {showDashboardSummary && stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {summaryCards.map((card) => (
            <Card key={card.title} className="h-full border bg-background">
              <CardHeader className="flex-1">
                <CardTitle className="text-base font-medium text-muted-foreground 2xl:text-lg">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold tabular-nums 2xl:text-6xl">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-3xl font-semibold xl:text-4xl">{foldersSectionTitle}</h2>
        {enableFolderFilters ? (
          <div className="space-y-2">
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-2 rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:flex-row sm:items-center sm:p-3.5">
                  <div className="h-9 min-w-0 flex-1 rounded-3xl border bg-white sm:h-10" />
                  <div className="h-9 w-full rounded-3xl border bg-white sm:h-10 sm:w-40" />
                </div>
              }
            >
              <ReportsLibraryFilters years={availableYears} />
            </Suspense>
            {enableYearExport ? <ReportsYearXlsxExport years={exportYears} /> : null}
          </div>
        ) : null}
        {filteredFolders.length === 0 ? (
          <p className="text-base text-muted-foreground">
            {enableFolderFilters && (normalizedTitleQuery || yearFilter != null)
              ? "За обраними фільтрами папок не знайдено."
              : archiveFilter === "active"
                ? "Активних звітів ще немає."
                : archiveFilter === "archived"
                  ? "Завершених звітів ще немає."
                  : "Папок звітів ще немає."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredFolders.map((folder) => (
              <AuditFolderCard
                key={folder.id}
                folder={folder}
                href={`${folderHrefPrefix}/${folder.id}`}
                variant="execution"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
