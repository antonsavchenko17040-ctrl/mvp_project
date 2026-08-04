import { ManagementReportsOverview } from "@/components/management-reports-overview";

export default async function ReportsPage() {
  return <ManagementReportsOverview folderHrefPrefix="/dashboard/folders" verifiedFolderLimit="all" />;
}
