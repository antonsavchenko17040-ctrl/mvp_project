import { ManagementReportsOverview } from "@/components/management-reports-overview";

export default async function PublicDashboardPage() {
  return (
    <ManagementReportsOverview
      folderHrefPrefix="/public/folders"
      showDashboardSummary
      foldersSectionTitle="Останні додані звіти"
      verifiedFolderLimit={4}
    />
  );
}
