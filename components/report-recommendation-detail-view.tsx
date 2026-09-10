import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationExecutionStatusBadge } from "@/components/recommendation-execution-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  parseDashboardExecutionListFilter,
  type DashboardExecutionListFilterKey,
} from "@/lib/dashboard/execution-list-filters";
import type { SupplementFieldKey } from "@/lib/editor/recommendation-supplements";
import type { SspSupplementFieldKey } from "@/lib/ssp/recommendation-supplements";
import {
  executionStatusSourceText,
  resolveExecutionStatusLabel,
} from "@/lib/recommendation-execution-status";
import { isExecutionPubliclyVisible } from "@/lib/public-recommendation-visibility";

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

          <RecommendationFieldBlock label="Стан виконання" htmlFor="execution_status">
            <ReadLine id="execution_status" value={executionStatusLabel} />
          </RecommendationFieldBlock>

          {executionVisible ? (
            <>
              <FieldWithSupplements
                fieldKey="progressReport"
                supplements={supplements}
                label="Стан впровадження рекомендацій"
                htmlFor="progress_report"
                currentValue={recommendation.progressReport ?? ""}
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
                fieldKey="measuresDescription"
                supplements={supplements}
                label="Заходи з впровадження рекомендацій"
                htmlFor="measures"
                currentValue={recommendation.measuresDescription ?? ""}
              />

              <FieldWithSupplements
                fieldKey="sspNotes"
                supplements={supplements}
                label="Примітки"
                htmlFor="ssp_notes"
                currentValue={recommendation.sspNotes ?? ""}
              />

              <FieldWithSupplements
                fieldKey="actualImplementationDate"
                supplements={supplements}
                label="Фактична дата впровадження"
                htmlFor="actual_date"
                currentValue={formatDate(recommendation.actualImplementationDate)}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
