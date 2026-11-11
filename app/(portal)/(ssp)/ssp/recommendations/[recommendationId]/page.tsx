import Link from "next/link";
import { notFound } from "next/navigation";

import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDesignPage } from "@/components/recommendation-design/recommendation-design-page";
import { SspRecommendationEditForm } from "@/components/ssp/ssp-recommendation-edit-form";
import { SspRecommendationReadonlyFields } from "@/components/ssp/ssp-recommendation-readonly-fields";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { SupplementFieldKey } from "@/lib/editor/recommendation-supplements";
import {
  isRecommendationVisibleToSspMember,
  sspRecommendationAccessOr,
  sspRecommendationByIdWhere,
} from "@/lib/ssp/recommendation-access";
import {
  canSspSupplementRecommendation,
  formatSspStoredDate,
} from "@/lib/ssp/recommendation-supplements";
import { sspWorkspaceStatusLabel } from "@/lib/ssp/ssp-status-label";
import { listFolderRecommendationNav } from "@/lib/recommendation-design/siblings";
import { daysUntil, designContentFromRecommendation } from "@/lib/recommendation-design/view-model";

import { saveSspDraft, submitForReview } from "../../actions";

const inactiveDisplayClassName =
  "border-input bg-neutral-200/80 text-neutral-950 selection:bg-muted";

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

