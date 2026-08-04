import { ReportRecommendationDetailView } from "@/components/report-recommendation-detail-view";

export default async function DashboardRecommendationPage({
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
      folderHref={`/dashboard/folders/${id}`}
      searchParams={searchParams}
    />
  );
}
