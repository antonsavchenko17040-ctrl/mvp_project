import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";

import type { RecommendationSibling } from "./view-model";

export async function listFolderRecommendationNav(args: {
  folderId: string;
  currentId: string;
  href: (id: string) => string;
  where?: Prisma.RecommendationWhereInput;
  label: (status: string) => string;
}): Promise<RecommendationSibling[]> {
  const rows = await db.recommendation.findMany({
    where: { auditFolderId: args.folderId, isActive: true, ...args.where },
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

  return rows.map((row) => ({
    id: row.id,
    sequenceNumber: row.sequenceNumber,
    title: row.recommendationText.replace(/\s+/g, " ").trim() || "—",
    status: row.status,
    statusLabel: args.label(row.status),
    significance: row.observationSignificance?.trim() || "—",
    sspUnit: row.sspUnit?.trim() || "—",
    href: args.href(row.id),
    current: row.id === args.currentId,
  }));
}
