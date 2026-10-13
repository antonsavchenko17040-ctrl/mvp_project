import { RecommendationStatus, type Prisma } from "@prisma/client";

import { getDepartments } from "@/lib/admin/departments-store";
import {
  recommendationMatchesSspDepartments,
  sspUnitVisibilityWhere,
} from "@/lib/ssp-units";

const SSP_VISIBLE_STATUSES = [
  RecommendationStatus.in_progress,
  RecommendationStatus.revision,
  RecommendationStatus.manager_review,
  RecommendationStatus.on_review,
  RecommendationStatus.published,
] as const;

/** Активні підрозділи, у яких користувач є членом (для видимості ССП). */
export async function sspMemberDepartmentNames(profileId: string): Promise<string[]> {
  const departments = await getDepartments();
  return departments
    .filter((d) => d.isActive && d.memberIds.includes(profileId))
    .map((d) => d.name);
}

/**
 * Умови, за якими рекомендація видима відповідальному:
 * рекомендації будь-якого з підрозділів користувача (`sspUnit` — одне або кілька значень).
 * Чернетка ССП (`ssp_draft`) — додатково лише якщо призначена на цього користувача.
 */
export async function sspRecommendationAccessOr(profileId: string): Promise<Prisma.RecommendationWhereInput[]> {
  const deptNames = await sspMemberDepartmentNames(profileId);

  if (deptNames.length === 0) {
    return [{ id: { in: [] } }];
  }

  return [
    {
      AND: [
        sspUnitVisibilityWhere(deptNames),
        {
          OR: [
            { status: { in: [...SSP_VISIBLE_STATUSES] } },
            {
              status: RecommendationStatus.ssp_draft,
              assigneeUserId: profileId,
            },
          ],
        },
      ],
    },
  ];
}

/** Точна перевірка: серед призначених ССП є підрозділ користувача. */
export async function isRecommendationVisibleToSspMember(
  sspUnit: string | null | undefined,
  profileId: string,
): Promise<boolean> {
  const deptNames = await sspMemberDepartmentNames(profileId);
  return recommendationMatchesSspDepartments(sspUnit, deptNames);
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
