import { ReportRecommendationDetailView } from "@/components/report-recommendation-detail-view";
import { PUBLIC_REPORTS_LIBRARY_FOLDERS_PREFIX } from "@/lib/reports-section";

export default async function PublicReportsLibraryRecommendationPage({
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
      folderHref={`${PUBLIC_REPORTS_LIBRARY_FOLDERS_PREFIX}/${id}`}
      searchParams={searchParams}
    />
  );
}
