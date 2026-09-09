import { ReportFolderDetailView } from "@/components/report-folder-detail-view";
import {
  PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX,
  PORTAL_REPORTS_LIBRARY_HOME,
} from "@/lib/reports-section";

export default async function ReportsLibraryFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ execution?: string; q?: string; sort?: string; dir?: string }>;
}) {
  const { id } = await params;
  return (
    <ReportFolderDetailView
      folderId={id}
      folderHref={`${PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX}/${id}`}
      backHref={PORTAL_REPORTS_LIBRARY_HOME}
      backLabel="Повернутися до бібліотеки звітів"
      searchParams={searchParams}
    />
  );
}
