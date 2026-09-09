"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isFolderArchived } from "@/lib/audit-folder-archive";
import { buildObjectDifference, buildUpdateSummary, statusLabelUk, writeAuditLog } from "@/lib/audit-log";
import { actingRoleForSsp } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { canTransition } from "@/lib/domain/recommendation-state-machine";
import { db } from "@/lib/db";
import { sspEditableRecommendationByIdWhere, sspRecommendationByIdWhere } from "@/lib/ssp/recommendation-access";
import {
  parseSspRecommendationFormFields,
  sspFieldsToDbData,
  validateSspSubmitFields,
} from "@/lib/ssp/recommendation-form-validation";
import {
  SSP_SUPPLEMENT_FIELD_LABELS,
  canSspSupplementRecommendation,
  formatSspStoredDate,
  isSspAppendFieldKey,
  isSspReplaceFieldKey,
  isSspSupplementFieldKey,
  isValidSspProgressReport,
} from "@/lib/ssp/recommendation-supplements";
import type { RecommendationStatus } from "@/lib/types";

export async function saveSspDraft(formData: FormData) {
  const profile = await requireRole(["ssp"]);
  const id = String(formData.get("recommendation_id") ?? "");
  const fields = parseSspRecommendationFormFields(formData);
  const currentStatus = String(formData.get("current_status") ?? "") as RecommendationStatus;

  if (fields.actualImplementationDate && Number.isNaN(fields.actualImplementationDate.getTime())) {
    throw new Error("Фактична дата впровадження вказана некоректно.");
  }

  const editableWhere = await sspEditableRecommendationByIdWhere(id, profile.id);
  const dbData = sspFieldsToDbData(fields);

  const existing = await db.recommendation.findFirst({
    where: editableWhere,
    select: {
      auditFolderId: true,
      status: true,
      progressReport: true,
      measuresDescription: true,
      actualImplementationDate: true,
      expectedAchievement: true,
      supportingDocuments: true,
      sspNotes: true,
      auditFolder: { select: { archivedAt: true } },
    },
  });
  if (!existing) {
    throw new Error("Рекомендацію не знайдено або доступ заборонено.");
  }

  if (isFolderArchived(existing.auditFolder.archivedAt)) {
    throw new Error("Папку звіту архівовано. Зміни недоступні.");
  }

  if (existing.status !== currentStatus) {
    throw new Error("Статус рекомендації змінився. Оновіть сторінку.");
  }

  if (existing.status === "ssp_draft") {
    const result = await db.recommendation.updateMany({
      where: editableWhere,
      data: dbData,
    });
    if (result.count === 0) {
      throw new Error("Не вдалося зберегти чернетку.");
    }
    const difference = buildObjectDifference(
      {
        progressReport: existing.progressReport,
        measuresDescription: existing.measuresDescription,
        actualImplementationDate: existing.actualImplementationDate,
        expectedAchievement: existing.expectedAchievement,
        supportingDocuments: existing.supportingDocuments,
        sspNotes: existing.sspNotes,
      },
      dbData,
    );
    await writeAuditLog({
      actor: profile,
      actorRole: "ssp",
      action: "recommendation.updated",
      entityType: "recommendation",
      entityId: id,
      recommendationId: id,
      auditFolderId: existing.auditFolderId,
      summary: buildUpdateSummary("Оновлено чернетку відповідального", difference),
      difference,
    });
    revalidatePath("/ssp");
    revalidatePath(`/ssp/recommendations/${id}`);
    revalidatePath(`/editor/folders/${existing.auditFolderId}`);
    revalidatePath("/editor");
    redirect("/ssp");
  }

  const validation = canTransition({
    currentStatus: existing.status,
    nextStatus: "ssp_draft",
    role: actingRoleForSsp(profile.roles),
  });
  if (!validation.ok) throw new Error(validation.message);

  const result = await db.recommendation.updateMany({
    where: editableWhere,
    data: {
      status: "ssp_draft",
      assigneeUserId: profile.id,
      ...dbData,
    },
  });
  if (result.count === 0) {
    throw new Error("Не вдалося зберегти чернетку.");
  }

  await writeAuditLog({
    actor: profile,
    actorRole: "ssp",
    action: "recommendation.status_changed",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: existing.auditFolderId,
    summary: `Збережено чернетку ССП (${statusLabelUk(existing.status)} → ${statusLabelUk("ssp_draft")})`,
    difference: { from: existing.status, to: "ssp_draft" },
  });

  revalidatePath("/ssp");
  revalidatePath(`/ssp/recommendations/${id}`);
  revalidatePath(`/editor/folders/${existing.auditFolderId}`);
  revalidatePath("/editor");
  redirect("/ssp");
}

