"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/password";
import {
  adminSupplementFieldLabel,
  isAdminAppendFieldKey,
  isAdminReplaceFieldKey,
  isAdminSupplementFieldKey,
  readRecommendationFieldRaw,
  rebuildAppendFieldValue,
  rebuildReplaceFieldValue,
  recommendationFieldUpdateFromSupplementValue,
  type AdminSupplementFieldKey,
  type SupplementRecord,
} from "@/lib/admin/recommendation-supplements";
import {
  archiveDepartment,
  assignDepartmentMember,
  createDepartment,
  getDepartments,
  removeDepartmentMember,
} from "@/lib/admin/departments-store";
import { canArchiveFolderByRecommendations, isFolderArchived } from "@/lib/audit-folder-archive";
import { buildObjectDifference, buildUpdateSummary, statusLabelUk, writeAuditLog } from "@/lib/audit-log";
import { clearTempPassword, setTempPassword } from "@/lib/auth/temp-password-store";
import { actingRoleForAnalyst, actingRoleForManager } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canTransition } from "@/lib/domain/recommendation-state-machine";
import {
  AuditFolderXlsxImportError,
  auditFolderTitleFromFilename,
  isFullyFilledImportedFolder,
  parseAuditFolderXlsx,
} from "@/lib/import/audit-folder-xlsx";
import { nextRecommendationSequenceNumber } from "@/lib/recommendation-sequence";
import type { RecommendationStatus, UserRole } from "@/lib/types";

const allowedRoles: UserRole[] = ["editor", "ssp", "manager", "analyst", "admin"];

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

function parseRolesFromForm(formData: FormData): UserRole[] {
  const raw = formData.getAll("roles").map((v) => String(v));
  const roles = raw.filter((r): r is UserRole => allowedRoles.includes(r as UserRole));
  const unique = [...new Set(roles)];
  if (unique.length === 0) {
    throw new Error("Оберіть хоча б одну роль.");
  }
  return unique;
}

