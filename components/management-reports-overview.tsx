import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditFolderCard } from "@/components/audit-folder-card";
import { getDashboardStats, getVerifiedRecentFolders } from "@/lib/repositories/dashboard-repository";

type ManagementReportsOverviewProps = {
  /** Префікс посилання на папку, напр. `/dashboard/folders` або `/public/folders`. */
  folderHrefPrefix: string;
  /** Блок «Управління звітами» і чотири картки статистики (лише дашборд). */
  showDashboardSummary?: boolean;
  foldersSectionTitle?: string;
  /** Скільки папок показати; `"all"` — усі з рекомендаціями (бібліотека звітів). */
  verifiedFolderLimit?: number | "all";
};

export async function ManagementReportsOverview({
  folderHrefPrefix,
  showDashboardSummary = false,
  foldersSectionTitle = "Додані звіти",
  verifiedFolderLimit = "all",
}: ManagementReportsOverviewProps) {
  const folderFetchLimit = verifiedFolderLimit === "all" ? undefined : verifiedFolderLimit;
  const folders = await getVerifiedRecentFolders(folderFetchLimit);
  const stats = showDashboardSummary ? await getDashboardStats() : null;

  const summaryCards = stats
    ? [
        { title: "Рекомендацій", value: stats.total },
        { title: "Виконано / Забезпечено виконання", value: stats.done },
        { title: "Частково виконано", value: stats.partial },
        { title: "Не виконані", value: stats.notDone },
      ]
    : [];

  return (
    <section className="space-y-6">
      {showDashboardSummary && stats ? (
        <>
          <h1 className="text-3xl font-semibold xl:text-4xl">Управління звітами</h1>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.title} className="border bg-background">
                <CardHeader>
                  <CardTitle className="text-base font-medium text-muted-foreground 2xl:text-lg">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold 2xl:text-6xl">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-3xl font-semibold xl:text-4xl">{foldersSectionTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {folders.map((folder) => (
            <AuditFolderCard
              key={folder.id}
              folder={folder}
              href={`${folderHrefPrefix}/${folder.id}`}
              variant="execution"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
