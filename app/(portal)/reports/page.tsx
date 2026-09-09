import { ManagementReportsOverview } from "@/components/management-reports-overview";
import { PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX } from "@/lib/reports-section";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string }>;
}) {
  const query = await searchParams;
  const titleQuery = (query.q ?? "").trim();
  const yearRaw = Number(query.year);
  const yearFilter = Number.isFinite(yearRaw) ? yearRaw : null;

  return (
    <ManagementReportsOverview
      folderHrefPrefix={PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX}
      verifiedFolderLimit="all"
      enableFolderFilters
      titleQuery={titleQuery}
      yearFilter={yearFilter}
    />
  );
}
