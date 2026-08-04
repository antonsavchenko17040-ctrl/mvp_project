"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAuditFolderArchivedById } from "@/lib/audit-folder-archive";
import { statusLabelUk, writeAuditLog } from "@/lib/audit-log";
import { actingRoleForManager } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canTransition } from "@/lib/domain/recommendation-state-machine";

export async function submitToAnalyst(formData: FormData) {
  const profile = await requireRole(["manager"]);
  const id = String(formData.get("recommendation_id") ?? "");
  const currentStatus = String(formData.get("current_status") ?? "manager_review");
  const comment = String(formData.get("manager_comment") ?? "").trim();

  if (comment) {
    redirect(`/manager/recommendations/${id}?error=manager_comment_must_be_empty`);
  }

  const validation = canTransition({
    currentStatus: currentStatus as never,
    nextStatus: "on_review",
    role: actingRoleForManager(profile.roles),
  });
  if (!validation.ok) throw new Error(validation.message);

  const existing = await db.recommendation.findUnique({
    where: { id },
    select: { auditFolderId: true, status: true },
  });
  if (!existing) {
    redirect("/manager?error=recommendation_not_found");
  }
  if (await isAuditFolderArchivedById(existing.auditFolderId)) {
    redirect(`/manager/recommendations/${id}?error=folder_archived`);
  }

  await db.recommendation.update({
    where: { id },
    data: { status: "on_review", managerComment: null },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "manager",
    action: "recommendation.submitted_analyst",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: existing.auditFolderId,
    summary: `Передано аналітику (${statusLabelUk(currentStatus)} → ${statusLabelUk("on_review")})`,
    difference: { from: currentStatus, to: "on_review" },
  });

  revalidatePath("/manager");
  revalidatePath(`/manager/recommendations/${id}`);
  revalidatePath("/analyst");
  redirect("/manager");
}

export async function sendToRevision(formData: FormData) {
  const profile = await requireRole(["manager"]);
  const id = String(formData.get("recommendation_id") ?? "");
  const comment = String(formData.get("manager_comment") ?? "").trim();
  const currentStatus = String(formData.get("current_status") ?? "manager_review");

  const validation = canTransition({
    currentStatus: currentStatus as never,
    nextStatus: "revision",
    role: actingRoleForManager(profile.roles),
    managerComment: comment,
  });
  if (!validation.ok) {
    redirect(`/manager/recommendations/${id}?error=manager_comment_required`);
  }

  const existing = await db.recommendation.findUnique({
    where: { id },
    select: { auditFolderId: true },
  });
  if (!existing) {
    redirect("/manager?error=recommendation_not_found");
  }
  if (await isAuditFolderArchivedById(existing.auditFolderId)) {
    redirect(`/manager/recommendations/${id}?error=folder_archived`);
  }

  await db.recommendation.update({
    where: { id },
    data: { status: "revision", managerComment: comment, analystComment: null },
  });

  await writeAuditLog({
    actor: profile,
    actorRole: "manager",
    action: "recommendation.revision",
    entityType: "recommendation",
    entityId: id,
    recommendationId: id,
    auditFolderId: existing.auditFolderId,
    summary: `Повернено на доопрацювання керівником (${statusLabelUk(currentStatus)} → ${statusLabelUk("revision")})`,
    difference: { from: currentStatus, to: "revision", comment },
  });

  revalidatePath("/manager");
  revalidatePath(`/manager/recommendations/${id}`);
  revalidatePath("/ssp");
  redirect("/manager");
}
