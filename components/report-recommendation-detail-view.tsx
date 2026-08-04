import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationFieldSupplementHistory } from "@/components/editor/recommendation-field-supplement-history";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationExecutionStatusBadge } from "@/components/recommendation-execution-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import {
  parseDashboardExecutionListFilter,
  type DashboardExecutionListFilterKey,
} from "@/lib/dashboard/execution-list-filters";
import type { SupplementFieldKey } from "@/lib/editor/recommendation-supplements";
import {
  executionStatusSourceText,
  resolveExecutionStatusLabel,
} from "@/lib/recommendation-execution-status";
import { isExecutionPubliclyVisible } from "@/lib/public-recommendation-visibility";

function ReadBox({ id, text }: { id: string; text: string }) {
  const value = text.trim() ? text : "—";
  return (
    <Textarea
      id={id}
      readOnly
      defaultValue={value}
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

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function FieldWithSupplements({
  fieldKey,
  supplements,
  label,
  htmlFor,
  children,
}: {
  fieldKey: SupplementFieldKey;
  supplements: {
    id: string;
    fieldKey: string;
    content: string;
    previousContent: string | null;
    changeReason: string;
    changeDate: Date;
    createdAt: Date;
  }[];
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0">
      <RecommendationFieldBlock label={label} htmlFor={htmlFor}>
        {children}
      </RecommendationFieldBlock>
      <RecommendationFieldSupplementHistory fieldKey={fieldKey} items={supplements} />
    </div>
  );
}

type ReportRecommendationDetailViewProps = {
  folderId: string;
  recommendationId: string;
  folderHref: string;
  searchParams?: Promise<{ execution?: string }>;
};

export async function ReportRecommendationDetailView({
  folderId,
  recommendationId,
  folderHref,
  searchParams,
}: ReportRecommendationDetailViewProps) {
  const query = searchParams ? await searchParams : {};
  const executionFilter: DashboardExecutionListFilterKey = parseDashboardExecutionListFilter(query.execution);
  const folderListHref =
    executionFilter === "all" ? folderHref : `${folderHref}?execution=${executionFilter}`;

  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      auditFolderId: folderId,
      isActive: true,
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

  if (!recommendation) {
    notFound();
  }

  const folder = recommendation.auditFolder;
  const supplements = recommendation.fieldSupplements;
  const metaLine = `Оновлено: ${recommendation.updatedAt.toLocaleString("uk-UA")}`;
  const executionVisible = isExecutionPubliclyVisible(recommendation.status);
  const executionStatusLabel = executionVisible
    ? resolveExecutionStatusLabel(
        executionStatusSourceText(recommendation.progressReport, recommendation.executionIndicator),
      )
    : "—";

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href={folderListHref}
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-foreground transition-colors hover:bg-muted sm:gap-2.5 sm:px-2.5 sm:pr-4"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-left text-sm font-medium sm:text-base">Назад до папки «{folder.title}»</span>
        </Link>
      </div>

      <RecommendationDetailHeader
        title="Рекомендація"
        updatedAtLabel={metaLine}
        meta={
          <RecommendationDetailHeaderMeta sequenceNumber={recommendation.sequenceNumber}>
            {executionVisible ? (
              <RecommendationExecutionStatusBadge
                progressReport={recommendation.progressReport}
                executionIndicator={recommendation.executionIndicator}
                className="shrink-0 border border-black/10 px-3 py-1.5 text-base font-semibold sm:text-lg"
              />
            ) : (
              <Badge className="shrink-0 border border-black/10 bg-muted px-3 py-1.5 text-base font-semibold text-muted-foreground sm:text-lg">
                —
              </Badge>
            )}
          </RecommendationDetailHeaderMeta>
        }
      />

      <Card className="border border-black/20 shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          <RecommendationFieldBlock label="Назва аудиту" htmlFor="audit_title">
            <ReadLine id="audit_title" value={folder.title} />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Рік аудиту" htmlFor="audit_year">
            <ReadLine id="audit_year" value={String(folder.year)} />
          </RecommendationFieldBlock>

          <FieldWithSupplements
            fieldKey="vkElement"
            supplements={supplements}
            label="Елемент ВК"
            htmlFor="vk_element"
          >
            <ReadLine id="vk_element" value={recommendation.vkElement} />
          </FieldWithSupplements>

          <FieldWithSupplements
            fieldKey="deficiency"
            supplements={supplements}
            label="Недоліки, проблеми та порушення (точки зростання)"
            htmlFor="deficiency"
          >
            <ReadBox id="deficiency" text={recommendation.deficiency} />
          </FieldWithSupplements>

          <FieldWithSupplements
            fieldKey="observationSignificance"
            supplements={supplements}
            label="Значущість спостереження"
            htmlFor="observation_significance"
          >
            <ReadLine id="observation_significance" value={recommendation.observationSignificance} />
          </FieldWithSupplements>

          <FieldWithSupplements
            fieldKey="recommendationText"
            supplements={supplements}
            label="Надані аудиторські рекомендації"
            htmlFor="recommendation_text"
          >
            <ReadBox id="recommendation_text" text={recommendation.recommendationText} />
          </FieldWithSupplements>

          <FieldWithSupplements
            fieldKey="executionIndicator"
            supplements={supplements}
            label="Індикатор виконання рекомендацій (захід / документ)"
            htmlFor="execution_indicator"
          >
            <ReadBox id="execution_indicator" text={recommendation.executionIndicator} />
          </FieldWithSupplements>

          <FieldWithSupplements
            fieldKey="expectedResult"
            supplements={supplements}
            label="Очікуваний результат від впровадження рекомендацій"
            htmlFor="expected_result"
          >
            <ReadBox id="expected_result" text={recommendation.expectedResult} />
          </FieldWithSupplements>

          <div className="grid gap-6 md:grid-cols-3">
            <FieldWithSupplements
              fieldKey="sspUnit"
              supplements={supplements}
              label="Відповідальний підрозділ"
              htmlFor="ssp_unit"
            >
              <ReadLine id="ssp_unit" value={recommendation.sspUnit} />
            </FieldWithSupplements>

            <FieldWithSupplements
              fieldKey="deadline"
              supplements={supplements}
              label="Термін виконання"
              htmlFor="deadline"
            >
              <ReadLine id="deadline" value={formatDate(recommendation.deadline)} />
            </FieldWithSupplements>

            <FieldWithSupplements
              fieldKey="informingDeadline"
              supplements={supplements}
              label="Строк інформування"
              htmlFor="informing_deadline"
            >
              <ReadLine id="informing_deadline" value={formatDate(recommendation.informingDeadline)} />
            </FieldWithSupplements>
          </div>

          {supplements.some((item) => item.fieldKey === "changeReason") ? (
            <FieldWithSupplements
              fieldKey="changeReason"
              supplements={supplements}
              label="Причина зміни"
              htmlFor="change_reason"
            >
              <ReadBox id="change_reason" text={recommendation.changeReason ?? ""} />
            </FieldWithSupplements>
          ) : null}

          <RecommendationFieldBlock label="Стан виконання" htmlFor="execution_status">
            <ReadLine id="execution_status" value={executionStatusLabel} />
          </RecommendationFieldBlock>

          {executionVisible ? (
            <>
              {recommendation.progressReport ? (
                <RecommendationFieldBlock label="Стан впровадження рекомендацій" htmlFor="progress_report">
                  <ReadBox id="progress_report" text={recommendation.progressReport} />
                </RecommendationFieldBlock>
              ) : null}

              <RecommendationFieldBlock label="Досягнення очікуваного" htmlFor="expected_achievement">
                <ReadBox id="expected_achievement" text={recommendation.expectedAchievement ?? ""} />
              </RecommendationFieldBlock>

              <RecommendationFieldBlock label="Підтверджуючі документи" htmlFor="supporting_documents">
                <ReadBox id="supporting_documents" text={recommendation.supportingDocuments ?? ""} />
              </RecommendationFieldBlock>

              {recommendation.measuresDescription ? (
                <RecommendationFieldBlock label="Заходи з впровадження рекомендацій" htmlFor="measures">
                  <ReadBox id="measures" text={recommendation.measuresDescription} />
                </RecommendationFieldBlock>
              ) : null}

              <RecommendationFieldBlock label="Примітки" htmlFor="ssp_notes">
                <ReadBox id="ssp_notes" text={recommendation.sspNotes ?? ""} />
              </RecommendationFieldBlock>

              <RecommendationFieldBlock label="Фактична дата впровадження" htmlFor="actual_date">
                <ReadLine id="actual_date" value={formatDate(recommendation.actualImplementationDate)} />
              </RecommendationFieldBlock>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
