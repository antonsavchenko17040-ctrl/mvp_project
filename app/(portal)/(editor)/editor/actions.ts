"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDepartments } from "@/lib/admin/departments-store";
import { canArchiveFolderByRecommendations, isFolderArchived } from "@/lib/audit-folder-archive";
import { buildObjectDifference, buildUpdateSummary, statusLabelUk, writeAuditLog } from "@/lib/audit-log";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { type SupplementFieldKey, SUPPLEMENT_FIELD_LABELS, isAppendFieldKey, isReplaceFieldKey, isSupplementFieldKey } from "@/lib/editor/recommendation-supplements";
import {
  AuditFolderXlsxImportError,
  auditFolderTitleFromFilename,
  isFullyFilledImportedFolder,
  parseAuditFolderXlsx,
} from "@/lib/import/audit-folder-xlsx";
import { nextRecommendationSequenceNumber } from "@/lib/recommendation-sequence";

function formatStoredDate(value: Date | null | undefined): string {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Дата з поля `type="date"` (YYYY-MM-DD) у локальному календарі. */
function parseDateOnlyInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function startOfLocalToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function createAuditFolder(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const title = String(formData.get("title") ?? "");
  const currentYear = new Date().getFullYear();
  const year = Number(formData.get("year") ?? currentYear);

  if (!Number.isFinite(year) || year < 2000 || year > currentYear) {
    redirect("/editor?error=invalid_year");
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
    actorRole: "editor",
    action: "audit_folder.created",
    entityType: "audit_folder",
    entityId: folder.id,
    auditFolderId: folder.id,
    summary: `Створено папку аудиту «${title}» (${year})`,
    difference: { title, year },
  });
  revalidatePath("/editor");
}

export async function createRecommendation(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const auditFolderId = String(formData.get("audit_folder_id") ?? "");
  const assigneeUserIdRaw = String(formData.get("assignee_user_id") ?? "").trim();
  const assigneeUserId = assigneeUserIdRaw === "" ? null : assigneeUserIdRaw;
  const sspUnit = String(formData.get("ssp_unit") ?? "");
  const observationSignificance = String(formData.get("observation_significance") ?? "середній");
  const redirectPath = String(formData.get("redirect_path") ?? "/editor");
  const deadline = parseDateOnlyInput(String(formData.get("deadline") ?? ""));
  const informingDeadline = parseDateOnlyInput(String(formData.get("informing_deadline") ?? ""));

  const folder = await db.auditFolder.findFirst({
    where: { id: auditFolderId, createdById: profile.id },
    select: { id: true, archivedAt: true },
  });
  if (!folder) {
    redirect(`${redirectPath}?error=folder_not_found`);
  }
  if (isFolderArchived(folder.archivedAt)) {
    redirect(`/editor/folders/${auditFolderId}?error=folder_archived`);
  }

  if (!deadline) {
    redirect(`${redirectPath}?error=invalid_deadline`);
  }
  if (!informingDeadline) {
    redirect(`${redirectPath}?error=invalid_informing_deadline`);
  }
  if (deadline.getTime() < startOfLocalToday().getTime()) {
    redirect(`${redirectPath}?error=deadline_before_today`);
  }
  if (informingDeadline.getTime() < deadline.getTime()) {
    redirect(`${redirectPath}?error=informing_before_deadline`);
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
  const validDepartment = activeDepartments.some((department) => department.name === sspUnit);
  if (!validDepartment) {
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
      deadline,
      informingDeadline,
      status,
      assigneeUserId,
    },
    select: { id: true },
  });
  await writeAuditLog({
    actor: profile,
    actorRole: "editor",
    action: "recommendation.created",
    entityType: "recommendation",
    entityId: created.id,
    recommendationId: created.id,
    auditFolderId,
    summary:
      intent === "assign"
        ? `Створено рекомендацію №${sequenceNumber} і передано на виконання`
        : `Створено чернетку рекомендації №${sequenceNumber}`,
    difference: { status, sequenceNumber, sspUnit, intent },
  });
  revalidatePath("/editor");
  revalidatePath(`/editor/folders/${auditFolderId}`);
  revalidatePath(`/editor/folders/${auditFolderId}/new`);
  revalidatePath(`/editor/folders/${auditFolderId}/recommendations/${created.id}/edit`);
  if (intent === "assign") {
    redirect(`/editor/folders/${auditFolderId}`);
  }
  redirect(`/editor/folders/${auditFolderId}/recommendations/${created.id}/edit`);
}

