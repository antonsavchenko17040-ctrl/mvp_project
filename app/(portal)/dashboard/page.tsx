import { ManagementReportsOverview } from "@/components/management-reports-overview";

export default async function DashboardPage() {
  return (
    <ManagementReportsOverview
      folderHrefPrefix="/dashboard/folders"
      showDashboardSummary
      foldersSectionTitle="Останні додані звіти"
      verifiedFolderLimit={4}
    />
  );
}
