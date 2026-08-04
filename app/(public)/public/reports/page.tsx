import { ManagementReportsOverview } from "@/components/management-reports-overview";

export default async function PublicReportsPage() {
  return <ManagementReportsOverview folderHrefPrefix="/public/folders" verifiedFolderLimit="all" />;
}
