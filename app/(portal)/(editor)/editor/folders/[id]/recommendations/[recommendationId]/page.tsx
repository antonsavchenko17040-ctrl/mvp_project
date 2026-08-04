import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import { EditorSupplementableField } from "@/components/editor/editor-supplementable-field";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getDepartments } from "@/lib/admin/departments-store";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { editorWorkspaceStatusLabel } from "@/lib/editor/editor-workspace-status-label";

function ReadBox({ id, text }: { id: string; text: string }) {
  return (
    <Textarea
      id={id}
      readOnly
      defaultValue={text}
      tabIndex={-1}
      className="min-h-[120px] cursor-default resize-none whitespace-pre-wrap border-input bg-muted/20 text-base leading-normal text-foreground"
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

const errorMessages: Record<string, string> = {
  recommendation_not_found: "Рекомендацію не знайдено або доступ до неї відсутній.",
  change_reason_required: "Вкажіть причину внесення змін.",
  supplement_empty: "Заповніть нове значення або доповнення.",
  supplement_unchanged: "Нове значення збігається з поточним — змін не внесено.",
  invalid_department: "Оберіть дійсний активний підрозділ зі списку.",
  invalid_deadline: "Некоректний термін виконання.",
  invalid_informing_deadline: "Некоректний строк інформування.",
  invalid_change_date: "Некоректна дата внесення змін.",
  invalid_field: "Невідоме поле для доповнення.",
  cannot_supplement_ssp_draft: "Доповнення недоступне для чернетки відповідального.",
  folder_archived: "Папку архівовано. Зміни недоступні.",
};

export default async function EditorRecommendationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recommendationId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const profile = await requireRole(["editor"]);
  const { id: folderId, recommendationId } = await params;
  const query = await searchParams;

  const folder = await db.auditFolder.findFirst({
    where: { id: folderId, createdById: profile.id },
    select: { id: true, title: true, archivedAt: true },
  });
  if (!folder) notFound();

  const recommendation = await db.recommendation.findFirst({
    where: {
      id: recommendationId,
      auditFolderId: folder.id,
    },
    include: {
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

  if (recommendation.status === "ssp_draft") {
    redirect(`/editor/folders/${folder.id}`);
  }

  const folderArchived = Boolean(folder.archivedAt);

  const toDateInputValue = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatDay = (value: Date) =>
    value.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });

  const metaLine = `Оновлено: ${recommendation.updatedAt.toLocaleString("uk-UA")}`;
  const redirectPath = `/editor/folders/${folder.id}/recommendations/${recommendation.id}`;
  const activeDepartments = (await getDepartments()).filter((d) => d.isActive);
  const supplements = recommendation.fieldSupplements;
  const today = toDateInputValue(new Date());

  const errorKey = query.error ?? "";
  const errorText = errorKey && errorMessages[errorKey] ? errorMessages[errorKey] : null;
  const successText = query.ok === "supplemented" ? "Доповнення збережено." : null;

  const fieldProps = {
    recommendationId: recommendation.id,
    redirectPath,
    supplements,
    departments: activeDepartments,
    defaultChangeDate: today,
    mergeAppendSupplements: true,
    allowSupplements: !folderArchived,
  };

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href={`/editor/folders/${folder.id}`}
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
            <RecommendationStatusBadge
              status={recommendation.status}
              label={editorWorkspaceStatusLabel(recommendation.status)}
              className="shrink-0 border border-black/10 px-3 py-1.5 text-base font-semibold sm:text-lg"
            />
          </RecommendationDetailHeaderMeta>
        }
      />

      <Card className="border border-black/20 shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          {folderArchived ? (
            <p className="rounded-md border border-slate-300 bg-slate-50 p-3 text-base text-slate-800">
              Папка архівована — зміни рекомендації недоступні.
            </p>
          ) : null}
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

          <EditorSupplementableField
            {...fieldProps}
            fieldKey="vkElement"
            label="Елемент ВК"
            htmlFor="vk_element"
            currentValueHint={recommendation.vkElement}
          >
            <EditorAppendFieldDisplay
              id="vk_element"
              fieldKey="vkElement"
              currentValue={recommendation.vkElement}
              supplements={supplements}
            />
          </EditorSupplementableField>

          <EditorSupplementableField
            {...fieldProps}
            fieldKey="deficiency"
            label="Недоліки, проблеми та порушення (точки зростання)"
            htmlFor="deficiency"
          >
            <EditorAppendFieldDisplay
              id="deficiency"
              fieldKey="deficiency"
              currentValue={recommendation.deficiency}
              supplements={supplements}
            />
          </EditorSupplementableField>

          <EditorSupplementableField
            {...fieldProps}
            fieldKey="observationSignificance"
            label="Значущість спостереження"
            htmlFor="observation_significance"
            currentValueHint={recommendation.observationSignificance}
          >
            <EditorAppendFieldDisplay
              id="observation_significance"
              fieldKey="observationSignificance"
              currentValue={recommendation.observationSignificance}
              supplements={supplements}
            />
          </EditorSupplementableField>

          <EditorSupplementableField
            {...fieldProps}
            fieldKey="recommendationText"
            label="Надані аудиторські рекомендації"
            htmlFor="recommendation_text"
          >
            <EditorAppendFieldDisplay
              id="recommendation_text"
              fieldKey="recommendationText"
              currentValue={recommendation.recommendationText}
              supplements={supplements}
            />
          </EditorSupplementableField>

          <EditorSupplementableField
            {...fieldProps}
            fieldKey="executionIndicator"
            label="Індикатор виконання рекомендацій (захід / документ)"
            htmlFor="execution_indicator"
          >
            <EditorAppendFieldDisplay
              id="execution_indicator"
              fieldKey="executionIndicator"
              currentValue={recommendation.executionIndicator}
              supplements={supplements}
            />
          </EditorSupplementableField>

          <EditorSupplementableField
            {...fieldProps}
            fieldKey="expectedResult"
            label="Очікуваний результат від впровадження рекомендацій"
            htmlFor="expected_result"
          >
            <EditorAppendFieldDisplay
              id="expected_result"
              fieldKey="expectedResult"
              currentValue={recommendation.expectedResult}
              supplements={supplements}
            />
          </EditorSupplementableField>

          <div className="grid gap-6 md:grid-cols-3">
            <EditorSupplementableField
              {...fieldProps}
              fieldKey="sspUnit"
              label="Відповідальний підрозділ"
              htmlFor="ssp_unit"
              currentValueHint={recommendation.sspUnit}
            >
              <EditorAppendFieldDisplay
                id="ssp_unit"
                fieldKey="sspUnit"
                currentValue={recommendation.sspUnit}
                supplements={supplements}
              />
            </EditorSupplementableField>

            <EditorSupplementableField
              {...fieldProps}
              fieldKey="deadline"
              label="Термін виконання"
              htmlFor="deadline"
              currentValueHint={formatDay(recommendation.deadline)}
            >
              <EditorAppendFieldDisplay
                id="deadline"
                fieldKey="deadline"
                currentValue={formatDay(recommendation.deadline)}
                supplements={supplements}
              />
            </EditorSupplementableField>

            <EditorSupplementableField
              {...fieldProps}
              fieldKey="informingDeadline"
              label="Строк інформування"
              htmlFor="informing_deadline"
              currentValueHint={
                recommendation.informingDeadline ? formatDay(recommendation.informingDeadline) : "—"
              }
            >
              <EditorAppendFieldDisplay
                id="informing_deadline"
                fieldKey="informingDeadline"
                currentValue={
                  recommendation.informingDeadline ? formatDay(recommendation.informingDeadline) : "—"
                }
                supplements={supplements}
              />
            </EditorSupplementableField>
          </div>

          <EditorSupplementableField
            {...fieldProps}
            fieldKey="changeReason"
            label="Причина зміни"
            htmlFor="change_reason_current"
            currentValueHint={recommendation.changeReason ?? undefined}
          >
            <EditorAppendFieldDisplay
              id="change_reason_current"
              fieldKey="changeReason"
              currentValue={recommendation.changeReason ?? ""}
              supplements={supplements}
            />
          </EditorSupplementableField>

          {recommendation.status !== "draft" ? (
            <>
              <RecommendationFieldBlock label="Стан впровадження рекомендацій" htmlFor="progress_report">
                <ReadBox id="progress_report" text={recommendation.progressReport ?? ""} />
              </RecommendationFieldBlock>

              <RecommendationFieldBlock label="Фактична дата впровадження" htmlFor="actual_implementation_date">
                <ReadLine
                  id="actual_implementation_date"
                  value={
                    recommendation.actualImplementationDate
                      ? formatDay(recommendation.actualImplementationDate)
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
            </>
          ) : null}

          {recommendation.managerComment ? (
            <RecommendationFieldBlock label="Коментар керівника" htmlFor="manager_comment">
              <ReadBox id="manager_comment" text={recommendation.managerComment} />
            </RecommendationFieldBlock>
          ) : null}

          {recommendation.analystComment ? (
            <RecommendationFieldBlock label="Коментар аналітика" htmlFor="analyst_comment">
              <ReadBox id="analyst_comment" text={recommendation.analystComment} />
            </RecommendationFieldBlock>
          ) : null}

          {recommendation.status === "draft" && !folderArchived ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={`/editor/folders/${folder.id}/recommendations/${recommendation.id}/edit`}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#3a6fb8] px-4 text-sm font-medium text-white hover:bg-[#2f5e9a]"
              >
                Редагувати чернетку
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