export async function createUserAccount(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "");
  const roles = parseRolesFromForm(formData);
  const tempPassword = generateTempPassword();
  await db.profile.create({
    data: {
      email,
      passwordHash: await hashPassword(tempPassword),
      fullName,
      isActive: true,
      mustChangePassword: true,
      roles: { create: roles.map((role) => ({ role })) },
    },
  });
  const createdUser = await db.profile.findUnique({ where: { email }, select: { id: true } });
  if (createdUser) {
    await setTempPassword(createdUser.id, tempPassword);
    await writeAuditLog({
      actor,
      actorRole: "admin",
      action: "user.created",
      entityType: "user",
      entityId: createdUser.id,
      summary: `Створено користувача ${email}`,
      difference: { email, fullName, roles },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function assignRole(formData: FormData) {
  const sessionProfile = await requireRole(["admin"]);
  const userId = String(formData.get("user_id") ?? "");
  const roles = parseRolesFromForm(formData);
  if (userId === sessionProfile.id && !roles.includes("admin")) {
    throw new Error("Не можна зняти з себе роль адміністратора.");
  }
  await db.$transaction([
    db.profileRole.deleteMany({ where: { profileId: userId } }),
    db.profileRole.createMany({
      data: roles.map((role) => ({ profileId: userId, role })),
    }),
  ]);
  await writeAuditLog({
    actor: sessionProfile,
    actorRole: "admin",
    action: "user.role_assigned",
    entityType: "user",
    entityId: userId,
    summary: `Оновлено ролі користувача: ${roles.join(", ")}`,
    difference: { userId, roles },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function deleteUserAccount(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const userId = String(formData.get("user_id") ?? "");
  const currentAdminId = String(formData.get("current_admin_id") ?? "");

  if (!userId || userId === currentAdminId) {
    return;
  }

  const folderCount = await db.auditFolder.count({ where: { createdById: userId } });
  if (folderCount > 0) {
    await db.profile.update({
      where: { id: userId },
      data: { isActive: false },
    });
  } else {
    await db.profile.delete({ where: { id: userId } });
  }
  await clearTempPassword(userId);
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "user.deleted",
    entityType: "user",
    entityId: userId,
    summary: folderCount > 0 ? "Деактивовано користувача (є папки аудиту)" : "Видалено користувача",
    difference: { userId, deactivatedOnly: folderCount > 0 },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export type GenerateUserPasswordState = {
  userId?: string;
  password?: string;
  error?: string;
};

export async function generateUserPassword(
  _prevState: GenerateUserPasswordState,
  formData: FormData,
): Promise<GenerateUserPasswordState> {
  const actor = await requireRole(["admin"]);
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "missing_user" };

  const user = await db.profile.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) return { error: "user_not_found" };

  const newPassword = generateTempPassword();
  await db.profile.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: true,
    },
  });
  await setTempPassword(userId, newPassword);
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "user.password_reset",
    entityType: "user",
    entityId: userId,
    summary: `Скинуто пароль для ${user.email}`,
    difference: { userId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { userId, password: newPassword };
}

const allowedRecommendationStatuses: RecommendationStatus[] = [
  "draft",
  "ssp_draft",
  "in_progress",
  "manager_review",
  "on_review",
  "revision",
  "published",
];

function optionalText(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

export async function adminUpdateRecommendation(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "").trim();
  if (!recommendationId) {
    redirect("/admin?error=missing_recommendation");
  }

  const rec = await db.recommendation.findUnique({
    where: { id: recommendationId },
    select: {
      id: true,
      auditFolderId: true,
      status: true,
      vkElement: true,
      observationSignificance: true,
      deficiency: true,
      recommendationText: true,
      executionIndicator: true,
      expectedResult: true,
      sspUnit: true,
      deadline: true,
      informingDeadline: true,
      assigneeUserId: true,
      progressReport: true,
      actualImplementationDate: true,
      expectedAchievement: true,
      supportingDocuments: true,
      measuresDescription: true,
      sspNotes: true,
      managerComment: true,
      analystComment: true,
    },
  });
  if (!rec) {
    redirect("/admin?error=recommendation_not_found");
  }

  const statusRaw = String(formData.get("status") ?? "");
  if (!allowedRecommendationStatuses.includes(statusRaw as RecommendationStatus)) {
    redirect(`/admin/recommendations/${recommendationId}?error=invalid_status`);
  }

  const assigneeUserIdRaw = String(formData.get("assignee_user_id") ?? "").trim();
  const assigneeUserId = assigneeUserIdRaw === "" ? null : assigneeUserIdRaw;
  if (assigneeUserId) {
    const assignee = await db.profile.findFirst({
      where: {
        id: assigneeUserId,
        isActive: true,
        roles: { some: { role: "ssp" } },
      },
      select: { id: true },
    });
    if (!assignee) {
      redirect(`/admin/recommendations/${recommendationId}?error=assignee_not_found`);
    }
  }

  const sspUnit = String(formData.get("ssp_unit") ?? "").trim();
  const activeDepartments = (await getDepartments()).filter((d) => d.isActive);
  if (!activeDepartments.some((d) => d.name === sspUnit)) {
    redirect(`/admin/recommendations/${recommendationId}?error=invalid_department`);
  }

  const deadline = new Date(String(formData.get("deadline") ?? ""));
  if (Number.isNaN(deadline.getTime())) {
    redirect(`/admin/recommendations/${recommendationId}?error=invalid_deadline`);
  }
  const informingDeadline = new Date(String(formData.get("informing_deadline") ?? ""));
  if (Number.isNaN(informingDeadline.getTime())) {
    redirect(`/admin/recommendations/${recommendationId}?error=invalid_informing_deadline`);
  }
  const actualImplementationDateRaw = String(formData.get("actual_implementation_date") ?? "").trim();
  const actualImplementationDate =
    actualImplementationDateRaw === "" ? null : new Date(actualImplementationDateRaw);
  if (actualImplementationDate && Number.isNaN(actualImplementationDate.getTime())) {
    redirect(`/admin/recommendations/${recommendationId}?error=invalid_implementation_date`);
  }

  const nextValues = {
    vkElement: String(formData.get("vk_element") ?? ""),
    observationSignificance: String(formData.get("observation_significance") ?? "середній"),
    deficiency: String(formData.get("deficiency") ?? ""),
    recommendationText: String(formData.get("recommendation_text") ?? ""),
    executionIndicator: String(formData.get("execution_indicator") ?? ""),
    expectedResult: String(formData.get("expected_result") ?? ""),
    sspUnit,
    deadline,
    informingDeadline,
    status: statusRaw as RecommendationStatus,
    assigneeUserId,
    progressReport: optionalText(formData.get("progress_report")),
    actualImplementationDate,
    expectedAchievement: optionalText(formData.get("expected_achievement")),
    supportingDocuments: optionalText(formData.get("supporting_documents")),
    measuresDescription: optionalText(formData.get("measures_description")),
    sspNotes: optionalText(formData.get("ssp_notes")),
    managerComment: optionalText(formData.get("manager_comment")),
    analystComment: optionalText(formData.get("analyst_comment")),
  };

  await db.recommendation.update({
    where: { id: recommendationId },
    data: nextValues,
  });

  const difference = buildObjectDifference(
    {
      vkElement: rec.vkElement,
      observationSignificance: rec.observationSignificance,
      deficiency: rec.deficiency,
      recommendationText: rec.recommendationText,
      executionIndicator: rec.executionIndicator,
      expectedResult: rec.expectedResult,
      sspUnit: rec.sspUnit,
      deadline: rec.deadline,
      informingDeadline: rec.informingDeadline,
      status: rec.status,
      assigneeUserId: rec.assigneeUserId,
      progressReport: rec.progressReport,
      actualImplementationDate: rec.actualImplementationDate,
      expectedAchievement: rec.expectedAchievement,
      supportingDocuments: rec.supportingDocuments,
      measuresDescription: rec.measuresDescription,
      sspNotes: rec.sspNotes,
      managerComment: rec.managerComment,
      analystComment: rec.analystComment,
    },
    nextValues,
  );

  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: rec.status !== statusRaw ? "recommendation.status_changed" : "recommendation.updated",
    entityType: "recommendation",
    entityId: recommendationId,
    recommendationId,
    auditFolderId: rec.auditFolderId,
    summary:
      rec.status !== statusRaw
        ? buildUpdateSummary(
            `Адмін змінив статус (${statusLabelUk(rec.status)} → ${statusLabelUk(statusRaw)})`,
            difference,
          )
        : buildUpdateSummary("Адмін оновив рекомендацію", difference),
    difference,
  });

  revalidatePath("/admin");
  revalidatePath(`/editor/folders/${rec.auditFolderId}`);
  revalidatePath("/editor");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");

  redirect("/admin");
}

export async function hardDeleteRecommendation(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const rec = await db.recommendation.findUnique({
    where: { id: recommendationId },
    select: { auditFolderId: true, sequenceNumber: true },
  });
  if (!rec) {
    return;
  }
  await db.recommendation.delete({ where: { id: recommendationId } });
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "recommendation.deleted",
    entityType: "recommendation",
    entityId: recommendationId,
    recommendationId,
    auditFolderId: rec.auditFolderId,
    summary: `Остаточно видалено рекомендацію №${rec.sequenceNumber}`,
  });
  revalidatePath("/admin");
  revalidatePath(`/editor/folders/${rec.auditFolderId}`);
  revalidatePath("/editor");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
  redirect("/admin");
}

