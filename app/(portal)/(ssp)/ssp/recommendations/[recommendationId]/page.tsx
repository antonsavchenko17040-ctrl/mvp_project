import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { SspRecommendationEditForm } from "@/components/ssp/ssp-recommendation-edit-form";
import { SspRecommendationReadonlyFields } from "@/components/ssp/ssp-recommendation-readonly-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sspRecommendationByIdWhere } from "@/lib/ssp/recommendation-access";
import { formatSspStoredDate } from "@/lib/ssp/recommendation-supplements";
import { sspWorkspaceStatusLabel } from "@/lib/ssp/ssp-status-label";

import { saveSspDraft, submitForReview } from "../../actions";

function InactiveReadBox({ id, text }: { id: string; text: string }) {
  return (
    <Textarea
      id={id}
      readOnly
      defaultValue={text}
      tabIndex={-1}
      className="min-h-[120px] cursor-default resize-none border border-input bg-neutral-200/80 text-base leading-relaxed text-neutral-950 selection:bg-muted"
    />
  );
}

function InactiveReadLine({ id, value }: { id: string; value: string }) {
  return (
    <div
      id={id}
      className="flex min-h-11 cursor-default items-center rounded-md border border-input bg-neutral-200/80 px-3 text-base text-neutral-950"
    >
      {value || "—"}
    </div>
  );
}

function CommentReadBox({ id, text }: { id: string; text: string }) {
  return (
    <Textarea
      id={id}
      readOnly
      defaultValue={text}
      tabIndex={-1}
      className="min-h-[120px] cursor-default resize-none border border-[#e8d773]/70 bg-[#f7efb5] text-base leading-relaxed text-neutral-950 selection:bg-[#e8d773]/40"
    />
  );
}

function CommentReadLine({ id, value }: { id: string; value: string }) {
  return (
    <div
      id={id}
      className="flex min-h-11 cursor-default items-center rounded-md border border-[#e8d773]/70 bg-[#f7efb5] px-3 text-base text-neutral-950"
    >
      {value || "—"}
    </div>
  );
}

const errorMessages: Record<string, string> = {
  recommendation_not_found: "Рекомендацію не знайдено або доступ до неї відсутній.",
  change_reason_required: "Вкажіть причину внесення змін.",
  supplement_empty: "Заповніть нове значення або доповнення.",
  supplement_unchanged: "Нове значення збігається з поточним — змін не внесено.",
  invalid_change_date: "Некоректна дата внесення змін.",
  invalid_field: "Невідоме поле для доповнення.",
  invalid_progress_report: "Оберіть дійсний стан впровадження.",
  invalid_implementation_date: "Некоректна фактична дата впровадження.",
  folder_archived: "Папку архівовано. Зміни недоступні.",
};

