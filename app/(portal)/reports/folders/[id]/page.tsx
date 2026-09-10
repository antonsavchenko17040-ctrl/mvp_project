import { notFound } from "next/navigation";

import { ReportFolderDetailView } from "@/components/report-folder-detail-view";
import { db } from "@/lib/db";
import {
  PORTAL_REPORTS_ACTIVE_HOME,
  PORTAL_REPORTS_COMPLETED_HOME,
  PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX,
} from "@/lib/reports-section";

export default async function ReportsLibraryFolderPage({
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
  const folder = await db.auditFolder.findFirst({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!folder) notFound();

  const isArchived = folder.archivedAt != null;
  const backHref = isArchived ? PORTAL_REPORTS_COMPLETED_HOME : PORTAL_REPORTS_ACTIVE_HOME;
  const backLabel = isArchived ? "Повернутися до завершених звітів" : "Повернутися до активних звітів";

  return (
    <ReportFolderDetailView
      folderId={id}
      folderHref={`${PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX}/${id}`}
      backHref={backHref}
      backLabel={backLabel}
      filtersMode="library"
      searchParams={searchParams}
    />
  );
}
