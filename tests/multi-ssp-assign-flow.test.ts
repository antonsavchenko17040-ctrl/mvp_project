/**
 * Integration: Editor assigns multiple SSPs → each SSP member sees the recommendation.
 * Uses local DB helpers (same path as server actions after form resolve).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { PrismaClient, RecommendationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  resolveDepartmentsByIds,
  sspDepartmentsVisibilityWhere,
  syncRecommendationSspDepartments,
} from "@/lib/recommendation-ssp-departments";
import { recommendationsVisibleToSspWhere } from "@/lib/ssp/recommendation-access";

const prisma = new PrismaClient();
let passwordHash = "";

async function upsertSsp(email: string, fullName: string) {
  return prisma.profile.upsert({
    where: { email },
    update: {
      fullName,
      isActive: true,
      mustChangePassword: false,
      passwordHash,
      roles: { deleteMany: {}, create: [{ role: "ssp" }] },
    },
    create: {
      email,
      fullName,
      isActive: true,
      mustChangePassword: false,
      passwordHash,
      roles: { create: [{ role: "ssp" }] },
    },
  });
}

describe("multi-SSP assign → visibility flow", () => {
  let editorId = "";
  let sspAId = "";
  let sspBId = "";
  let sspCId = "";
  let depAId = "";
  let depBId = "";
  let depCId = "";
  let folderId = "";
  let recommendationId = "";

  before(async () => {
    passwordHash = await bcrypt.hash("TempPass#2026", 10);
    const editor = await prisma.profile.upsert({
      where: { email: "editor@e-nazk" },
      update: { isActive: true, mustChangePassword: false, passwordHash },
      create: {
        email: "editor@e-nazk",
        fullName: "Редактор MVP",
        isActive: true,
        mustChangePassword: false,
        passwordHash,
        roles: { create: [{ role: "editor" }] },
      },
    });
    editorId = editor.id;

    const sspA = await upsertSsp("ssp-a@e-nazk", "ССП А");
    const sspB = await upsertSsp("ssp-b@e-nazk", "ССП Б");
    const sspC = await upsertSsp("ssp-c@e-nazk", "ССП В");
    sspAId = sspA.id;
    sspBId = sspB.id;
    sspCId = sspC.id;

    const depA = await prisma.department.upsert({
      where: { name: "Тест-підрозділ Альфа" },
      update: { isActive: true },
      create: { name: "Тест-підрозділ Альфа", isActive: true },
    });
    const depB = await prisma.department.upsert({
      where: { name: "Тест-підрозділ Бета з довгою назвою для перевірки" },
      update: { isActive: true },
      create: {
        name: "Тест-підрозділ Бета з довгою назвою для перевірки",
        isActive: true,
      },
    });
    const depC = await prisma.department.upsert({
      where: { name: "Тест-підрозділ Гамма" },
      update: { isActive: true },
      create: { name: "Тест-підрозділ Гамма", isActive: true },
    });
    depAId = depA.id;
    depBId = depB.id;
    depCId = depC.id;

    for (const [departmentId, profileId] of [
      [depAId, sspAId],
      [depBId, sspBId],
      [depCId, sspCId],
    ] as const) {
      await prisma.departmentMember.upsert({
        where: { departmentId_profileId: { departmentId, profileId } },
        update: {},
        create: { departmentId, profileId },
      });
    }

    const folder = await prisma.auditFolder.create({
      data: {
        title: `Multi-SSP flow ${Date.now()}`,
        year: new Date().getFullYear(),
        createdById: editorId,
      },
    });
    folderId = folder.id;
  });

  after(async () => {
    if (folderId) {
      await prisma.auditFolder.deleteMany({ where: { id: folderId } });
    }
    await prisma.$disconnect();
  });

  it("stores all selected SSP department ids on assign and shows to each member", async () => {
    const activeDepartments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const assignment = resolveDepartmentsByIds([depAId, depBId, depCId], activeDepartments);
    assert.ok(assignment);
    assert.equal(assignment.ids.length, 3);

    const created = await prisma.recommendation.create({
      data: {
        auditFolderId: folderId,
        sequenceNumber: 1,
        deficiency: "Недолік multi-ssp",
        recommendationText: "Рекомендація multi-ssp",
        executionIndicator: "Індикатор",
        expectedResult: "Результат",
        vkElement: "ВК",
        observationSignificance: "середня",
        sspUnit: assignment.sspUnit,
        deadline: new Date(Date.now() + 7 * 86400000),
        informingDeadline: new Date(Date.now() + 14 * 86400000),
        status: RecommendationStatus.draft,
      },
    });
    recommendationId = created.id;

    // Simulate «Передати в роботу»: sync join + status
    await syncRecommendationSspDepartments(
      prisma,
      recommendationId,
      assignment.ids,
      assignment.sspUnit,
    );
    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: { status: RecommendationStatus.in_progress },
    });

    const links = await prisma.recommendationSspDepartment.findMany({
      where: { recommendationId },
      select: { departmentId: true },
    });
    assert.deepEqual(
      new Set(links.map((link) => link.departmentId)),
      new Set([depAId, depBId, depCId]),
    );

    const stored = await prisma.recommendation.findUniqueOrThrow({
      where: { id: recommendationId },
      select: { sspUnit: true },
    });
    assert.ok(stored.sspUnit.includes("Альфа"));
    assert.ok(stored.sspUnit.includes("Бета"));
    assert.ok(stored.sspUnit.includes("Гамма"));

    for (const [label, profileId, deptId] of [
      ["A", sspAId, depAId],
      ["B", sspBId, depBId],
      ["C", sspCId, depCId],
    ] as const) {
      const where = await recommendationsVisibleToSspWhere(profileId);
      const visible = await prisma.recommendation.findFirst({
        where: { AND: [where, { id: recommendationId }] },
        select: { id: true, sspUnit: true },
      });
      assert.ok(visible, `SSP ${label} must see recommendation after assign`);

      const byJoin = sspDepartmentsVisibilityWhere([deptId], []);
      const viaJoin = await prisma.recommendation.findFirst({
        where: { AND: [{ id: recommendationId }, byJoin] },
        select: { id: true },
      });
      assert.ok(viaJoin, `SSP ${label} join visibility must match`);
    }

    // Unrelated SSP must not see it
    const outsider = await upsertSsp("ssp-out@e-nazk", "ССП сторонній");
    const outsiderDept = await prisma.department.upsert({
      where: { name: "Тест-підрозділ Сторонній" },
      update: { isActive: true },
      create: { name: "Тест-підрозділ Сторонній", isActive: true },
    });
    await prisma.departmentMember.upsert({
      where: {
        departmentId_profileId: {
          departmentId: outsiderDept.id,
          profileId: outsider.id,
        },
      },
      update: {},
      create: { departmentId: outsiderDept.id, profileId: outsider.id },
    });
    const outsiderWhere = await recommendationsVisibleToSspWhere(outsider.id);
    const outsiderVisible = await prisma.recommendation.findFirst({
      where: { AND: [outsiderWhere, { id: recommendationId }] },
      select: { id: true },
    });
    assert.equal(outsiderVisible, null);
  });

  it("keeps single-SSP recommendations visible as before", async () => {
    const activeDepartments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const assignment = resolveDepartmentsByIds([depAId], activeDepartments);
    assert.ok(assignment);

    const single = await prisma.recommendation.create({
      data: {
        auditFolderId: folderId,
        sequenceNumber: 2,
        deficiency: "Один ССП",
        recommendationText: "Текст",
        executionIndicator: "Інд",
        expectedResult: "Рез",
        vkElement: "ВК",
        observationSignificance: "низька",
        sspUnit: assignment.sspUnit,
        deadline: new Date(Date.now() + 7 * 86400000),
        informingDeadline: new Date(Date.now() + 14 * 86400000),
        status: RecommendationStatus.in_progress,
        sspDepartments: { create: [{ departmentId: depAId }] },
      },
    });

    const whereA = await recommendationsVisibleToSspWhere(sspAId);
    const whereB = await recommendationsVisibleToSspWhere(sspBId);
    assert.ok(
      await prisma.recommendation.findFirst({
        where: { AND: [whereA, { id: single.id }] },
      }),
    );
    assert.equal(
      await prisma.recommendation.findFirst({
        where: { AND: [whereB, { id: single.id }] },
      }),
      null,
    );
  });
});