export async function startExecution(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const returnPath = String(formData.get("return_path") ?? "").trim();
  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      auditFolder: { createdById: profile.id },
    },
    select: {
      assigneeUserId: true,
      sspUnit: true,
      auditFolderId: true,
      status: true,
      vkElement: true,
      observationSignificance: true,
      deficiency: true,
      recommendationText: true,
      executionIndicator: true,
      expectedResult: true,
      deadline: true,
      informingDeadline: true,
      auditFolder: { select: { archivedAt: true } },
    },
  });
  if (!recommendation) {
    redirect("/editor?error=recommendation_not_found");
  }
  const errorBase =
    returnPath !== "" && returnPath.startsWith("/") ? returnPath : `/editor/folders/${recommendation.auditFolderId}`;
  if (isFolderArchived(recommendation.auditFolder.archivedAt)) {
    redirect(`${errorBase}?error=folder_archived`);
  }
  if (recommendation.status !== "draft" && recommendation.status !== "ssp_draft") {
    redirect(`${errorBase}?error=cannot_start_from_status`);
  }

  // Кнопка «Передати в роботу» сабмітить ту саму форму, що й «Зберегти зміни» —
  // зберігаємо всі поля, інакше правки редактора втрачаються.
  const assigneeUserIdRaw = String(formData.get("assignee_user_id") ?? "").trim();
  const assigneeUserId = assigneeUserIdRaw === "" ? null : assigneeUserIdRaw;
  const sspUnitRaw = String(formData.get("ssp_unit") ?? "").trim();
  const sspUnit = sspUnitRaw || recommendation.sspUnit.trim();
  const observationSignificance = String(formData.get("observation_significance") ?? "середній");
  const informingDeadlineRaw = String(formData.get("informing_deadline") ?? "").trim();
  const informingDeadline = informingDeadlineRaw === "" ? null : new Date(informingDeadlineRaw);
  const deadline = new Date(String(formData.get("deadline") ?? ""));
  if (Number.isNaN(deadline.getTime())) {
    redirect(`${errorBase}?error=invalid_deadline`);
  }
  if (informingDeadline && Number.isNaN(informingDeadline.getTime())) {
    redirect(`${errorBase}?error=invalid_informing_deadline`);
  }

  const nextValues = {
    vkElement: String(formData.get("vk_element") ?? ""),
    observationSignificance,
    deficiency: String(formData.get("deficiency") ?? ""),
    recommendationText: String(formData.get("recommendation_text") ?? ""),
    executionIndicator: String(formData.get("execution_indicator") ?? ""),
    expectedResult: String(formData.get("expected_result") ?? ""),
    sspUnit,
    deadline,
    informingDeadline,
    assigneeUserId,
  };

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
      redirect(`${errorBase}?error=assignee_not_found`);
    }
  }

  const activeDepartments = (await getDepartments()).filter((department) => department.isActive);
  const matchedDepartment = activeDepartments.find((department) => department.name === nextValues.sspUnit);
  if (!matchedDepartment) {
    redirect(`${errorBase}?error=invalid_department`);
  }
  nextValues.sspUnit = matchedDepartment.name;

  const fieldDifference = buildObjectDifference(
    {
      vkElement: recommendation.vkElement,
      observationSignificance: recommendation.observationSignificance,
      deficiency: recommendation.deficiency,
      recommendationText: recommendation.recommendationText,
      executionIndicator: recommendation.executionIndicator,
      expectedResult: recommendation.expectedResult,
      sspUnit: recommendation.sspUnit,
      deadline: recommendation.deadline,
      informingDeadline: recommendation.informingDeadline,
      assigneeUserId: recommendation.assigneeUserId,
    },
    nextValues,
  );

  await db.recommendation.update({
    where: { id: recommendationId },
    data: {
      ...nextValues,
      status: "in_progress",
    },
  });
  await writeAuditLog({
    actor: profile,
    actorRole: "editor",
    action: "recommendation.started",
    entityType: "recommendation",
    entityId: recommendationId,
    recommendationId,
    auditFolderId: recommendation.auditFolderId,
    summary: `Передано на виконання (було: ${statusLabelUk(recommendation.status)})`,
    difference: {
      from: recommendation.status,
      to: "in_progress",
      ...fieldDifference,
    },
  });
  revalidatePath("/editor");
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}/recommendations/${recommendationId}`);
  revalidatePath(`/ssp/recommendations/${recommendationId}`);
  revalidatePath("/ssp");
  redirect(`/editor/folders/${recommendation.auditFolderId}`);
}

export async function updateRecommendation(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const redirectPath = String(formData.get("redirect_path") ?? "/editor");

  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      auditFolder: {
        createdById: profile.id,
      },
    },
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
      auditFolder: { select: { archivedAt: true } },
    },
  });

  if (!recommendation) {
    redirect(`${redirectPath}?error=recommendation_not_found`);
  }

  if (isFolderArchived(recommendation.auditFolder.archivedAt)) {
    redirect(`/editor/folders/${recommendation.auditFolderId}?error=folder_archived`);
  }

  if (recommendation.status !== "draft") {
    redirect(`${redirectPath}?error=cannot_edit_status`);
  }

  const assigneeUserIdRaw = String(formData.get("assignee_user_id") ?? "").trim();
  const assigneeUserId = assigneeUserIdRaw === "" ? null : assigneeUserIdRaw;
  const sspUnit = String(formData.get("ssp_unit") ?? "");
  const observationSignificance = String(formData.get("observation_significance") ?? "середній");
  const informingDeadlineRaw = String(formData.get("informing_deadline") ?? "").trim();
  const informingDeadline = informingDeadlineRaw === "" ? null : new Date(informingDeadlineRaw);
  const nextValues = {
    vkElement: String(formData.get("vk_element") ?? ""),
    observationSignificance,
    deficiency: String(formData.get("deficiency") ?? ""),
    recommendationText: String(formData.get("recommendation_text") ?? ""),
    executionIndicator: String(formData.get("execution_indicator") ?? ""),
    expectedResult: String(formData.get("expected_result") ?? ""),
    sspUnit,
    deadline: new Date(String(formData.get("deadline") ?? "")),
    informingDeadline,
    assigneeUserId,
  };

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
  const validDepartment = activeDepartments.some((department) => department.name === sspUnit);
  if (!validDepartment) {
    redirect(`${redirectPath}?error=invalid_department`);
  }

  await db.recommendation.update({
    where: { id: recommendation.id },
    data: nextValues,
  });

  const difference = buildObjectDifference(
    {
      vkElement: recommendation.vkElement,
      observationSignificance: recommendation.observationSignificance,
      deficiency: recommendation.deficiency,
      recommendationText: recommendation.recommendationText,
      executionIndicator: recommendation.executionIndicator,
      expectedResult: recommendation.expectedResult,
      sspUnit: recommendation.sspUnit,
      deadline: recommendation.deadline,
      informingDeadline: recommendation.informingDeadline,
      assigneeUserId: recommendation.assigneeUserId,
    },
    nextValues,
  );

  await writeAuditLog({
    actor: profile,
    actorRole: "editor",
    action: "recommendation.updated",
    entityType: "recommendation",
    entityId: recommendation.id,
    recommendationId: recommendation.id,
    auditFolderId: recommendation.auditFolderId,
    summary: buildUpdateSummary("Оновлено чернетку рекомендації", difference),
    difference,
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}/recommendations/${recommendation.id}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}/recommendations/${recommendation.id}/edit`);
  redirect(`/editor/folders/${recommendation.auditFolderId}`);
}

