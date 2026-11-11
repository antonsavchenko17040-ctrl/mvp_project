import { notFound } from "next/navigation";

import { AnalystVerificationForm } from "@/components/analyst/analyst-verification-form";
import { RecommendationDesignPage } from "@/components/recommendation-design/recommendation-design-page";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listFolderRecommendationNav } from "@/lib/recommendation-design/siblings";
import { daysUntil, designContentFromRecommendation } from "@/lib/recommendation-design/view-model";
import type { RecommendationStatus } from "@/lib/types";
import { verificationWorkspaceStatusLabel } from "@/lib/verification-workspace-status-label";

import { sendToRevision, verifyRecommendation } from "../../actions";

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AnalystRecommendationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ recommendationId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["analyst"]);
  const { recommendationId } = await params;
  const { error } = await searchParams;

  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      status: "on_review",
    },
    include: {
      auditFolder: { select: { id: true, title: true, year: true } },
      fieldSupplements: {
        orderBy: { changeDate: "asc" },
        select: {
          id: true,
          fieldKey: true,
          content: true,
          previousContent: true,
          changeReason: true,
          changeDate: true,
          createdAt: true,
        },
      },
    },
  });
  if (!recommendation) notFound();

  const supplements = recommendation.fieldSupplements;
  const analystText = recommendation.analystComment?.trim() ?? "";
  const design = designContentFromRecommendation(recommendation, supplements);
  const siblings = await listFolderRecommendationNav({
    folderId: recommendation.auditFolder.id,
    currentId: recommendation.id,
    href: (itemId) => `/analyst/recommendations/${itemId}`,
    where: { status: "on_review" },
    label: (status) => verificationWorkspaceStatusLabel(status as RecommendationStatus),
  });
  return (
    <RecommendationDesignPage
      backHref="/analyst"
      backLabel="До списку"
      folderTitle={recommendation.auditFolder.title}
      folderYear={recommendation.auditFolder.year}
      sequenceNumber={recommendation.sequenceNumber}
      auditTitle={recommendation.auditFolder.title}
      status={recommendation.status}
      statusLabelText={verificationWorkspaceStatusLabel(recommendation.status)}
      significance={recommendation.observationSignificance}
      sspUnit={recommendation.sspUnit}
      vkElement={recommendation.vkElement}
      deadline={formatDate(recommendation.deadline)}
      informingDeadline={formatDate(recommendation.informingDeadline)}
      daysLeft={daysUntil(recommendation.deadline)}
      deadlineWas={design.deadlineHistory.entries.at(-1)?.from ?? null}
      deadlineChanges={design.deadlineHistory.count}
      informingChanges={design.informingHistory.count}
      deadlineHistory={design.deadlineHistory}
      informingHistory={design.informingHistory}
      fields={design.fields}
      showResults
      progress={recommendation.progressReport ?? ""}
      actualDate={formatDate(recommendation.actualImplementationDate)}
      measures={recommendation.measuresDescription ?? ""}
      expectedAchievement={recommendation.expectedAchievement ?? ""}
      documents={recommendation.supportingDocuments ?? ""}
      notes={recommendation.sspNotes ?? ""}
      siblings={siblings}
      changeBanner={design.changeBanner}
      alerts={
        <>
          {error === "analyst_comment_required" ? (
            <p className="rounded-xl border border-[#aa0600] bg-[#ffdfdf] px-4 py-3 text-[#aa0600]">
              Для повернення на доопрацювання обов’язковий коментар аналітика (не менше 5 символів).
            </p>
          ) : null}
          {error === "analyst_comment_must_be_empty" ? (
            <p className="rounded-xl border border-[#aa0600] bg-[#ffdfdf] px-4 py-3 text-[#aa0600]">
              Для верифікації поле «Коментар аналітика» має бути порожнім.
            </p>
          ) : null}
        </>
      }
      work={
        <AnalystVerificationForm
          recommendationId={recommendation.id}
          currentStatus={recommendation.status}
          initialComment={analystText}
          sendToRevision={sendToRevision}
          verifyRecommendation={verifyRecommendation}
        />
      }
    />
  );
}
