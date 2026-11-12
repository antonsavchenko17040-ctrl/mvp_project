import { EditorFolderRecommendationNav } from "@/components/editor/editor-folder-recommendation-nav";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import type { RecommendationStatus } from "@/lib/types";

export default async function EditorFolderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole(["editor"]);
  const { id } = await params;
  const folder = await db.auditFolder.findFirst({
    where: { id, createdById: profile.id },
    select: { id: true, title: true },
  });
  if (!folder) return children;

  const recommendations = await db.recommendation.findMany({
    where: { auditFolderId: folder.id, isActive: true, status: { not: "ssp_draft" } },
    select: {
      id: true,
      sequenceNumber: true,
      recommendationText: true,
      status: true,
      observationSignificance: true,
      sspUnit: true,
    },
    orderBy: recommendationSequenceOrderBy,
  });

  return (
    <EditorFolderRecommendationNav
      folderId={folder.id}
      folderTitle={folder.title}
      items={recommendations.map((item) => ({
        id: item.id,
        sequenceNumber: item.sequenceNumber,
        title: item.recommendationText.replace(/\s+/g, " ").trim(),
        status: item.status as RecommendationStatus,
        significance: item.observationSignificance ?? "",
        sspUnit: item.sspUnit ?? "",
      }))}
    >
      {children}
    </EditorFolderRecommendationNav>
  );
}
