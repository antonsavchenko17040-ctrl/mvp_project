"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAuditFolderArchivedById } from "@/lib/audit-folder-archive";
import { statusLabelUk, writeAuditLog } from "@/lib/audit-log";
import { actingRoleForAnalyst } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canTransition } from "@/lib/domain/recommendation-state-machine";

export async function verifyRecommendation(formData: FormData) {
  const profile = await requireRole(["analyst"]);
  const id = String(formData.get("recommendation_id") ?? "");
  const currentStatus = String(formData.get("current_status") ?? "on_review");
  const comment = String(formData.get("analyst_comment") ?? "").trim();

  if (comment) {
    redirect(`/analyst/recommendations/${id}?error=analyst_comment_must_be_empty`);
  }

  const validation = canTransition({
    currentStatus: currentStatus as never,
    nextStatus: "published",
    role: actingRoleForAnalyst(profile.roles),
  });
  if (!validation.ok) throw new Error(validation.message);

  const existing = await db.recommendation.findUnique({
    where: { id },
    select: { auditFolderId: true },
  });
  if (!existing) {
    redirect("/analyst?error=recommendation_not_found");
  }
  if (await isAuditFolderArchivedById(existing.auditFolderId)) {
    redirect(`/analyst/recommendations/${id}?error=folder_archived`);
  }

  await db.recommendation.update({
    where: { id },
    data: { status: "published", analystComment: null },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "analyst",
    action: "recommendation.published",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: existing.auditFolderId,
    summary: `Підтверджено виконання аналітиком (${statusLabelUk(currentStatus)} → ${statusLabelUk("published")})`,
    difference: { from: currentStatus, to: "published" },
  });

  revalidatePath("/analyst");
  revalidatePath(`/analyst/recommendations/${id}`);
  redirect("/analyst");
}

export async function sendToRevision(formData: FormData) {
  const profile = await requireRole(["analyst"]);
  const id = String(formData.get("recommendation_id") ?? "");
  const comment = String(formData.get("analyst_comment") ?? "").trim();
  const currentStatus = String(formData.get("current_status") ?? "on_review");

  const validation = canTransition({
    currentStatus: currentStatus as never,
    nextStatus: "revision",
    role: actingRoleForAnalyst(profile.roles),
    analystComment: comment,
  });
  if (!validation.ok) {
    redirect(`/analyst/recommendations/${id}?error=analyst_comment_required`);
  }

  const existing = await db.recommendation.findUnique({
    where: { id },
    select: { auditFolderId: true },
  });
  if (!existing) {
    redirect("/analyst?error=recommendation_not_found");
  }
  if (await isAuditFolderArchivedById(existing.auditFolderId)) {
    redirect(`/analyst/recommendations/${id}?error=folder_archived`);
  }

  await db.recommendation.update({
    where: { id },
    data: { status: "revision", analystComment: comment },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "analyst",
    action: "recommendation.revision",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: existing.auditFolderId,
    summary: `Повернено на доопрацювання аналітиком (${statusLabelUk(currentStatus)} → ${statusLabelUk("revision")})`,
    difference: { from: currentStatus, to: "revision", comment },
  });

  revalidatePath("/analyst");
  revalidatePath(`/analyst/recommendations/${id}`);
  redirect("/analyst");
}
