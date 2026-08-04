import { db } from "@/lib/db";

export const recommendationSequenceOrderBy = [
  { sequenceNumber: "asc" as const },
  { createdAt: "asc" as const },
];

export async function nextRecommendationSequenceNumber(auditFolderId: string): Promise<number> {
  const result = await db.recommendation.aggregate({
    where: { auditFolderId },
    _max: { sequenceNumber: true },
  });
  return (result._max.sequenceNumber ?? 0) + 1;
}

/** Присвоює номери 1..N усім рекомендаціям у папці за датою створення (для існуючих даних). */
export async function backfillRecommendationSequenceNumbers(auditFolderId: string) {
  const items = await db.recommendation.findMany({
    where: { auditFolderId },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  await Promise.all(
    items.map((item, index) =>
      db.recommendation.update({
        where: { id: item.id },
        data: { sequenceNumber: index + 1 },
      }),
    ),
  );
}

export async function backfillAllRecommendationSequenceNumbers() {
  const folders = await db.auditFolder.findMany({ select: { id: true } });
  for (const folder of folders) {
    await backfillRecommendationSequenceNumbers(folder.id);
  }
}
