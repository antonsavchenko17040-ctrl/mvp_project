import { ReportFolderDetailView } from "@/components/report-folder-detail-view";
import {
  PUBLIC_REPORTS_LIBRARY_FOLDERS_PREFIX,
  PUBLIC_REPORTS_LIBRARY_HOME,
} from "@/lib/reports-section";

export default async function PublicReportsLibraryFolderPage({
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
      folderHref={`${PUBLIC_REPORTS_LIBRARY_FOLDERS_PREFIX}/${id}`}
      backHref={PUBLIC_REPORTS_LIBRARY_HOME}
      backLabel="Повернутися до бібліотеки звітів"
      filtersMode="library"
      searchParams={searchParams}
    />
  );
}
