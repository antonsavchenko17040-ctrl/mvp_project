import { RecommendationStatus, type Prisma } from "@prisma/client";

import { getDepartments } from "@/lib/admin/departments-store";
import { sspDepartmentsVisibilityWhere } from "@/lib/recommendation-ssp-departments";
import { recommendationMatchesSspDepartments } from "@/lib/ssp-units";
import { db } from "@/lib/db";

const SSP_VISIBLE_STATUSES = [
  RecommendationStatus.in_progress,
  RecommendationStatus.revision,
  RecommendationStatus.manager_review,
  RecommendationStatus.on_review,
  RecommendationStatus.published,
] as const;

export async function sspMemberDepartments(profileId: string): Promise<
  { id: string; name: string }[]
> {
  const departments = await getDepartments();
  return departments
    .filter((d) => d.isActive && d.memberIds.includes(profileId))
    .map((d) => ({ id: d.id, name: d.name }));
}

/** Активні підрозділи, у яких користувач є членом (для видимості ССП). */
export async function sspMemberDepartmentNames(profileId: string): Promise<string[]> {
  return (await sspMemberDepartments(profileId)).map((d) => d.name);
}

/**
 * Умови, за якими рекомендація видима відповідальному:
 * membership у будь-якому призначеному підрозділі (join sspDepartments; legacy sspUnit fallback).
 * Чернетка ССП (`ssp_draft`) — додатково лише якщо призначена на цього користувача.
 */
export async function sspRecommendationAccessOr(profileId: string): Promise<Prisma.RecommendationWhereInput[]> {
  const memberDepartments = await sspMemberDepartments(profileId);
  const deptIds = memberDepartments.map((d) => d.id);
  const deptNames = memberDepartments.map((d) => d.name);

  if (deptIds.length === 0 && deptNames.length === 0) {
    return [{ id: { in: [] } }];
  }

  return [
    {
      AND: [
        sspDepartmentsVisibilityWhere(deptIds, deptNames),
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

/**
 * Точна перевірка: серед призначених ССП є підрозділ користувача.
 * Передавайте `recommendationId` (join-таблиця); `sspUnit` — лише legacy fallback.
 */
export async function isRecommendationVisibleToSspMember(
  recommendationId: string,
  profileId: string,
  options?: { sspUnit?: string | null },
): Promise<boolean> {
  const memberDepartments = await sspMemberDepartments(profileId);
  if (memberDepartments.length === 0) return false;
  const memberIds = new Set(memberDepartments.map((d) => d.id));
  const memberNames = memberDepartments.map((d) => d.name);

  const links = await db.recommendationSspDepartment.findMany({
    where: { recommendationId },
    select: { departmentId: true },
  });
  if (links.length > 0) {
    return links.some((link) => memberIds.has(link.departmentId));
  }

  // Legacy rows without join rows.
  if (options?.sspUnit != null) {
    return recommendationMatchesSspDepartments(options.sspUnit, memberNames);
  }
  const row = await db.recommendation.findFirst({
    where: { id: recommendationId },
    select: { sspUnit: true },
  });
  return recommendationMatchesSspDepartments(row?.sspUnit, memberNames);
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
