import { db } from "@/lib/db";
import type { RecommendationStatus } from "@/lib/types";

export function isFolderArchived(archivedAt: Date | string | null | undefined): boolean {
  return archivedAt != null && archivedAt !== "";
}

/** Папку можна архівувати, якщо є ≥1 активна рекомендація і всі вони `published`. */
export function canArchiveFolderByRecommendations(
  recommendations: { status: RecommendationStatus | string; isActive?: boolean }[],
): boolean {
  const active = recommendations.filter((item) => item.isActive !== false);
  if (active.length === 0) return false;
  return active.every((item) => item.status === "published");
}

export async function getAuditFolderArchivedAt(auditFolderId: string): Promise<Date | null> {
  const folder = await db.auditFolder.findFirst({
    where: { id: auditFolderId },
    select: { archivedAt: true },
  });
  return folder?.archivedAt ?? null;
}

export async function isAuditFolderArchivedById(auditFolderId: string): Promise<boolean> {
  return isFolderArchived(await getAuditFolderArchivedAt(auditFolderId));
}
