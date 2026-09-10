import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { AnalystVerificationForm } from "@/components/analyst/analyst-verification-form";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { SupplementFieldKey } from "@/lib/editor/recommendation-supplements";
import type { SspSupplementFieldKey } from "@/lib/ssp/recommendation-supplements";
import { verificationWorkspaceStatusLabel } from "@/lib/verification-workspace-status-label";

import { sendToRevision, verifyRecommendation } from "../../actions";

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

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type SupplementRow = {
  id: string;
  fieldKey: string;
  content: string;
  previousContent: string | null;
  changeReason: string;
  changeDate: Date;
  createdAt: Date;
};

function FieldWithSupplements({
  fieldKey,
  supplements,
  label,
  htmlFor,
  currentValue,
}: {
  fieldKey: SupplementFieldKey | SspSupplementFieldKey;
  supplements: SupplementRow[];
  label: string;
  htmlFor: string;
  currentValue: string;
}) {
  return (
    <RecommendationFieldBlock label={label} htmlFor={htmlFor}>
      <EditorAppendFieldDisplay
        id={htmlFor}
        fieldKey={fieldKey}
        currentValue={currentValue}
        supplements={supplements}
      />
    </RecommendationFieldBlock>
  );
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
      status: { in: ["on_review", "revision"] },
    },
    include: {
      auditFolder: { select: { title: true, year: true } },
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
  const metaLine = `Оновлено: ${recommendation.updatedAt.toLocaleString("uk-UA")}`;
  const analystText = recommendation.analystComment?.trim() ?? "";
  const canVerify = recommendation.status === "on_review";

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href="/analyst"
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
          {error === "analyst_comment_required" ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
              Для повернення на доопрацювання обов’язковий коментар аналітика (не менше 5 символів).
            </p>
          ) : null}
          {error === "analyst_comment_must_be_empty" ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
              Для верифікації поле «Коментар аналітика» має бути порожнім.
            </p>
          ) : null}
          <FieldWithSupplements
            fieldKey="vkElement"
            supplements={supplements}
            label="Елемент ВК"
            htmlFor="vk_element"
            currentValue={recommendation.vkElement}
          />

          <FieldWithSupplements
            fieldKey="deficiency"
            supplements={supplements}
            label="Недоліки, проблеми та порушення (точки зростання)"
            htmlFor="deficiency"
            currentValue={recommendation.deficiency}
          />

          <FieldWithSupplements
            fieldKey="observationSignificance"
            supplements={supplements}
            label="Значущість спостереження"
            htmlFor="observation_significance"
            currentValue={recommendation.observationSignificance}
          />

          <FieldWithSupplements
            fieldKey="recommendationText"
            supplements={supplements}
            label="Надані аудиторські рекомендації"
            htmlFor="recommendation_text"
            currentValue={recommendation.recommendationText}
          />

          <FieldWithSupplements
            fieldKey="executionIndicator"
            supplements={supplements}
            label="Індикатор виконання рекомендацій (захід / документ)"
            htmlFor="execution_indicator"
            currentValue={recommendation.executionIndicator}
          />

          <FieldWithSupplements
            fieldKey="expectedResult"
            supplements={supplements}
            label="Очікуваний результат від впровадження рекомендацій"
            htmlFor="expected_result"
            currentValue={recommendation.expectedResult}
          />

          <div className="grid gap-6 md:grid-cols-3">
            <FieldWithSupplements
              fieldKey="sspUnit"
              supplements={supplements}
              label="Відповідальний підрозділ"
              htmlFor="ssp_unit"
              currentValue={recommendation.sspUnit}
            />

            <FieldWithSupplements
              fieldKey="deadline"
              supplements={supplements}
              label="Термін виконання"
              htmlFor="deadline"
              currentValue={formatDate(recommendation.deadline)}
            />

            <FieldWithSupplements
              fieldKey="informingDeadline"
              supplements={supplements}
              label="Строк інформування"
              htmlFor="informing_deadline"
              currentValue={formatDate(recommendation.informingDeadline)}
            />
          </div>

          {supplements.some((item) => item.fieldKey === "changeReason") ||
          (recommendation.changeReason ?? "").trim() ? (
            <FieldWithSupplements
              fieldKey="changeReason"
              supplements={supplements}
              label="Причина зміни"
              htmlFor="change_reason"
              currentValue={recommendation.changeReason ?? ""}
            />
          ) : null}

          <FieldWithSupplements
            fieldKey="progressReport"
            supplements={supplements}
            label="Стан впровадження рекомендацій"
            htmlFor="progress_report"
            currentValue={recommendation.progressReport ?? ""}
          />

          <FieldWithSupplements
            fieldKey="actualImplementationDate"
            supplements={supplements}
            label="Фактична дата впровадження"
            htmlFor="actual_implementation_date"
            currentValue={formatDate(recommendation.actualImplementationDate)}
          />

          <FieldWithSupplements
            fieldKey="measuresDescription"
            supplements={supplements}
            label="Заходи з впровадження рекомендацій"
            htmlFor="measures"
            currentValue={recommendation.measuresDescription ?? ""}
          />

          <FieldWithSupplements
            fieldKey="expectedAchievement"
            supplements={supplements}
            label="Досягнення очікуваного"
            htmlFor="expected_achievement"
            currentValue={recommendation.expectedAchievement ?? ""}
          />

          <FieldWithSupplements
            fieldKey="supportingDocuments"
            supplements={supplements}
            label="Підтверджуючі документи"
            htmlFor="supporting_documents"
            currentValue={recommendation.supportingDocuments ?? ""}
          />

          <FieldWithSupplements
            fieldKey="sspNotes"
            supplements={supplements}
            label="Примітки"
            htmlFor="ssp_notes"
            currentValue={recommendation.sspNotes ?? ""}
          />

          {!canVerify && analystText ? (
            <RecommendationFieldBlock label="Коментар аналітика" htmlFor={`comment-${recommendation.id}`}>
              <ReadBox id={`comment-${recommendation.id}`} text={analystText} />
            </RecommendationFieldBlock>
          ) : null}

          {canVerify ? (
            <AnalystVerificationForm
              recommendationId={recommendation.id}
              currentStatus={recommendation.status}
              initialComment={analystText}
              sendToRevision={sendToRevision}
              verifyRecommendation={verifyRecommendation}
            />
          ) : (
            <div className="rounded-md border border-border bg-muted/25 p-4 text-base text-muted-foreground">
              Рекомендація на доопрацюванні у відповідального ССП. Після повторної відправки вона спочатку потрапить
              до керівника, а потім знову з’явиться тут для верифікації аналітиком.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