/**
 * Доповнення одного поля рекомендації (під полем: значення + причина + дата).
 * Попередні значення не видаляються: append — історія фрагментів; replace — попереднє блокується.
 */
export async function supplementRecommendationField(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const redirectPath = String(formData.get("redirect_path") ?? "/editor");
  const fieldKeyRaw = String(formData.get("field_key") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const changeReason = String(formData.get("change_reason") ?? "").trim();
  const changeDateRaw = String(formData.get("change_date") ?? "").trim();

  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      auditFolder: { createdById: profile.id },
    },
    include: {
      auditFolder: { select: { archivedAt: true } },
    },
  });

  if (!recommendation) {
    redirect(`${redirectPath}?error=recommendation_not_found`);
  }

  if (isFolderArchived(recommendation.auditFolder.archivedAt)) {
    redirect(`/editor/folders/${recommendation.auditFolderId}?error=folder_archived`);
  }

  if (recommendation.status === "ssp_draft") {
    redirect(`${redirectPath}?error=cannot_supplement_ssp_draft`);
  }

  if (!isSupplementFieldKey(fieldKeyRaw)) {
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

  const activeDepartments = (await getDepartments()).filter((department) => department.isActive);
  let previousContent = "";

  if (isAppendFieldKey(fieldKey)) {
    const currentRaw = recommendation[fieldKey];
    const currentValue = typeof currentRaw === "string" ? currentRaw : currentRaw ?? "";
    const nextValue = currentValue.trim() ? `${currentValue.trim()}\n\n${content}` : content;
    previousContent = currentValue;

    const updateData =
      fieldKey === "changeReason"
        ? { changeReason: nextValue }
        : { changeReason, [fieldKey]: nextValue };

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
        data: updateData,
      }),
    ]);
  } else if (isReplaceFieldKey(fieldKey)) {
    const updateData: {
      changeReason: string;
      observationSignificance?: string;
      sspUnit?: string;
      deadline?: Date;
      informingDeadline?: Date | null;
    } = { changeReason };

    if (fieldKey === "observationSignificance") {
      if (content === recommendation.observationSignificance) {
        redirect(`${redirectPath}?error=supplement_unchanged`);
      }
      previousContent = recommendation.observationSignificance;
      updateData.observationSignificance = content;
    } else if (fieldKey === "sspUnit") {
      const validDepartment = activeDepartments.some((department) => department.name === content);
      if (!validDepartment) {
        redirect(`${redirectPath}?error=invalid_department`);
      }
      if (content === recommendation.sspUnit) {
        redirect(`${redirectPath}?error=supplement_unchanged`);
      }
      previousContent = recommendation.sspUnit;
      updateData.sspUnit = content;
    } else if (fieldKey === "deadline") {
      const nextDeadline = new Date(content);
      if (Number.isNaN(nextDeadline.getTime())) {
        redirect(`${redirectPath}?error=invalid_deadline`);
      }
      const current = formatStoredDate(recommendation.deadline);
      if (content === current) {
        redirect(`${redirectPath}?error=supplement_unchanged`);
      }
      previousContent = current;
      updateData.deadline = nextDeadline;
    } else if (fieldKey === "informingDeadline") {
      const nextInforming = new Date(content);
      if (Number.isNaN(nextInforming.getTime())) {
        redirect(`${redirectPath}?error=invalid_informing_deadline`);
      }
      const current = formatStoredDate(recommendation.informingDeadline);
      if (content === current) {
        redirect(`${redirectPath}?error=supplement_unchanged`);
      }
      previousContent = current || "—";
      updateData.informingDeadline = nextInforming;
    }

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
        data: updateData,
      }),
    ]);
  }

  await writeAuditLog({
    actor: profile,
    actorRole: "editor",
    action: "recommendation.supplemented",
    entityType: "recommendation",
    entityId: recommendation.id,
    recommendationId: recommendation.id,
    auditFolderId: recommendation.auditFolderId,
    summary: `Доповнено поле «${SUPPLEMENT_FIELD_LABELS[fieldKey]}»`,
    difference: {
      changes: [
        { field: fieldKey, before: previousContent || null, after: content },
        { field: "changeReason", before: null, after: changeReason },
      ],
    },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}/recommendations/${recommendation.id}`);
  revalidatePath(`/dashboard/folders/${recommendation.auditFolderId}`);
  revalidatePath(`/public/folders/${recommendation.auditFolderId}`);
  revalidatePath(`/reports/folders/${recommendation.auditFolderId}`);
  revalidatePath(`/public/reports/folders/${recommendation.auditFolderId}`);
  redirect(`/editor/folders/${recommendation.auditFolderId}/recommendations/${recommendation.id}?ok=supplemented`);
}

export async function deleteRecommendation(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const recommendationId = String(formData.get("recommendation_id") ?? "");
  const redirectPath = String(formData.get("redirect_path") ?? "/editor");

  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      auditFolder: {
        createdById: profile.id,
      },
    },
    select: {
      id: true,
      auditFolderId: true,
      status: true,
      auditFolder: { select: { archivedAt: true } },
    },
  });

  if (!recommendation) {
    redirect(`${redirectPath}?error=recommendation_not_found`);
  }

  if (isFolderArchived(recommendation.auditFolder.archivedAt)) {
    redirect(`/editor/folders/${recommendation.auditFolderId}?error=folder_archived`);
  }

  if (recommendation.status !== "draft") {
    redirect(`${redirectPath}?error=cannot_delete_non_draft`);
  }

  await db.recommendation.delete({ where: { id: recommendation.id } });
  await writeAuditLog({
    actor: profile,
    actorRole: "editor",
    action: "recommendation.deleted",
    entityType: "recommendation",
    entityId: recommendation.id,
    recommendationId: recommendation.id,
    auditFolderId: recommendation.auditFolderId,
    summary: "Видалено чернетку рекомендації",
    difference: { status: recommendation.status },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/folders/${recommendation.auditFolderId}`);
  redirect(`/editor/folders/${recommendation.auditFolderId}`);
}