export async function submitForReview(formData: FormData) {
  const profile = await requireRole(["ssp"]);
  const id = String(formData.get("recommendation_id") ?? "");
  const fields = parseSspRecommendationFormFields(formData);
  const currentStatus = String(formData.get("current_status") ?? "in_progress") as RecommendationStatus;

  const validationError = validateSspSubmitFields(fields);
  if (validationError) {
    throw new Error(validationError);
  }

  const editableWhere = await sspEditableRecommendationByIdWhere(id, profile.id);
  const dbData = sspFieldsToDbData(fields);

  const existing = await db.recommendation.findFirst({
    where: editableWhere,
    select: {
      auditFolderId: true,
      status: true,
      assigneeUserId: true,
      auditFolder: { select: { archivedAt: true } },
    },
  });
  if (!existing) {
    throw new Error("Рекомендацію не знайдено або доступ заборонено.");
  }

  if (isFolderArchived(existing.auditFolder.archivedAt)) {
    throw new Error("Папку звіту архівовано. Зміни недоступні.");
  }

  if (existing.status !== currentStatus) {
    throw new Error("Статус рекомендації змінився. Оновіть сторінку.");
  }

  const validation = canTransition({
    currentStatus: existing.status,
    nextStatus: "manager_review",
    role: actingRoleForSsp(profile.roles),
  });
  if (!validation.ok) throw new Error(validation.message);

  const result = await db.recommendation.updateMany({
    where: editableWhere,
    data: {
      ...dbData,
      status: "manager_review",
      managerComment: null,
      assigneeUserId: existing.assigneeUserId ?? profile.id,
    },
  });
  if (result.count === 0) {
    throw new Error("Рекомендацію не знайдено, вона вже надіслана або доступ заборонено.");
  }

  await writeAuditLog({
    actor: profile,
    actorRole: "ssp",
    action: "recommendation.submitted_manager",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: existing.auditFolderId,
    summary: `Надіслано керівнику (${statusLabelUk(existing.status)} → ${statusLabelUk("manager_review")})`,
    difference: { from: existing.status, to: "manager_review" },
  });

  revalidatePath("/ssp");
  revalidatePath(`/ssp/recommendations/${id}`);
  revalidatePath(`/editor/folders/${existing.auditFolderId}`);
  revalidatePath("/editor");
  redirect(`/ssp/recommendations/${id}?submitted=1`);
}

/**
 * Доповнення ССП-поля після верифікації аналітиком (`published`),
 * доки папка звіту не архівована / не завершена.
 * Доступні лише поля робочої зони ССП.
 */