function EditorFieldWithSupplements({
  fieldKey,
  supplements,
  label,
  htmlFor,
  currentValue,
}: {
  fieldKey: SupplementFieldKey;
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
        className={inactiveDisplayClassName}
      />
    </RecommendationFieldBlock>
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
  cannot_supplement_until_verified:
    "Доповнення доступні лише після верифікації рекомендації аналітиком.",
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
      auditFolder: { select: { id: true, title: true, year: true, archivedAt: true } },
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
  if (
    !recommendation ||
    !(await isRecommendationVisibleToSspMember(recommendation.id, profile.id))
  ) {
    notFound();
  }

  const deadlineLabel = formatDate(recommendation.deadline);

  const analystText = recommendation.analystComment?.trim() ?? "";
  const managerText = recommendation.managerComment?.trim() ?? "";
  const folderArchived = Boolean(recommendation.auditFolder.archivedAt);
  const allowSspSupplements = canSspSupplementRecommendation({
    status: recommendation.status,
    archivedAt: recommendation.auditFolder.archivedAt,
  });
  const sspCanFillForm =
    !folderArchived &&
    (recommendation.status === "in_progress" ||
      recommendation.status === "revision" ||
      recommendation.status === "ssp_draft");
  const redirectPath = `/ssp/recommendations/${recommendation.id}`;
  const supplements = recommendation.fieldSupplements;
  const today = formatSspStoredDate(new Date());

  const design = designContentFromRecommendation(recommendation, supplements);
  const siblings = await listFolderRecommendationNav({
    folderId: recommendation.auditFolder.id,
    currentId: recommendation.id,
    href: (itemId) => `/ssp/recommendations/${itemId}`,
    where: { OR: await sspRecommendationAccessOr(profile.id) },
    label: (status) =>
      sspWorkspaceStatusLabel({
        status: status as typeof recommendation.status,
        analystComment: null,
        managerComment: null,
      }),
  });
  const errorKey = query.error ?? "";
  const errorText = errorKey && errorMessages[errorKey] ? errorMessages[errorKey] : null;
  const successText = query.ok === "supplemented" ? "Доповнення збережено." : null;

  return (
    <RecommendationDesignPage
      backHref="/ssp"
      backLabel="До списку"
      folderTitle={recommendation.auditFolder.title}
      folderYear={recommendation.auditFolder.year}
      sequenceNumber={recommendation.sequenceNumber}
      auditTitle={recommendation.auditFolder.title}
      status={recommendation.status}
      statusLabelText={sspWorkspaceStatusLabel({
        status: recommendation.status,
        analystComment: recommendation.analystComment,
        managerComment: recommendation.managerComment,
      })}
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
          {errorText ? <p className="rounded-xl border border-[#aa0600] bg-[#ffdfdf] px-4 py-3 text-[#aa0600]">{errorText}</p> : null}
          {successText ? <p className="rounded-xl border border-[#1e6b35] bg-[#dcf3e2] px-4 py-3">{successText}</p> : null}
        </>
      }
      work={
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

          <EditorFieldWithSupplements
            fieldKey="vkElement"
            supplements={supplements}
            label="Елемент ВК"
            htmlFor="vk_element"
            currentValue={recommendation.vkElement}
          />

          <EditorFieldWithSupplements
            fieldKey="observationSignificance"
            supplements={supplements}
            label="Значущість спостереження"
            htmlFor="observation_significance"
            currentValue={recommendation.observationSignificance}
          />

          <EditorFieldWithSupplements
            fieldKey="deficiency"
            supplements={supplements}
            label="Недоліки, проблеми та порушення (точки зростання)"
            htmlFor="deficiency"
            currentValue={recommendation.deficiency}
          />

          <EditorFieldWithSupplements
            fieldKey="recommendationText"
            supplements={supplements}
            label="Надані аудиторські рекомендації"
            htmlFor="recommendation_text"
            currentValue={recommendation.recommendationText}
          />

          <EditorFieldWithSupplements
            fieldKey="executionIndicator"
            supplements={supplements}
            label="Індикатор виконання рекомендацій (захід / документ)"
            htmlFor="execution_indicator"
            currentValue={recommendation.executionIndicator}
          />

          <EditorFieldWithSupplements
            fieldKey="expectedResult"
            supplements={supplements}
            label="Очікуваний результат від впровадження рекомендацій"
            htmlFor="expected_result"
            currentValue={recommendation.expectedResult}
          />

          <EditorFieldWithSupplements
            fieldKey="sspUnit"
            supplements={supplements}
            label="Відповідальний підрозділ"
            htmlFor="ssp_unit"
            currentValue={recommendation.sspUnit}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <EditorFieldWithSupplements
              fieldKey="deadline"
              supplements={supplements}
              label="Термін виконання"
              htmlFor="deadline"
              currentValue={deadlineLabel}
            />

            <EditorFieldWithSupplements
              fieldKey="informingDeadline"
              supplements={supplements}
              label="Строк інформування"
              htmlFor="informing_deadline"
              currentValue={formatDate(recommendation.informingDeadline)}
            />
          </div>

          {supplements.some((item) => item.fieldKey === "changeReason") ||
          (recommendation.changeReason ?? "").trim() ? (
            <EditorFieldWithSupplements
              fieldKey="changeReason"
              supplements={supplements}
              label="Причина зміни"
              htmlFor="change_reason"
              currentValue={recommendation.changeReason ?? ""}
            />
          ) : null}

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
                    ? "Рекомендацію передано на верифікацію керівнику. Основне редагування та доповнення недоступні — доступний лише перегляд."
                    : "Рекомендацію передано на верифікацію аналітику. Основне редагування та доповнення недоступні — доступний лише перегляд."}
                </p>
              ) : allowSspSupplements ? (
                <p className="rounded-md border border-emerald-200/90 bg-emerald-50/95 p-3 text-base leading-relaxed text-emerald-950/85">
                  Рекомендацію виконано. За потреби можна доповнити поля відповідального.
                </p>
              ) : (
                <p className="rounded-md border border-border bg-muted/25 p-3 text-base text-muted-foreground">
                  У цьому статусі доступний лише перегляд полів відповідального.
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
                allowSupplements={allowSspSupplements}
              />
              <Link
  href="/ssp"
  className={buttonVariants({ variant: "outline" })}
>
  Назад до списку
</Link>
            </div>
          )}
        </CardContent>
      </Card>
      }
    />
  );
}
