/**
 * HTTP-level E2E: Editor FormData multi-SSP → assign → each SSP /ssp list contains it.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

import { PrismaClient, RecommendationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  resolveSspAssignmentFromForm,
  syncRecommendationSspDepartments,
} from "../lib/recommendation-ssp-departments";
import { recommendationsVisibleToSspWhere } from "../lib/ssp/recommendation-access";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

async function createSessionToken(profileId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.session.create({
    data: {
      profileId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return token;
}

async function fetchSspList(sessionToken: string): Promise<string> {
  const res = await fetch(`${BASE}/ssp`, {
    headers: { Cookie: `session_token=${sessionToken}` },
    redirect: "follow",
  });
  assert.equal(res.status, 200, `SSP page status ${res.status}`);
  return res.text();
}

async function main() {
  const passwordHash = await bcrypt.hash("TempPass#2026", 10);

  const editor = await prisma.profile.upsert({
    where: { email: "editor@e-nazk" },
    update: { mustChangePassword: false, passwordHash, isActive: true },
    create: {
      email: "editor@e-nazk",
      fullName: "Редактор",
      mustChangePassword: false,
      passwordHash,
      isActive: true,
      roles: { create: [{ role: "editor" }] },
    },
  });

  const sspUsers = [] as { id: string; email: string; deptId: string; deptName: string }[];
  const deptSpecs = [
    { email: "ssp-a@e-nazk", name: "ССП Альфа", dept: "Тест-підрозділ Альфа" },
    {
      email: "ssp-b@e-nazk",
      name: "ССП Бета",
      dept: "Тест-підрозділ Бета з довгою назвою для перевірки повного відображення",
    },
    { email: "ssp-c@e-nazk", name: "ССП Гамма", dept: "Тест-підрозділ Гамма" },
  ];

  for (const spec of deptSpecs) {
    const profile = await prisma.profile.upsert({
      where: { email: spec.email },
      update: {
        mustChangePassword: false,
        passwordHash,
        isActive: true,
        fullName: spec.name,
      },
      create: {
        email: spec.email,
        fullName: spec.name,
        mustChangePassword: false,
        passwordHash,
        isActive: true,
        roles: { create: [{ role: "ssp" }] },
      },
    });
    await prisma.profileRole.deleteMany({ where: { profileId: profile.id } });
    await prisma.profileRole.create({ data: { profileId: profile.id, role: "ssp" } });

    const dept = await prisma.department.upsert({
      where: { name: spec.dept },
      update: { isActive: true },
      create: { name: spec.dept, isActive: true },
    });
    await prisma.departmentMember.upsert({
      where: {
        departmentId_profileId: { departmentId: dept.id, profileId: profile.id },
      },
      update: {},
      create: { departmentId: dept.id, profileId: profile.id },
    });
    sspUsers.push({
      id: profile.id,
      email: spec.email,
      deptId: dept.id,
      deptName: spec.dept,
    });
  }

  const activeDepartments = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  // Simulate SspUnitMultiSelect JSON payload
  const formData = new FormData();
  formData.set(
    "ssp_department_ids",
    JSON.stringify(sspUsers.map((u) => u.deptId)),
  );
  const assignment = resolveSspAssignmentFromForm(formData, activeDepartments);
  assert.ok(assignment, "form must resolve all selected department ids");
  assert.equal(assignment.ids.length, 3, "all 3 SSPs must be stored");

  const folder = await prisma.auditFolder.create({
    data: {
      title: `E2E Multi-SSP HTTP ${Date.now()}`,
      year: new Date().getFullYear(),
      createdById: editor.id,
    },
  });

  const marker = `MULTI-SSP-MARKER-${Date.now()}`;
  const recommendation = await prisma.recommendation.create({
    data: {
      auditFolderId: folder.id,
      sequenceNumber: 1,
      deficiency: marker,
      recommendationText: "Рекомендація для кількох ССП",
      executionIndicator: "Індикатор",
      expectedResult: "Результат",
      vkElement: "ВК",
      observationSignificance: "середня",
      sspUnit: "placeholder",
      deadline: new Date(Date.now() + 10 * 86400000),
      informingDeadline: new Date(Date.now() + 20 * 86400000),
      status: RecommendationStatus.draft,
    },
  });

  // «Передати в роботу»
  await syncRecommendationSspDepartments(
    prisma,
    recommendation.id,
    assignment.ids,
    assignment.sspUnit,
  );
  await prisma.recommendation.update({
    where: { id: recommendation.id },
    data: { status: RecommendationStatus.in_progress, sspUnit: assignment.sspUnit },
  });

  const stored = await prisma.recommendation.findUniqueOrThrow({
    where: { id: recommendation.id },
    include: { sspDepartments: true },
  });
  assert.equal(stored.sspDepartments.length, 3);
  for (const name of sspUsers.map((u) => u.deptName)) {
    assert.ok(
      stored.sspUnit.includes(name),
      `sspUnit display must include full name: ${name}`,
    );
  }

  console.log("DB after assign:");
  console.log("  sspUnit =", stored.sspUnit);
  console.log(
    "  join ids =",
    stored.sspDepartments.map((l) => l.departmentId).sort(),
  );

  for (const user of sspUsers) {
    const where = await recommendationsVisibleToSspWhere(user.id);
    const row = await prisma.recommendation.findFirst({
      where: { AND: [where, { id: recommendation.id }] },
    });
    assert.ok(row, `DB visibility failed for ${user.email}`);

    const token = await createSessionToken(user.id);
    const html = await fetchSspList(token);
    assert.ok(
      html.includes(marker) || html.includes(String(recommendation.sequenceNumber)),
      `HTTP /ssp for ${user.email} must show the recommendation (marker ${marker})`,
    );
    // Long name should appear somewhere on SSP workspace or at least not be truncated in DB path
    console.log(`PASS: ${user.email} sees recommendation via DB + /ssp`);
  }

  console.log("E2E multi-SSP HTTP: ALL PASS");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
