import { ReportRecommendationDetailView } from "@/components/report-recommendation-detail-view";
import { PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX } from "@/lib/reports-section";

export default async function ReportsLibraryRecommendationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recommendationId: string }>;
  searchParams: Promise<{ execution?: string }>;
}) {
  const { id, recommendationId } = await params;

  return (
    <ReportRecommendationDetailView
      folderId={id}
      recommendationId={recommendationId}
      folderHref={`${PORTAL_REPORTS_LIBRARY_FOLDERS_PREFIX}/${id}`}
      searchParams={searchParams}
    />
  );
}