export async function supplementSspRecommendationField(formData: FormData) {
  const profile = await requireRole(["ssp"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const redirectPath = String(formData.get("redirect_path") ?? `/ssp/recommendations/${recommendationId}`);
  const fieldKeyRaw = String(formData.get("field_key") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const changeReason = String(formData.get("change_reason") ?? "").trim();
  const changeDateRaw = String(formData.get("change_date") ?? "").trim();

  const accessibleWhere = await sspRecommendationByIdWhere(recommendationId, profile.id);
  const recommendation = await db.recommendation.findFirst({
    where: accessibleWhere,
    include: { auditFolder: { select: { archivedAt: true } } },
  });

  if (!recommendation) {
    redirect(`${redirectPath}?error=recommendation_not_found`);
  }

  if (!canSspSupplementRecommendation({
    status: recommendation.status,
    archivedAt: recommendation.auditFolder.archivedAt,
  })) {
    if (isFolderArchived(recommendation.auditFolder.archivedAt)) {
      redirect(`${redirectPath}?error=folder_archived`);
    }
    redirect(`${redirectPath}?error=cannot_supplement_until_verified`);
  }

  if (!isSspSupplementFieldKey(fieldKeyRaw)) {
    redirect(`${redirectPath}?error=invalid_field`);
  }
  const fieldKey = fieldKeyRaw;

  if (!content) {
    redirect(`${redirectPath}?error=supplement_empty`);
  }
  if (!changeReason) {
    redirect(`${redirectPath}?error=change_reason_required`);
  }

  const changeDate = changeDateRaw ? new Date(changeDateRaw) : new Date();
  if (Number.isNaN(changeDate.getTime())) {
    redirect(`${redirectPath}?error=invalid_change_date`);
  }

  let previousContent = "";

  if (isSspAppendFieldKey(fieldKey)) {
    const currentRaw = recommendation[fieldKey];
    const currentValue = typeof currentRaw === "string" ? currentRaw ?? "" : "";
    const nextValue = currentValue.trim() ? `${currentValue.trim()}\n\n${content}` : content;
    previousContent = currentValue;

    await db.$transaction([
      db.recommendationFieldSupplement.create({
        data: {
          recommendationId: recommendation.id,
          fieldKey,
          content,
          previousContent: currentValue,
          changeReason,
          changeDate,
          createdById: profile.id,
        },
      }),
      db.recommendation.update({
        where: { id: recommendation.id },
        data: {
          [fieldKey]: nextValue,
          assigneeUserId: recommendation.assigneeUserId ?? profile.id,
        },
      }),
    ]);
  } else if (isSspReplaceFieldKey(fieldKey)) {
    if (fieldKey === "progressReport") {
      if (!isValidSspProgressReport(content)) {
        redirect(`${redirectPath}?error=invalid_progress_report`);
      }
      if (content === (recommendation.progressReport ?? "")) {
        redirect(`${redirectPath}?error=supplement_unchanged`);
      }
      previousContent = recommendation.progressReport ?? "";
      await db.$transaction([
        db.recommendationFieldSupplement.create({
          data: {
            recommendationId: recommendation.id,
            fieldKey,
            content,
            previousContent,
            changeReason,
            changeDate,
            createdById: profile.id,
          },
        }),
        db.recommendation.update({
          where: { id: recommendation.id },
          data: {
            progressReport: content,
            assigneeUserId: recommendation.assigneeUserId ?? profile.id,
          },
        }),
      ]);
    } else if (fieldKey === "actualImplementationDate") {
      const nextDate = new Date(content);
      if (Number.isNaN(nextDate.getTime())) {
        redirect(`${redirectPath}?error=invalid_implementation_date`);
      }
      const current = formatSspStoredDate(recommendation.actualImplementationDate);
      if (content === current) {
        redirect(`${redirectPath}?error=supplement_unchanged`);
      }
      previousContent = current || "—";
      await db.$transaction([
        db.recommendationFieldSupplement.create({
          data: {
            recommendationId: recommendation.id,
            fieldKey,
            content,
            previousContent,
            changeReason,
            changeDate,
            createdById: profile.id,
          },
        }),
        db.recommendation.update({
          where: { id: recommendation.id },
          data: {
            actualImplementationDate: nextDate,
            assigneeUserId: recommendation.assigneeUserId ?? profile.id,
          },
        }),
      ]);
    }
  }

  await writeAuditLog({
    actor: profile,
    actorRole: "ssp",
    action: "recommendation.supplemented",
    entityType: "recommendation",
    entityId: recommendation.id,
    recommendationId: recommendation.id,
    auditFolderId: recommendation.auditFolderId,
    summary: `ССП доповнив поле «${SSP_SUPPLEMENT_FIELD_LABELS[fieldKey]}»`,
    difference: {
      changes: [
        { field: fieldKey, before: previousContent || null, after: content },
        { field: "changeReason", before: null, after: changeReason },
      ],
    },
  });

  revalidatePath("/ssp");
  revalidatePath(`/ssp/recommendations/${recommendation.id}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath("/editor");
  revalidatePath(`/manager/recommendations/${recommendation.id}`);
  revalidatePath(`/analyst/recommendations/${recommendation.id}`);
  redirect(`${redirectPath}?ok=supplemented`);
}
