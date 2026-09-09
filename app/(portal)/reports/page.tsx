import { ManagementReportsOverview } from "@/components/management-reports-overview";

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
      folderHrefPrefix="/dashboard/folders"
      verifiedFolderLimit="all"
      enableFolderFilters
      titleQuery={titleQuery}
      yearFilter={yearFilter}
    />
  );
}
