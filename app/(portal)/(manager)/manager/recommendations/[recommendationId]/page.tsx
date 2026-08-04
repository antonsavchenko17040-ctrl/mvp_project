import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { ManagerVerificationForm } from "@/components/manager/manager-verification-form";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { verificationWorkspaceStatusLabel } from "@/lib/verification-workspace-status-label";

import { sendToRevision, submitToAnalyst } from "../../actions";

function ReadBox({ id, text }: { id: string; text: string }) {
  return (
    <Textarea
      id={id}
      readOnly
      defaultValue={text}
      tabIndex={-1}
      className="min-h-[120px] cursor-default resize-none border-input bg-muted/20 text-base leading-relaxed text-foreground"
    />
  );
}

function ReadLine({ id, value }: { id: string; value: string }) {
  return (
    <div
      id={id}
      className="flex min-h-11 items-center rounded-md border border-input bg-muted/20 px-3 text-base text-foreground"
    >
      {value || "—"}
    </div>
  );
}

export default async function ManagerRecommendationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ recommendationId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["manager"]);
  const { recommendationId } = await params;
  const { error } = await searchParams;

  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      isActive: true,
      status: {
        in: ["manager_review", "revision", "in_progress", "on_review", "ssp_draft", "published"],
      },
    },
    include: {
      auditFolder: { select: { title: true, year: true } },
    },
  });
  if (!recommendation) notFound();

  const deadlineLabel = recommendation.deadline.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const metaLine = `Оновлено: ${recommendation.updatedAt.toLocaleString("uk-UA")}`;
  const managerText = recommendation.managerComment?.trim() ?? "";
  const canVerify = recommendation.status === "manager_review";
  const isWithSsp =
    recommendation.status === "revision" ||
    recommendation.status === "in_progress" ||
    recommendation.status === "ssp_draft" ||
    recommendation.status === "on_review" ||
    recommendation.status === "published";

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href="/manager"
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-foreground transition-colors hover:bg-muted sm:gap-2.5 sm:px-2.5 sm:pr-4"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 text-left text-sm font-medium sm:text-base">
            <span className="block">Назад до списку рекомендацій</span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:text-sm">
              Папка звіту: «{recommendation.auditFolder.title}» ({recommendation.auditFolder.year})
            </span>
          </span>
        </Link>
      </div>

      <RecommendationDetailHeader
        title="Рекомендація"
        updatedAtLabel={metaLine}
        meta={
          <RecommendationDetailHeaderMeta
            sequenceNumber={recommendation.sequenceNumber}
            reportTitle={recommendation.auditFolder.title}
          >
            <RecommendationStatusBadge
              status={recommendation.status}
              label={verificationWorkspaceStatusLabel(recommendation.status)}
              className="h-auto min-h-7 shrink-0 px-3 py-1 text-sm font-semibold sm:min-h-8 sm:text-base"
            />
          </RecommendationDetailHeaderMeta>
        }
      />

      <Card className="border border-black/20 shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          {error === "manager_comment_required" ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
              Для повернення на доопрацювання обов’язковий коментар керівника (не менше 5 символів).
            </p>
          ) : null}
          {error === "manager_comment_must_be_empty" ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
              Для передачі аналітику поле «Коментар керівника» має бути порожнім.
            </p>
          ) : null}
          <RecommendationFieldBlock label="Елемент ВК" htmlFor="vk_element">
            <ReadLine id="vk_element" value={recommendation.vkElement} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Недоліки, проблеми та порушення (точки зростання)" htmlFor="deficiency">
            <ReadBox id="deficiency" text={recommendation.deficiency} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Значущість спостереження" htmlFor="observation_significance">
            <ReadLine id="observation_significance" value={recommendation.observationSignificance} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Надані аудиторські рекомендації" htmlFor="recommendation_text">
            <ReadBox id="recommendation_text" text={recommendation.recommendationText} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Індикатор виконання рекомендацій (захід / документ)" htmlFor="execution_indicator">
            <ReadBox id="execution_indicator" text={recommendation.executionIndicator} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Очікуваний результат від впровадження рекомендацій" htmlFor="expected_result">
            <ReadBox id="expected_result" text={recommendation.expectedResult} />
          </RecommendationFieldBlock>

          <div className="grid gap-6 md:grid-cols-3">
            <RecommendationFieldBlock label="Відповідальний підрозділ" htmlFor="ssp_unit">
              <ReadLine id="ssp_unit" value={recommendation.sspUnit} />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Термін виконання" htmlFor="deadline">
              <ReadLine id="deadline" value={deadlineLabel} />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Строк інформування" htmlFor="informing_deadline">
              <ReadLine
                id="informing_deadline"
                value={
                  recommendation.informingDeadline
                    ? recommendation.informingDeadline.toLocaleDateString("uk-UA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </RecommendationFieldBlock>
          </div>

          <RecommendationFieldBlock label="Стан впровадження рекомендацій" htmlFor="progress_report">
            <ReadBox id="progress_report" text={recommendation.progressReport ?? ""} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Фактична дата впровадження" htmlFor="actual_implementation_date">
            <ReadLine
              id="actual_implementation_date"
              value={
                recommendation.actualImplementationDate
                  ? recommendation.actualImplementationDate.toLocaleDateString("uk-UA", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "—"
              }
            />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Заходи з впровадження рекомендацій" htmlFor="measures">
            <ReadBox id="measures" text={recommendation.measuresDescription ?? ""} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Досягнення очікуваного" htmlFor="expected_achievement">
            <ReadBox id="expected_achievement" text={recommendation.expectedAchievement ?? ""} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Підтверджуючі документи" htmlFor="supporting_documents">
            <ReadBox id="supporting_documents" text={recommendation.supportingDocuments ?? ""} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Примітки" htmlFor="ssp_notes">
            <ReadBox id="ssp_notes" text={recommendation.sspNotes ?? ""} />
          </RecommendationFieldBlock>

          {!canVerify && managerText ? (
            <RecommendationFieldBlock label="Коментар керівника" htmlFor={`comment-${recommendation.id}`}>
              <ReadBox id={`comment-${recommendation.id}`} text={managerText} />
            </RecommendationFieldBlock>
          ) : null}

          {canVerify ? (
            <ManagerVerificationForm
              recommendationId={recommendation.id}
              currentStatus={recommendation.status}
              initialComment={managerText}
              sendToRevision={sendToRevision}
              submitToAnalyst={submitToAnalyst}
            />
          ) : isWithSsp ? (
            <div className="rounded-md border border-border bg-muted/25 p-4 text-base text-muted-foreground">
              {recommendation.status === "revision"
                ? "Рекомендація на доопрацюванні у відповідального ССП. Після повторної відправки вона знову з’явиться у вашому списку для верифікації."
                : recommendation.status === "published"
                  ? "Рекомендацію верифіковано. Доступний перегляд; сповіщення про термін виконання надходять за потреби."
                  : "Перегляд рекомендації. Верифікація керівником доступна після надсилання на перевірку."}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