export async function hardDeleteAuditFolder(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const folderId = String(formData.get("audit_folder_id") ?? "").trim();
  if (!folderId) return;

  const folder = await db.auditFolder.findUnique({
    where: { id: folderId },
    select: { title: true, year: true },
  });
  await db.auditFolder.delete({ where: { id: folderId } });
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "audit_folder.deleted",
    entityType: "audit_folder",
    entityId: folderId,
    auditFolderId: folderId,
    summary: `Видалено папку аудиту «${folder?.title ?? folderId}»`,
    difference: { title: folder?.title, year: folder?.year },
  });

  revalidatePath("/admin");
  revalidatePath("/editor");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
}

export async function adminCreateAuditFolder(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const title = String(formData.get("title") ?? "").trim();
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  if (!title || Number.isNaN(year)) {
    redirect("/admin?error=invalid_folder");
  }

  const folder = await db.auditFolder.create({
    data: {
      title,
      year,
      createdById: profile.id,
    },
  });
  await writeAuditLog({
    actor: profile,
    actorRole: "admin",
    action: "audit_folder.created",
    entityType: "audit_folder",
    entityId: folder.id,
    auditFolderId: folder.id,
    summary: `Створено папку аудиту «${title}» (${year})`,
    difference: { title, year },
  });

  revalidatePath("/admin");
  revalidatePath("/editor");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
  redirect("/admin?ok=folder_created");
}