export async function archiveAuditFolder(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const auditFolderId = String(formData.get("audit_folder_id") ?? "");

  const folder = await db.auditFolder.findFirst({
    where: { id: auditFolderId, createdById: profile.id },
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
    redirect("/editor?error=folder_not_found");
  }

  if (isFolderArchived(folder.archivedAt)) {
    redirect(`/editor/folders/${folder.id}?error=already_archived`);
  }

  if (!canArchiveFolderByRecommendations(folder.recommendations)) {
    redirect(`/editor/folders/${folder.id}?error=cannot_archive_incomplete`);
  }

  const archivedAt = new Date();
  await db.auditFolder.update({
    where: { id: folder.id },
    data: { archivedAt },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "editor",
    action: "audit_folder.archived",
    entityType: "audit_folder",
    entityId: folder.id,
    auditFolderId: folder.id,
    summary: `Архівовано папку аудиту «${folder.title}»`,
    difference: { archivedAt: archivedAt.toISOString() },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/folders/${folder.id}`);
  revalidatePath(`/dashboard/folders/${folder.id}`);
  revalidatePath(`/public/folders/${folder.id}`);
  revalidatePath(`/reports/folders/${folder.id}`);
  revalidatePath(`/public/reports/folders/${folder.id}`);
  revalidatePath("/ssp");
  redirect(`/editor/folders/${folder.id}?ok=archived`);
}

export async function importAuditFolderFromXlsx(formData: FormData) {
  const profile = await requireRole(["editor"]);
  const file = formData.get("file");
  const year = Number(formData.get("year") ?? new Date().getFullYear());

  if (!(file instanceof File) || file.size === 0) {
    redirect("/editor?error=import_no_file");
  }

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    redirect("/editor?error=import_invalid_year");
  }

  const filename = file.name;
  if (!filename.toLowerCase().endsWith(".xlsx")) {
    redirect("/editor?error=import_invalid_format");
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
      redirect(`/editor?error=${error.code}${rowSuffix}`);
    }
    redirect("/editor?error=import_parse_failed");
  }

  for (const row of parsed.recommendations) {
    if (!row.deadline || Number.isNaN(row.deadline.getTime())) {
      redirect(`/editor?error=import_invalid_deadline&row=${row.excelRow}`);
    }
  }

  if (isFullyFilledImportedFolder(parsed.recommendations)) {
    redirect("/editor?error=import_admin_only");
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
          // Неповні звіти редактора завжди як чернетки для подальшого розподілу.
          status: "draft",
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
    actorRole: "editor",
    action: "audit_folder.imported",
    entityType: "audit_folder",
    entityId: folder.id,
    auditFolderId: folder.id,
    summary: `Імпортовано папку аудиту «${parsed.title}» (${parsed.recommendations.length} рекомендацій)`,
    difference: {
      title: parsed.title,
      year,
      recommendationsCount: parsed.recommendations.length,
    },
  });

  revalidatePath("/editor");
  revalidatePath(`/editor/folders/${folder.id}`);
  revalidatePath("/public/dashboard");
  revalidatePath("/public/reports");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/public/folders/${folder.id}`);
  revalidatePath(`/dashboard/folders/${folder.id}`);
  revalidatePath(`/reports/folders/${folder.id}`);
  revalidatePath(`/public/reports/folders/${folder.id}`);

  redirect(`/editor/folders/${folder.id}?ok=imported`);
}
