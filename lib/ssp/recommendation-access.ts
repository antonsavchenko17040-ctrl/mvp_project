import { RecommendationStatus, type Prisma } from "@prisma/client";

import { getDepartments } from "@/lib/admin/departments-store";

const SSP_VISIBLE_STATUSES = [
  RecommendationStatus.in_progress,
  RecommendationStatus.revision,
  RecommendationStatus.manager_review,
  RecommendationStatus.on_review,
  RecommendationStatus.published,
] as const;

/**
 * Умови, за якими рекомендація видима відповідальному:
 * лише рекомендації підрозділів, у яких користувач є членом (`sspUnit`).
 * Чернетка ССП (`ssp_draft`) — додатково лише якщо призначена на цього користувача.
 */
export async function sspRecommendationAccessOr(profileId: string): Promise<Prisma.RecommendationWhereInput[]> {
  const departments = await getDepartments();
  const deptNames = departments
    .filter((d) => d.isActive && d.memberIds.includes(profileId))
    .map((d) => d.name);

  if (deptNames.length === 0) {
    return [{ id: { in: [] } }];
  }

  return [
    {
      sspUnit: { in: deptNames },
      OR: [
        { status: { in: [...SSP_VISIBLE_STATUSES] } },
        {
          status: RecommendationStatus.ssp_draft,
          assigneeUserId: profileId,
        },
      ],
    },
  ];
}

export async function recommendationsVisibleToSspWhere(
  profileId: string,
): Promise<Prisma.RecommendationWhereInput> {
  return { AND: [{ isActive: true }, { OR: await sspRecommendationAccessOr(profileId) }] };
}

export async function sspRecommendationByIdWhere(
  recommendationId: string,
  profileId: string,
): Promise<Prisma.RecommendationWhereInput> {
  return {
    id: recommendationId,
    isActive: true,
    OR: await sspRecommendationAccessOr(profileId),
  };
}

/** Рекомендація, яку ССП ще може редагувати (до відправки на верифікацію). */
export async function sspEditableRecommendationByIdWhere(
  recommendationId: string,
  profileId: string,
): Promise<Prisma.RecommendationWhereInput> {
  return {
    AND: [
      await sspRecommendationByIdWhere(recommendationId, profileId),
      {
        status: {
          in: [
            RecommendationStatus.in_progress,
            RecommendationStatus.revision,
            RecommendationStatus.ssp_draft,
          ],
        },
      },
    ],
  };
}