export async function adminImportAuditFolderFromXlsx(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const file = formData.get("file");
  const year = Number(formData.get("year") ?? new Date().getFullYear());

  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin?error=import_no_file");
  }

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    redirect("/admin?error=import_invalid_year");
  }

  const filename = file.name;
  if (!filename.toLowerCase().endsWith(".xlsx")) {
    redirect("/admin?error=import_invalid_format");
  }

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = await parseAuditFolderXlsx(buffer, {
      fallbackTitle: auditFolderTitleFromFilename(filename),
    });
  } catch (error) {
    if (error instanceof AuditFolderXlsxImportError) {
      const rowSuffix = error.row ? `&row=${error.row}` : "";
      redirect(`/admin?error=${error.code}${rowSuffix}`);
    }
    redirect("/admin?error=import_parse_failed");
  }

  for (const row of parsed.recommendations) {
    if (!row.deadline || Number.isNaN(row.deadline.getTime())) {
      redirect(`/admin?error=import_invalid_deadline&row=${row.excelRow}`);
    }
  }

  if (!isFullyFilledImportedFolder(parsed.recommendations)) {
    redirect("/admin?error=import_editor_only");
  }

  const folder = await db.$transaction(async (tx) => {
    const createdFolder = await tx.auditFolder.create({
      data: {
        title: parsed.title,
        year,
        createdById: profile.id,
      },
    });

    for (const row of parsed.recommendations) {
      const recommendation = await tx.recommendation.create({
        data: {
          auditFolderId: createdFolder.id,
          sequenceNumber: row.sequenceNumber ?? 0,
          vkElement: row.vkElement,
          deficiency: row.deficiency,
          recommendationText: row.recommendationText,
          executionIndicator: row.executionIndicator,
          expectedResult: row.expectedResult,
          observationSignificance: row.observationSignificance,
          sspUnit: row.sspUnit,
          deadline: row.deadline!,
          informingDeadline: row.informingDeadline,
          progressReport: row.progressReport,
          actualImplementationDate: row.actualImplementationDate,
          measuresDescription: row.measuresDescription,
          expectedAchievement: row.expectedAchievement,
          supportingDocuments: row.supportingDocuments,
          sspNotes: row.sspNotes,
          status: row.status,
        },
      });

      if (row.supplements.length > 0) {
        await tx.recommendationFieldSupplement.createMany({
          data: row.supplements.map((supplement) => ({
            recommendationId: recommendation.id,
            fieldKey: supplement.fieldKey,
            content: supplement.content,
            previousContent: supplement.previousContent,
            changeReason: supplement.changeReason,
            changeDate: supplement.changeDate,
            createdById: profile.id,
          })),
        });
      }
    }

    return createdFolder;
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "admin",
    action: "audit_folder.imported",
    entityType: "audit_folder",
    entityId: folder.id,
    auditFolderId: folder.id,
    summary: `Імпортовано повністю заповнену папку аудиту «${parsed.title}» (${parsed.recommendations.length} рекомендацій)`,
    difference: {
      title: parsed.title,
      year,
      recommendationsCount: parsed.recommendations.length,
      fullyFilled: true,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin?folder=${folder.id}`);
  revalidatePath("/editor");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/public/folders/${folder.id}`);
  revalidatePath(`/dashboard/folders/${folder.id}`);
  revalidatePath(`/reports/folders/${folder.id}`);
  revalidatePath(`/public/reports/folders/${folder.id}`);

  redirect(`/admin?folder=${folder.id}&ok=imported`);
}

/** Ручне завершення папки адміністратором (без автозавершення під час імпорту). */
export async function adminArchiveAuditFolder(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const auditFolderId = String(formData.get("audit_folder_id") ?? "");

  const folder = await db.auditFolder.findFirst({
    where: { id: auditFolderId },
    select: {
      id: true,
      title: true,
      archivedAt: true,
      recommendations: {
        where: { isActive: true },
        select: { status: true, isActive: true },
      },
    },
  });

  if (!folder) {
    redirect("/admin?error=folder_not_found");
  }

  if (isFolderArchived(folder.archivedAt)) {
    redirect(`/admin?folder=${folder.id}&error=already_archived`);
  }

  if (!canArchiveFolderByRecommendations(folder.recommendations)) {
    redirect(`/admin?folder=${folder.id}&error=cannot_archive_incomplete`);
  }

  const archivedAt = new Date();
  await db.auditFolder.update({
    where: { id: folder.id },
    data: { archivedAt },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "admin",
    action: "audit_folder.archived",
    entityType: "audit_folder",
    entityId: folder.id,
    auditFolderId: folder.id,
    summary: `Завершено папку аудиту «${folder.title}»`,
    difference: { archivedAt: archivedAt.toISOString() },
  });

  revalidatePath("/admin");
  revalidatePath(`/editor/folders/${folder.id}`);
  revalidatePath(`/dashboard/folders/${folder.id}`);
  revalidatePath(`/public/folders/${folder.id}`);
  revalidatePath(`/reports/folders/${folder.id}`);
  revalidatePath(`/public/reports/folders/${folder.id}`);
  revalidatePath("/ssp");
  redirect(`/admin?folder=${folder.id}&ok=archived`);
}

export async function adminCreateRecommendation(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const auditFolderId = String(formData.get("audit_folder_id") ?? "");
  const assigneeUserIdRaw = String(formData.get("assignee_user_id") ?? "").trim();
  const assigneeUserId = assigneeUserIdRaw === "" ? null : assigneeUserIdRaw;
  const sspUnit = String(formData.get("ssp_unit") ?? "");
  const observationSignificance = String(formData.get("observation_significance") ?? "середній");
  const redirectPath = String(formData.get("redirect_path") ?? "/admin");
  const informingDeadlineRaw = String(formData.get("informing_deadline") ?? "").trim();
  const informingDeadline = informingDeadlineRaw === "" ? null : new Date(informingDeadlineRaw);

  const folder = await db.auditFolder.findFirst({
    where: { id: auditFolderId },
    select: { id: true },
  });
  if (!folder) {
    redirect(`${redirectPath}?error=folder_not_found`);
  }

  if (assigneeUserId) {
    const assignee = await db.profile.findFirst({
      where: {
        id: assigneeUserId,
        isActive: true,
        roles: { some: { role: "ssp" } },
      },
      select: { id: true },
    });
    if (!assignee) {
      redirect(`${redirectPath}?error=assignee_not_found`);
    }
  }

  const activeDepartments = (await getDepartments()).filter((department) => department.isActive);
  if (!activeDepartments.some((department) => department.name === sspUnit)) {
    redirect(`${redirectPath}?error=invalid_department`);
  }

  const intent = String(formData.get("intent") ?? "draft");
  const status = intent === "assign" ? "in_progress" : "draft";
  const sequenceNumber = await nextRecommendationSequenceNumber(auditFolderId);

  const created = await db.recommendation.create({
    data: {
      auditFolderId,
      sequenceNumber,
      deficiency: String(formData.get("deficiency") ?? ""),
      recommendationText: String(formData.get("recommendation_text") ?? ""),
      executionIndicator: String(formData.get("execution_indicator") ?? ""),
      expectedResult: String(formData.get("expected_result") ?? ""),
      vkElement: String(formData.get("vk_element") ?? ""),
      observationSignificance,
      sspUnit,
      deadline: new Date(String(formData.get("deadline") ?? "")),
      informingDeadline,
      status,
      assigneeUserId,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "recommendation.created",
    entityType: "recommendation",
    entityId: created.id,
    recommendationId: created.id,
    auditFolderId,
    summary:
      intent === "assign"
        ? `Адмін створив рекомендацію №${sequenceNumber} і передав на виконання`
        : `Адмін створив чернетку рекомендації №${sequenceNumber}`,
    difference: { status, sequenceNumber, intent },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/folders/${auditFolderId}/new`);
  revalidatePath(`/editor/folders/${auditFolderId}`);
  revalidatePath("/editor");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");

  if (intent === "assign") {
    redirect(`/admin?ok=recommendation_created`);
  }
  redirect(`/admin/recommendations/${created.id}?ok=recommendation_created`);
}

/** Верифікація адміністратором для рекомендацій на перевірці: → published. */
export async function adminPublishRecommendation(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const id = String(formData.get("recommendation_id") ?? "").trim();
  if (!id) {
    redirect("/admin?error=missing_recommendation");
  }

  const recommendation = await db.recommendation.findUnique({
    where: { id },
    select: { id: true, status: true, auditFolderId: true, isActive: true },
  });
  if (!recommendation) {
    redirect("/admin?error=recommendation_not_found");
  }
  if (!recommendation.isActive) {
    redirect(`/admin/recommendations/${id}?error=inactive`);
  }
  if (recommendation.status === "published") {
    redirect(`/admin/recommendations/${id}?error=already_published`);
  }
  if (recommendation.status !== "on_review" && recommendation.status !== "manager_review") {
    redirect(`/admin/recommendations/${id}?error=not_awaiting_verification`);
  }

  if (recommendation.status === "on_review") {
    const validation = canTransition({
      currentStatus: "on_review",
      nextStatus: "published",
      role: actingRoleForAnalyst(profile.roles),
    });
    if (!validation.ok) {
      redirect(`/admin/recommendations/${id}?error=cannot_publish`);
    }
  }

  await db.recommendation.update({
    where: { id },
    data: { status: "published", analystComment: null, managerComment: null },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "admin",
    action: "recommendation.published",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: recommendation.auditFolderId,
    summary: `Адмін підтвердив виконання (${statusLabelUk(recommendation.status)} → ${statusLabelUk("published")})`,
    difference: { from: recommendation.status, to: "published" },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/recommendations/${id}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath("/analyst");
  revalidatePath("/manager");
  revalidatePath("/ssp");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`/admin/recommendations/${id}?ok=published`);
}

/** Повернення на доопрацювання зі статусів перевірки. */
export async function adminSendRecommendationToRevision(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const id = String(formData.get("recommendation_id") ?? "").trim();
  const comment = String(formData.get("revision_comment") ?? "").trim();
  if (!id) {
    redirect("/admin?error=missing_recommendation");
  }

  const recommendation = await db.recommendation.findUnique({
    where: { id },
    select: { id: true, status: true, auditFolderId: true, isActive: true },
  });
  if (!recommendation) {
    redirect("/admin?error=recommendation_not_found");
  }
  if (!recommendation.isActive) {
    redirect(`/admin/recommendations/${id}?error=inactive`);
  }
  if (recommendation.status !== "on_review" && recommendation.status !== "manager_review") {
    redirect(`/admin/recommendations/${id}?error=not_awaiting_verification`);
  }

  const validation =
    recommendation.status === "on_review"
      ? canTransition({
          currentStatus: "on_review",
          nextStatus: "revision",
          role: actingRoleForAnalyst(profile.roles),
          analystComment: comment,
        })
      : canTransition({
          currentStatus: "manager_review",
          nextStatus: "revision",
          role: actingRoleForManager(profile.roles),
          managerComment: comment,
        });

  if (!validation.ok) {
    redirect(`/admin/recommendations/${id}?error=revision_comment_required`);
  }

  await db.recommendation.update({
    where: { id },
    data:
      recommendation.status === "on_review"
        ? { status: "revision", analystComment: comment }
        : { status: "revision", managerComment: comment, analystComment: null },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "admin",
    action: "recommendation.revision",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: recommendation.auditFolderId,
    summary: `Адмін повернув на доопрацювання (${statusLabelUk(recommendation.status)} → ${statusLabelUk("revision")})`,
    difference: { from: recommendation.status, to: "revision", comment },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/recommendations/${id}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath("/analyst");
  revalidatePath("/manager");
  revalidatePath("/ssp");
  redirect(`/admin/recommendations/${id}?ok=sent_to_revision`);
}

export async function adminDeactivateRecommendation(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const id = String(formData.get("recommendation_id") ?? "").trim();
  if (!id) {
    redirect("/admin?error=missing_recommendation");
  }

  const recommendation = await db.recommendation.findUnique({
    where: { id },
    select: { id: true, auditFolderId: true, isActive: true },
  });
  if (!recommendation) {
    redirect("/admin?error=recommendation_not_found");
  }
  if (!recommendation.isActive) {
    redirect(`/admin/recommendations/${id}?error=already_deactivated`);
  }

  await db.recommendation.update({
    where: { id },
    data: { isActive: false },
  });

  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "recommendation.deactivated",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: recommendation.auditFolderId,
    summary: "Деактивовано рекомендацію",
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/recommendations/${id}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath("/editor");
  revalidatePath("/analyst");
  revalidatePath("/manager");
  revalidatePath("/ssp");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/admin?ok=deactivated");
}

export async function adminReactivateRecommendation(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const id = String(formData.get("recommendation_id") ?? "").trim();
  if (!id) {
    redirect("/admin?error=missing_recommendation");
  }

  const recommendation = await db.recommendation.findUnique({
    where: { id },
    select: { id: true, auditFolderId: true, isActive: true },
  });
  if (!recommendation) {
    redirect("/admin?error=recommendation_not_found");
  }
  if (recommendation.isActive) {
    redirect(`/admin/recommendations/${id}?error=already_active`);
  }

  await db.recommendation.update({
    where: { id },
    data: { isActive: true },
  });

  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "recommendation.reactivated",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: recommendation.auditFolderId,
    summary: "Повторно активовано рекомендацію",
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/recommendations/${id}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath("/editor");
  revalidatePath("/analyst");
  revalidatePath("/manager");
  revalidatePath("/ssp");
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`/admin/recommendations/${id}?ok=reactivated`);
}

export async function createDepartmentAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const name = String(formData.get("name") ?? "");
  await createDepartment(name);
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "department.created",
    entityType: "department",
    summary: `Створено підрозділ «${name}»`,
    difference: { name },
  });
  revalidatePath("/admin/departments");
}

export async function archiveDepartmentAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const departmentId = String(formData.get("department_id") ?? "");
  await archiveDepartment(departmentId);
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "department.archived",
    entityType: "department",
    entityId: departmentId,
    summary: "Архівовано підрозділ",
    difference: { departmentId },
  });
  revalidatePath("/admin/departments");
}

export async function assignDepartmentMemberAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const departmentId = String(formData.get("department_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  if (!departmentId || !profileId) return;

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true, isActive: true, email: true },
  });
  if (!profile || !profile.isActive) return;

  await assignDepartmentMember(departmentId, profileId);
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "department.member_assigned",
    entityType: "department",
    entityId: departmentId,
    summary: `Додано ${profile.email} до підрозділу`,
    difference: { departmentId, profileId },
  });
  revalidatePath("/admin/departments");
}

export async function removeDepartmentMemberAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const departmentId = String(formData.get("department_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  if (!departmentId || !profileId) return;

  await removeDepartmentMember(departmentId, profileId);
  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "department.member_removed",
    entityType: "department",
    entityId: departmentId,
    summary: "Вилучено учасника з підрозділу",
    difference: { departmentId, profileId },
  });
  revalidatePath("/admin/departments");
}

function adminRecommendationRedirect(recommendationId: string, query?: string) {
  const base = `/admin/recommendations/${recommendationId}`;
  return query ? `${base}?${query}` : base;
}

async function revalidateAdminRecommendation(recommendationId: string, auditFolderId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/recommendations/${recommendationId}`);
  revalidatePath(`/editor/folders/${auditFolderId}`);
  revalidatePath("/editor");
  revalidatePath("/ssp");
  revalidatePath("/manager");
  revalidatePath("/analyst");
  revalidatePath(`/dashboard/folders/${auditFolderId}`);
  revalidatePath(`/public/folders/${auditFolderId}`);
  revalidatePath(`/reports/folders/${auditFolderId}`);
  revalidatePath(`/public/reports/folders/${auditFolderId}`);
}

async function loadFieldSupplements(
  recommendationId: string,
  fieldKey: string,
): Promise<SupplementRecord[]> {
  return db.recommendationFieldSupplement.findMany({
    where: { recommendationId, fieldKey },
    orderBy: { changeDate: "asc" },
    select: {
      id: true,
      fieldKey: true,
      content: true,
      previousContent: true,
      changeReason: true,
      changeDate: true,
    },
  });
}

async function applyRebuiltFieldValue(
  recommendationId: string,
  fieldKey: AdminSupplementFieldKey,
  items: SupplementRecord[],
) {
  const departments = (await getDepartments()).filter((d) => d.isActive);
  const nextValue = isAdminAppendFieldKey(fieldKey)
    ? rebuildAppendFieldValue(items)
    : rebuildReplaceFieldValue(items);
  const update = recommendationFieldUpdateFromSupplementValue(fieldKey, nextValue, departments);
  if (update.error || !update.data) {
    return update.error ?? "invalid_field";
  }
  await db.recommendation.update({
    where: { id: recommendationId },
    data: update.data,
  });
  return null;
}

/** Адмін створює доповнення до будь-якого supplement-поля (редактор або ССП). */
export async function adminSupplementRecommendationField(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const redirectPath = String(
    formData.get("redirect_path") ?? adminRecommendationRedirect(recommendationId),
  );
  const fieldKeyRaw = String(formData.get("field_key") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const changeReason = String(formData.get("change_reason") ?? "").trim();
  const changeDateRaw = String(formData.get("change_date") ?? "").trim();

  const recommendation = await db.recommendation.findUnique({ where: { id: recommendationId } });
  if (!recommendation) {
    redirect(`${redirectPath}?error=recommendation_not_found`);
  }
  if (!isAdminSupplementFieldKey(fieldKeyRaw)) {
    redirect(`${redirectPath}?error=invalid_field`);
  }
  const fieldKey = fieldKeyRaw;
  if (!content) redirect(`${redirectPath}?error=supplement_empty`);
  if (!changeReason) redirect(`${redirectPath}?error=change_reason_required`);

  const changeDate = changeDateRaw ? new Date(changeDateRaw) : new Date();
  if (Number.isNaN(changeDate.getTime())) {
    redirect(`${redirectPath}?error=invalid_change_date`);
  }

  const previousContent = readRecommendationFieldRaw(
    recommendation as unknown as Record<string, unknown>,
    fieldKey,
  );
  const departments = (await getDepartments()).filter((d) => d.isActive);

  if (isAdminAppendFieldKey(fieldKey)) {
    const currentValue = previousContent === "—" ? "" : previousContent;
    const nextValue = currentValue.trim() ? `${currentValue.trim()}\n\n${content}` : content;
    const update = recommendationFieldUpdateFromSupplementValue(fieldKey, nextValue, departments);
    if (update.error || !update.data) {
      redirect(`${redirectPath}?error=${update.error ?? "invalid_field"}`);
    }
    await db.$transaction([
      db.recommendationFieldSupplement.create({
        data: {
          recommendationId,
          fieldKey,
          content,
          previousContent: currentValue,
          changeReason,
          changeDate,
          createdById: actor.id,
        },
      }),
      db.recommendation.update({ where: { id: recommendationId }, data: update.data }),
    ]);
  } else if (isAdminReplaceFieldKey(fieldKey)) {
    const normalizedPrevious = previousContent === "—" ? "" : previousContent;
    if (content === normalizedPrevious) {
      redirect(`${redirectPath}?error=supplement_unchanged`);
    }
    const update = recommendationFieldUpdateFromSupplementValue(fieldKey, content, departments);
    if (update.error || !update.data) {
      redirect(`${redirectPath}?error=${update.error ?? "invalid_field"}`);
    }
    await db.$transaction([
      db.recommendationFieldSupplement.create({
        data: {
          recommendationId,
          fieldKey,
          content,
          previousContent: normalizedPrevious,
          changeReason,
          changeDate,
          createdById: actor.id,
        },
      }),
      db.recommendation.update({ where: { id: recommendationId }, data: update.data }),
    ]);
  }

  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "recommendation.supplemented",
    entityType: "recommendation",
    entityId: recommendationId,
    recommendationId,
    auditFolderId: recommendation.auditFolderId,
    summary: `Адмін доповнив поле «${adminSupplementFieldLabel(fieldKey)}»`,
    difference: {
      changes: [
        { field: fieldKey, before: previousContent || null, after: content },
        { field: "changeReason", before: null, after: changeReason },
      ],
    },
  });

  await revalidateAdminRecommendation(recommendationId, recommendation.auditFolderId);
  redirect(`${redirectPath}?ok=supplemented`);
}

/** Адмін редагує існуюче доповнення. */
export async function adminUpdateRecommendationSupplement(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const supplementId = String(formData.get("supplement_id") ?? "");
  const redirectPath = String(
    formData.get("redirect_path") ?? adminRecommendationRedirect(recommendationId),
  );
  const content = String(formData.get("content") ?? "").trim();
  const changeReason = String(formData.get("change_reason") ?? "").trim();
  const changeDateRaw = String(formData.get("change_date") ?? "").trim();

  if (!content) redirect(`${redirectPath}?error=supplement_empty`);
  if (!changeReason) redirect(`${redirectPath}?error=change_reason_required`);
  const changeDate = changeDateRaw ? new Date(changeDateRaw) : new Date();
  if (Number.isNaN(changeDate.getTime())) {
    redirect(`${redirectPath}?error=invalid_change_date`);
  }

  const recommendation = await db.recommendation.findUnique({
    where: { id: recommendationId },
    select: { id: true, auditFolderId: true },
  });
  if (!recommendation) redirect(`${redirectPath}?error=recommendation_not_found`);

  const existing = await db.recommendationFieldSupplement.findFirst({
    where: { id: supplementId, recommendationId },
  });
  if (!existing || !isAdminSupplementFieldKey(existing.fieldKey)) {
    redirect(`${redirectPath}?error=invalid_field`);
  }
  const fieldKey = existing.fieldKey;

  if (isAdminReplaceFieldKey(fieldKey)) {
    const departments = (await getDepartments()).filter((d) => d.isActive);
    const update = recommendationFieldUpdateFromSupplementValue(fieldKey, content, departments);
    if (update.error) redirect(`${redirectPath}?error=${update.error}`);
  }

  await db.recommendationFieldSupplement.update({
    where: { id: supplementId },
    data: { content, changeReason, changeDate },
  });

  const items = await loadFieldSupplements(recommendationId, fieldKey);
  const rebuildError = await applyRebuiltFieldValue(recommendationId, fieldKey, items);
  if (rebuildError) redirect(`${redirectPath}?error=${rebuildError}`);

  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "recommendation.supplemented",
    entityType: "recommendation",
    entityId: recommendationId,
    recommendationId,
    auditFolderId: recommendation.auditFolderId,
    summary: `Адмін відредагував доповнення поля «${adminSupplementFieldLabel(fieldKey)}»`,
    difference: {
      changes: [
        { field: fieldKey, before: existing.content, after: content },
        { field: "changeReason", before: existing.changeReason, after: changeReason },
      ],
    },
  });

  await revalidateAdminRecommendation(recommendationId, recommendation.auditFolderId);
  redirect(`${redirectPath}?ok=supplement_updated`);
}

