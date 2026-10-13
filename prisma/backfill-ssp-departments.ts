/**
 * One-time / idempotent backfill:
 * for each recommendation, ensure RecommendationSspDepartment rows match sspUnit names.
 */
import { PrismaClient } from "@prisma/client";

import { formatSspUnits, parseSspUnits } from "../lib/ssp-units";

const prisma = new PrismaClient();

async function main() {
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });
  const byName = new Map(
    departments.map((department) => [department.name.toLocaleLowerCase("uk"), department]),
  );

  const recommendations = await prisma.recommendation.findMany({
    select: {
      id: true,
      sspUnit: true,
      sspDepartments: { select: { departmentId: true } },
    },
  });

  let linked = 0;
  let skipped = 0;

  for (const recommendation of recommendations) {
    if (recommendation.sspDepartments.length > 0) {
      skipped += 1;
      continue;
    }

    const names = parseSspUnits(recommendation.sspUnit);
    const ids: string[] = [];
    for (const name of names) {
      const department = byName.get(name.toLocaleLowerCase("uk"));
      if (department) ids.push(department.id);
    }

    if (ids.length === 0) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction([
      prisma.recommendationSspDepartment.createMany({
        data: ids.map((departmentId) => ({
          recommendationId: recommendation.id,
          departmentId,
        })),
        skipDuplicates: true,
      }),
      prisma.recommendation.update({
        where: { id: recommendation.id },
        data: { sspUnit: formatSspUnits(names) },
      }),
    ]);
    linked += 1;
  }

  console.log(
    `[backfill-ssp-departments] linked=${linked} skipped=${skipped} total=${recommendations.length}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[backfill-ssp-departments] failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
