import { ReportFolderDetailView } from "@/components/report-folder-detail-view";
import { PUBLIC_REPORTS_HOME } from "@/lib/reports-section";

export default async function PublicFolderPage({
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
      folderHref={`/public/folders/${id}`}
      backHref={PUBLIC_REPORTS_HOME}
      filtersMode="library"
      searchParams={searchParams}
    />
  );
}