export default async function SspRecommendationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ recommendationId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const profile = await requireRole(["ssp"]);
  const { recommendationId } = await params;
  const query = await searchParams;

  const recommendation = await db.recommendation.findFirst({
    where: await sspRecommendationByIdWhere(recommendationId, profile.id),
    include: {
      auditFolder: { select: { title: true, archivedAt: true } },
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

  const deadlineLabel = recommendation.deadline.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const metaLine = `Оновлено: ${recommendation.updatedAt.toLocaleString("uk-UA")}`;
  const analystText = recommendation.analystComment?.trim() ?? "";
  const managerText = recommendation.managerComment?.trim() ?? "";
  const folderArchived = Boolean(recommendation.auditFolder.archivedAt);
  const sspCanFillForm =
    !folderArchived &&
    (recommendation.status === "in_progress" ||
      recommendation.status === "revision" ||
      recommendation.status === "ssp_draft");
  const redirectPath = `/ssp/recommendations/${recommendation.id}`;
  const supplements = recommendation.fieldSupplements;
  const today = formatSspStoredDate(new Date());

  const errorKey = query.error ?? "";
  const errorText = errorKey && errorMessages[errorKey] ? errorMessages[errorKey] : null;
  const successText = query.ok === "supplemented" ? "Доповнення збережено." : null;

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href="/ssp"
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-foreground transition-colors hover:bg-muted sm:gap-2.5 sm:px-2.5 sm:pr-4"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 text-left text-sm font-medium sm:text-base">
            <span className="block">Назад до списку рекомендацій</span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:text-sm">
              Папка звіту: «{recommendation.auditFolder.title}»
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
              label={sspWorkspaceStatusLabel({
                status: recommendation.status,
                analystComment: recommendation.analystComment,
                managerComment: recommendation.managerComment,
              })}
              className="h-auto min-h-7 shrink-0 px-3 py-1 text-sm font-semibold sm:min-h-8 sm:text-base"
            />
          </RecommendationDetailHeaderMeta>
        }
      />

      <Card className="border border-black/20 shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          {errorText ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
              {errorText}
            </p>
          ) : null}
          {successText ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-base text-emerald-900">
              {successText}
            </p>
          ) : null}

          {recommendation.status !== "in_progress" && recommendation.status !== "ssp_draft" ? (
            <>
              <RecommendationFieldBlock label="Коментар керівника" htmlFor="manager_comment">
                {managerText ? (
                  <CommentReadBox id="manager_comment" text={managerText} />
                ) : (
                  <CommentReadLine id="manager_comment" value="—" />
                )}
              </RecommendationFieldBlock>
              <RecommendationFieldBlock label="Коментар аналітика" htmlFor="analyst_comment">
                {analystText ? (
                  <CommentReadBox id="analyst_comment" text={analystText} />
                ) : (
                  <CommentReadLine id="analyst_comment" value="—" />
                )}
              </RecommendationFieldBlock>
            </>
          ) : null}

          <RecommendationFieldBlock label="Елемент ВК" htmlFor="vk_element">
            <InactiveReadLine id="vk_element" value={recommendation.vkElement} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Значущість спостереження" htmlFor="observation_significance">
            <InactiveReadLine id="observation_significance" value={recommendation.observationSignificance} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Недоліки, проблеми та порушення (точки зростання)" htmlFor="deficiency">
            <InactiveReadBox id="deficiency" text={recommendation.deficiency} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Надані аудиторські рекомендації" htmlFor="recommendation_text">
            <InactiveReadBox id="recommendation_text" text={recommendation.recommendationText} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Індикатор виконання рекомендацій (захід / документ)" htmlFor="execution_indicator">
            <InactiveReadBox id="execution_indicator" text={recommendation.executionIndicator} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Очікуваний результат від впровадження рекомендацій" htmlFor="expected_result">
            <InactiveReadBox id="expected_result" text={recommendation.expectedResult} />
          </RecommendationFieldBlock>

          <div className="grid gap-6 md:grid-cols-3">
            <RecommendationFieldBlock label="Відповідальний підрозділ" htmlFor="ssp_unit">
              <InactiveReadLine id="ssp_unit" value={recommendation.sspUnit} />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Термін виконання" htmlFor="deadline">
              <InactiveReadLine id="deadline" value={deadlineLabel} />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Строк інформування" htmlFor="informing_deadline">
              <InactiveReadLine
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

          {sspCanFillForm ? (
            <SspRecommendationEditForm
              recommendationId={recommendation.id}
              currentStatus={recommendation.status}
              redirectPath={redirectPath}
              defaultChangeDate={today}
              supplements={supplements}
              progressReport={recommendation.progressReport}
              measuresDescription={recommendation.measuresDescription}
              actualImplementationDate={formatSspStoredDate(recommendation.actualImplementationDate) || null}
              expectedAchievement={recommendation.expectedAchievement}
              supportingDocuments={recommendation.supportingDocuments}
              sspNotes={recommendation.sspNotes}
              saveSspDraft={saveSspDraft}
              submitForReview={submitForReview}
            />
          ) : (
            <div className="space-y-6">
              {folderArchived ? (
                <p className="rounded-md border border-slate-300 bg-slate-50 p-3 text-base text-slate-800">
                  Папка архівована — зміни та доповнення недоступні. Доступний лише перегляд.
                </p>
              ) : recommendation.status === "manager_review" || recommendation.status === "on_review" ? (
                <p className="rounded-md border border-orange-200/90 bg-orange-50/95 p-3 text-base leading-relaxed text-orange-950/85">
                  {recommendation.status === "manager_review"
                    ? "Рекомендацію передано на верифікацію керівнику. Основне редагування недоступне — можна лише доповнювати поля відповідального."
                    : "Рекомендацію передано на верифікацію аналітику. Основне редагування недоступне — можна лише доповнювати поля відповідального."}
                </p>
              ) : recommendation.status === "published" ? (
                <p className="rounded-md border border-emerald-200/90 bg-emerald-50/95 p-3 text-base leading-relaxed text-emerald-950/85">
                  Рекомендацію виконано. За потреби можна доповнити поля відповідального.
                </p>
              ) : (
                <p className="rounded-md border border-border bg-muted/25 p-3 text-base text-muted-foreground">
                  У цьому статусі доступні лише доповнення до полів відповідального.
                </p>
              )}
              <SspRecommendationReadonlyFields
                recommendationId={recommendation.id}
                redirectPath={redirectPath}
                defaultChangeDate={today}
                supplements={supplements}
                progressReport={recommendation.progressReport}
                expectedAchievement={recommendation.expectedAchievement}
                supportingDocuments={recommendation.supportingDocuments}
                measuresDescription={recommendation.measuresDescription}
                sspNotes={recommendation.sspNotes}
                actualImplementationDate={recommendation.actualImplementationDate}
                allowSupplements={!folderArchived}
              />
              <Button variant="outline" asChild>
                <Link href="/ssp">Назад до списку</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
