import { notFound, redirect } from "next/navigation";

import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import { EditorSupplementableField } from "@/components/editor/editor-supplementable-field";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDesignPage } from "@/components/recommendation-design/recommendation-design-page";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getDepartments } from "@/lib/admin/departments-store";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { editorWorkspaceStatusLabel } from "@/lib/editor/editor-workspace-status-label";
import { listFolderRecommendationNav } from "@/lib/recommendation-design/siblings";
import {
  daysUntil,
  designContentFromRecommendation,
} from "@/lib/recommendation-design/view-model";
import type { RecommendationStatus } from "@/lib/types";

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
  cannot_supplement_draft: "Доповнення з історією недоступне для чернетки редактора.",
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
    select: { id: true, title: true, year: true, archivedAt: true },
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

  if (recommendation.status === "draft") {
    redirect(`/editor/folders/${folder.id}/recommendations/${recommendation.id}/edit`);
  }
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

  const redirectPath = `/editor/folders/${folder.id}/recommendations/${recommendation.id}`;
  const activeDepartments = (await getDepartments()).filter((d) => d.isActive);
  const supplements = recommendation.fieldSupplements;
  const today = toDateInputValue(new Date());

  const design = designContentFromRecommendation(recommendation, supplements);
  const siblings = await listFolderRecommendationNav({
    folderId: folder.id,
    currentId: recommendation.id,
    href: (itemId) => `/editor/folders/${folder.id}/recommendations/${itemId}`,
    where: { status: { not: "ssp_draft" } },
    label: (status) => editorWorkspaceStatusLabel(status as RecommendationStatus),
  });
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
    <RecommendationDesignPage
      backHref={`/editor/folders/${folder.id}`}
      backLabel="До папки"
      folderTitle={folder.title}
      folderYear={folder.year}
      sequenceNumber={recommendation.sequenceNumber}
      status={recommendation.status}
      statusLabelText={editorWorkspaceStatusLabel(recommendation.status)}
      significance={recommendation.observationSignificance}
      sspUnit={recommendation.sspUnit}
      vkElement={recommendation.vkElement}
      deadline={formatDay(recommendation.deadline)}
      informingDeadline={recommendation.informingDeadline ? formatDay(recommendation.informingDeadline) : "—"}
      daysLeft={daysUntil(recommendation.deadline)}
      deadlineWas={design.deadlineHistory.entries.at(-1)?.from ?? null}
      deadlineChanges={design.deadlineHistory.count}
      informingChanges={design.informingHistory.count}
      deadlineHistory={design.deadlineHistory}
      informingHistory={design.informingHistory}
      fields={design.fields}
      showResults
      progress={recommendation.progressReport ?? ""}
      actualDate={recommendation.actualImplementationDate ? formatDay(recommendation.actualImplementationDate) : "—"}
      measures={recommendation.measuresDescription ?? ""}
      expectedAchievement={recommendation.expectedAchievement ?? ""}
      documents={recommendation.supportingDocuments ?? ""}
      notes={recommendation.sspNotes ?? ""}
      siblings={siblings}
      changeBanner={design.changeBanner}
      actions={
        folderArchived ? null : (
          <a
            href="#editor-supplement"
            className="inline-flex h-11 items-center rounded-full border border-black bg-white px-5 text-base font-semibold text-black"
          >
            Доповнити
          </a>
        )
      }
      alerts={
        <>
          {folderArchived ? (
            <p className="rounded-xl border border-[#9a9a9a] bg-[#f0f0f0] px-4 py-3">Папка архівована — зміни рекомендації недоступні.</p>
          ) : null}
          {errorText ? <p className="rounded-xl border border-[#aa0600] bg-[#ffdfdf] px-4 py-3 text-[#aa0600]">{errorText}</p> : null}
          {successText ? <p className="rounded-xl border border-[#1e6b35] bg-[#dcf3e2] px-4 py-3">{successText}</p> : null}
        </>
      }
      work={
      <Card id="editor-supplement" className="border border-black/20 shadow-sm">
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

          <div className="grid gap-6 md:grid-cols-2">
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

          <RecommendationFieldBlock label="Стан впровадження рекомендацій" htmlFor="progress_report">
            <EditorAppendFieldDisplay
              id="progress_report"
              fieldKey="progressReport"
              currentValue={recommendation.progressReport ?? ""}
              supplements={supplements}
            />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Фактична дата впровадження" htmlFor="actual_implementation_date">
            <EditorAppendFieldDisplay
              id="actual_implementation_date"
              fieldKey="actualImplementationDate"
              currentValue={
                recommendation.actualImplementationDate
                  ? formatDay(recommendation.actualImplementationDate)
                  : "—"
              }
              supplements={supplements}
            />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Заходи з впровадження рекомендацій" htmlFor="measures">
            <EditorAppendFieldDisplay
              id="measures"
              fieldKey="measuresDescription"
              currentValue={recommendation.measuresDescription ?? ""}
              supplements={supplements}
            />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Досягнення очікуваного результату" htmlFor="expected_achievement">
            <EditorAppendFieldDisplay
              id="expected_achievement"
              fieldKey="expectedAchievement"
              currentValue={recommendation.expectedAchievement ?? ""}
              supplements={supplements}
            />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Підтверджуючі документи" htmlFor="supporting_documents">
            <EditorAppendFieldDisplay
              id="supporting_documents"
              fieldKey="supportingDocuments"
              currentValue={recommendation.supportingDocuments ?? ""}
              supplements={supplements}
            />
          </RecommendationFieldBlock>

          <RecommendationFieldBlock label="Примітки" htmlFor="ssp_notes">
            <EditorAppendFieldDisplay
              id="ssp_notes"
              fieldKey="sspNotes"
              currentValue={recommendation.sspNotes ?? ""}
              supplements={supplements}
            />
          </RecommendationFieldBlock>

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
        </CardContent>
      </Card>
      }
    />
  );
}
