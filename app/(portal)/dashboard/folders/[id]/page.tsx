import { ReportFolderDetailView } from "@/components/report-folder-detail-view";
import { PORTAL_REPORTS_HOME } from "@/lib/reports-section";

export default async function DashboardFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    ssp?: string;
    status?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { id } = await params;
  return (
    <ReportFolderDetailView
      folderId={id}
      folderHref={`/dashboard/folders/${id}`}
      backHref={PORTAL_REPORTS_HOME}
      filtersMode="library"
      searchParams={searchParams}
    />
  );
}