/** Адмін видаляє доповнення і перераховує значення поля. */
export async function adminDeleteRecommendationSupplement(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const supplementId = String(formData.get("supplement_id") ?? "");
  const redirectPath = String(
    formData.get("redirect_path") ?? adminRecommendationRedirect(recommendationId),
  );

  const recommendation = await db.recommendation.findUnique({
    where: { id: recommendationId },
    select: { id: true, auditFolderId: true },
  });
  if (!recommendation) redirect(`${redirectPath}?error=recommendation_not_found`);

  const existing = await db.recommendationFieldSupplement.findFirst({
    where: { id: supplementId, recommendationId },
  });
  if (!existing || !isAdminSupplementFieldKey(existing.fieldKey)) {
    redirect(`${redirectPath}?error=invalid_field`);
  }
  const fieldKey = existing.fieldKey;

  await db.recommendationFieldSupplement.delete({ where: { id: supplementId } });
  const items = await loadFieldSupplements(recommendationId, fieldKey);
  const rebuildError = await applyRebuiltFieldValue(recommendationId, fieldKey, items);
  if (rebuildError) redirect(`${redirectPath}?error=${rebuildError}`);

  await writeAuditLog({
    actor,
    actorRole: "admin",
    action: "recommendation.supplemented",
    entityType: "recommendation",
    entityId: recommendationId,
    recommendationId,
    auditFolderId: recommendation.auditFolderId,
    summary: `Адмін видалив доповнення поля «${adminSupplementFieldLabel(fieldKey)}»`,
    difference: {
      changes: [{ field: fieldKey, before: existing.content, after: null }],
    },
  });

  await revalidateAdminRecommendation(recommendationId, recommendation.auditFolderId);
  redirect(`${redirectPath}?ok=supplement_deleted`);
}
