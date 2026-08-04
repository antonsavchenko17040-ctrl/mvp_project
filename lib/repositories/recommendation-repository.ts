import { db } from "@/lib/db";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import type { Recommendation, RecommendationStatus, UserRole } from "@/lib/types";

export async function getRecommendationsForRole(userId: string, role: string) {
  const where: {
    assigneeUserId?: string;
    status?: { in: RecommendationStatus[] };
    isActive: boolean;
  } = { isActive: true };
  if (role === "ssp") {
    where.assigneeUserId = userId;
  }
  if (role === "analyst") {
    where.status = { in: ["on_review", "revision"] };
  }

  return (await db.recommendation.findMany({
    where,
    orderBy: recommendationSequenceOrderBy,
  })) as unknown as Recommendation[];
}

export type ReportScope = "mine" | "all" | "review";

const reviewStatuses: RecommendationStatus[] = ["on_review", "revision"];

export async function getRecommendationsForScope(params: {
  userId: string;
  role: UserRole;
  scope: ReportScope;
}) {
  const { userId, role, scope } = params;
  const where: {
    assigneeUserId?: string;
    status?: { in: RecommendationStatus[] };
    isActive: boolean;
  } = { isActive: true };

  if (scope === "mine") {
    if (role === "ssp") {
      where.assigneeUserId = userId;
    } else if (role === "analyst") {
      where.status = { in: reviewStatuses };
    }
  }

  if (scope === "review") {
    where.status = { in: reviewStatuses };
  }

  return (await db.recommendation.findMany({
    where,
    orderBy: recommendationSequenceOrderBy,
  })) as unknown as Recommendation[];
}

export async function getReportScopeCounts(params: { userId: string; role: UserRole }) {
  const [mine, all, review] = await Promise.all([
    getRecommendationsForScope({ ...params, scope: "mine" }),
    getRecommendationsForScope({ ...params, scope: "all" }),
    getRecommendationsForScope({ ...params, scope: "review" }),
  ]);

  return {
    mine: mine.length,
    all: all.length,
    review: review.length,
  };
}

export async function updateRecommendationStatus(params: {
  id: string;
  status: RecommendationStatus;
  progress_report?: string;
  measures_description?: string;
  analyst_comment?: string;
}) {
  await db.recommendation.update({
    where: { id: params.id },
    data: {
      status: params.status,
      progressReport: params.progress_report,
      measuresDescription: params.measures_description,
      analystComment: params.analyst_comment,
    },
  });
}
