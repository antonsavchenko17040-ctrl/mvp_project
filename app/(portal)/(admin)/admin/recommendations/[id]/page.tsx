import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";

import {
  adminDeactivateRecommendation,
  adminPublishRecommendation,
  adminReactivateRecommendation,
  adminSendRecommendationToRevision,
  adminUpdateRecommendation,
  hardDeleteRecommendation,
} from "@/app/(portal)/(admin)/admin/actions";
import { AdminSupplementableField } from "@/components/admin/admin-supplementable-field";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDepartments } from "@/lib/admin/departments-store";
import { formatStoredDateValue } from "@/lib/admin/recommendation-supplements";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { uk } from "@/lib/i18n/uk";
import { SSP_PROGRESS_REPORT_OPTIONS } from "@/lib/recommendation-execution-status";
import type { RecommendationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusOrder: RecommendationStatus[] = [
  "draft",
  "ssp_draft",
  "in_progress",
  "manager_review",
  "on_review",
  "revision",
  "published",
];

const errorMessages: Record<string, string> = {
  invalid_status: "Некоректний стан рекомендації.",
  assignee_not_found: "Оберіть дійсного активного користувача з роллю ССП або залиште поле порожнім.",
  invalid_department: "Оберіть дійсний активний підрозділ зі списку.",
  invalid_deadline: "Некоректна дата терміну виконання.",
  invalid_informing_deadline: "Некоректна дата строку інформування.",
  invalid_implementation_date: "Некоректна фактична дата впровадження.",
  invalid_progress_report: "Оберіть дійсний стан впровадження.",
  already_published: "Рекомендацію вже опубліковано.",
  cannot_publish: "Неможливо верифікувати цю рекомендацію.",
  already_deactivated: "Рекомендацію вже деактивовано.",
  already_active: "Рекомендація вже активна.",
  inactive: "Спочатку активуйте рекомендацію.",
  not_awaiting_verification: "Рекомендація зараз не потребує верифікації.",
  revision_comment_required: "Для повернення на доопрацювання потрібен коментар (мінімум 5 символів).",
  recommendation_not_found: "Рекомендацію не знайдено.",
  change_reason_required: "Вкажіть причину внесення змін.",
  supplement_empty: "Заповніть нове значення або доповнення.",
  supplement_unchanged: "Нове значення збігається з поточним — змін не внесено.",
  invalid_change_date: "Некоректна дата внесення змін.",
  invalid_field: "Невідоме поле для доповнення.",
};

const okMessages: Record<string, string> = {
  recommendation_created: "Рекомендацію створено. Можете відредагувати поля або верифікувати.",
  reactivated: "Рекомендацію знову активовано.",
  published: "Рекомендацію верифіковано.",
  sent_to_revision: "Рекомендацію повернуто на доопрацювання.",
  supplemented: "Доповнення збережено.",
  supplement_updated: "Доповнення оновлено.",
  supplement_deleted: "Доповнення видалено.",
};

const selectClassName = cn(
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
);

export default async function AdminEditRecommendationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const query = await searchParams;

  const recommendation = await db.recommendation.findUnique({
    where: { id },
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
  if (!recommendation) {
    notFound();
  }

  const sspUsers = await db.profile.findMany({
    where: { isActive: true, roles: { some: { role: "ssp" } } },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
  });
  const activeDepartments = (await getDepartments()).filter((d) => d.isActive);
  const supplements = recommendation.fieldSupplements;
  const redirectPath = `/admin/recommendations/${recommendation.id}`;
  const today = formatStoredDateValue(new Date());

  const errorKey = query.error ?? "";
  const errorText = errorKey && errorMessages[errorKey] ? errorMessages[errorKey] : null;
  const okKey = query.ok ?? "";
  const okText = okKey && okMessages[okKey] ? okMessages[okKey] : null;
  const needsVerification =
    recommendation.isActive &&
    (recommendation.status === "on_review" || recommendation.status === "manager_review");
  const revisionCommentDefault =
    recommendation.status === "manager_review"
      ? (recommendation.managerComment ?? "")
      : (recommendation.analystComment ?? "");
  const backHref = `/admin?folder=${recommendation.auditFolder.id}`;
  const metaLine = `Оновлено: ${recommendation.updatedAt.toLocaleString("uk-UA")}${
    !recommendation.isActive ? " · Деактивована" : ""
  }`;

  const supplementProps = {
    recommendationId: recommendation.id,
    redirectPath,
    supplements,
    defaultChangeDate: today,
    departments: activeDepartments,
  };

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href={backHref}
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-foreground transition-colors hover:bg-muted sm:gap-2.5 sm:px-2.5 sm:pr-4"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 text-left text-sm font-medium sm:text-base">
            <span className="block">Назад до робочого столу</span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:text-sm">
              Папка звіту: «{recommendation.auditFolder.title}» ({recommendation.auditFolder.year})
              {recommendation.auditFolder.archivedAt ? (
                <span className="ml-2 inline-flex rounded-full border border-slate-400/70 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Завершено
                </span>
              ) : null}
            </span>
          </span>
        </Link>
      </div>

      <div className="space-y-1">
        <RecommendationDetailHeader
          title="Рекомендація"
          updatedAtLabel={metaLine}
          meta={
            <RecommendationDetailHeaderMeta sequenceNumber={recommendation.sequenceNumber}>
              <RecommendationStatusBadge
                status={recommendation.status}
                label={uk.status[recommendation.status]}
                className="h-auto min-h-7 shrink-0 px-3 py-1 text-sm font-semibold sm:min-h-8 sm:text-base"
              />
            </RecommendationDetailHeaderMeta>
          }
        />
        <p className="inline-flex items-center gap-1.5 pl-14 text-base font-semibold text-[#2f5e9a] sm:pl-16">
          <Wrench className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
          Режим редагування
        </p>
      </div>

      <Card className="border border-black/20 shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          {errorText ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
              {errorText}
            </p>
          ) : null}
          {okText ? (
            <p className="rounded-md border border-emerald-600/30 bg-emerald-50 p-3 text-base text-emerald-800">
              {okText}
            </p>
          ) : null}

          <form id="admin-recommendation-edit" action={adminUpdateRecommendation} className="space-y-6">
            <input type="hidden" name="recommendation_id" value={recommendation.id} />

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="vkElement"
              label="Елемент ВК"
              htmlFor="vk_element"
              currentValue={recommendation.vkElement}
            >
              <Input
                id="vk_element"
                name="vk_element"
                required
                className="h-11 text-base"
                defaultValue={recommendation.vkElement}
                placeholder="Елемент внутрішнього контролю"
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="observationSignificance"
              label="Значущість спостереження"
              htmlFor="observation_significance"
              currentValue={recommendation.observationSignificance}
            >
              <select
                id="observation_significance"
                name="observation_significance"
                className={selectClassName}
                required
                defaultValue={recommendation.observationSignificance}
              >
                <option value="низький">низький</option>
                <option value="середній">середній</option>
                <option value="високий">високий</option>
                <option value="критичний">критичний</option>
              </select>
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="deficiency"
              label="Недоліки, проблеми та порушення (точки зростання)"
              htmlFor="deficiency"
              currentValue={recommendation.deficiency}
            >
              <Textarea
                id="deficiency"
                name="deficiency"
                required
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.deficiency}
                placeholder="Опишіть суть виявленої проблеми, порушення або недоліку"
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="recommendationText"
              label="Надані аудиторські рекомендації"
              htmlFor="recommendation_text"
              currentValue={recommendation.recommendationText}
            >
              <Textarea
                id="recommendation_text"
                name="recommendation_text"
                required
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.recommendationText}
                placeholder="Розпишіть потрібні дії для усунення недоліку"
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="executionIndicator"
              label="Індикатор виконання рекомендацій (захід / документ)"
              htmlFor="execution_indicator"
              currentValue={recommendation.executionIndicator}
            >
              <Textarea
                id="execution_indicator"
                name="execution_indicator"
                required
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.executionIndicator}
                placeholder="Дії, що підтверджують виконання рекомендації"
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="expectedResult"
              label="Очікуваний результат від впровадження рекомендацій"
              htmlFor="expected_result"
              currentValue={recommendation.expectedResult}
            >
              <Textarea
                id="expected_result"
                name="expected_result"
                required
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.expectedResult}
                placeholder="Який ефект мусить бути досягнутим?"
              />
            </AdminSupplementableField>

            <div className="grid gap-6 md:grid-cols-3">
              <AdminSupplementableField
                {...supplementProps}
                fieldKey="sspUnit"
                label="Відповідальний підрозділ"
                htmlFor="ssp_unit"
                currentValue={recommendation.sspUnit}
              >
                <select
                  id="ssp_unit"
                  name="ssp_unit"
                  className={selectClassName}
                  required
                  defaultValue={recommendation.sspUnit}
                >
                  <option value="">— Оберіть підрозділ —</option>
                  {activeDepartments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </AdminSupplementableField>

              <AdminSupplementableField
                {...supplementProps}
                fieldKey="deadline"
                label="Термін виконання"
                htmlFor="deadline"
                currentValue={formatStoredDateValue(recommendation.deadline)}
              >
                <Input
                  id="deadline"
                  name="deadline"
                  type="date"
                  required
                  className="h-11 text-base"
                  defaultValue={formatStoredDateValue(recommendation.deadline)}
                />
              </AdminSupplementableField>

              <AdminSupplementableField
                {...supplementProps}
                fieldKey="informingDeadline"
                label="Строк інформування"
                htmlFor="informing_deadline"
                currentValue={formatStoredDateValue(recommendation.informingDeadline) || "—"}
              >
                <Input
                  id="informing_deadline"
                  name="informing_deadline"
                  type="date"
                  required
                  className="h-11 text-base"
                  defaultValue={formatStoredDateValue(recommendation.informingDeadline)}
                />
              </AdminSupplementableField>
            </div>

            <RecommendationFieldBlock label="Стан рекомендації" htmlFor="status">
              <select
                id="status"
                name="status"
                className={selectClassName}
                required
                defaultValue={recommendation.status}
              >
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {uk.status[status]}
                  </option>
                ))}
              </select>
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Відповідальний ССП (необов’язково)" htmlFor="assignee_user_id">
              <select
                id="assignee_user_id"
                name="assignee_user_id"
                className={selectClassName}
                defaultValue={recommendation.assigneeUserId ?? ""}
              >
                <option value="">— Не призначено —</option>
                {sspUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {(user.fullName ?? "Без імені")} ({user.email})
                  </option>
                ))}
              </select>
            </RecommendationFieldBlock>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="progressReport"
              label="Стан впровадження рекомендацій"
              htmlFor="progress_report"
              currentValue={recommendation.progressReport ?? ""}
            >
              <select
                id="progress_report"
                name="progress_report"
                className={selectClassName}
                defaultValue={recommendation.progressReport ?? ""}
              >
                <option value="">— Не вказано —</option>
                {SSP_PROGRESS_REPORT_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
                {recommendation.progressReport &&
                !SSP_PROGRESS_REPORT_OPTIONS.includes(
                  recommendation.progressReport as (typeof SSP_PROGRESS_REPORT_OPTIONS)[number],
                ) ? (
                  <option value={recommendation.progressReport}>{recommendation.progressReport}</option>
                ) : null}
              </select>
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="actualImplementationDate"
              label="Фактична дата впровадження"
              htmlFor="actual_implementation_date"
              currentValue={formatStoredDateValue(recommendation.actualImplementationDate) || "—"}
            >
              <Input
                id="actual_implementation_date"
                name="actual_implementation_date"
                type="date"
                className="h-11 text-base"
                defaultValue={formatStoredDateValue(recommendation.actualImplementationDate)}
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="expectedAchievement"
              label="Досягнення очікуваного"
              htmlFor="expected_achievement"
              currentValue={recommendation.expectedAchievement ?? ""}
            >
              <Textarea
                id="expected_achievement"
                name="expected_achievement"
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.expectedAchievement ?? ""}
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="supportingDocuments"
              label="Підтверджуючі документи"
              htmlFor="supporting_documents"
              currentValue={recommendation.supportingDocuments ?? ""}
            >
              <Textarea
                id="supporting_documents"
                name="supporting_documents"
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.supportingDocuments ?? ""}
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="measuresDescription"
              label="Заходи з впровадження рекомендацій"
              htmlFor="measures_description"
              currentValue={recommendation.measuresDescription ?? ""}
            >
              <Textarea
                id="measures_description"
                name="measures_description"
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.measuresDescription ?? ""}
              />
            </AdminSupplementableField>

            <AdminSupplementableField
              {...supplementProps}
              fieldKey="sspNotes"
              label="Примітки"
              htmlFor="ssp_notes"
              currentValue={recommendation.sspNotes ?? ""}
            >
              <Textarea
                id="ssp_notes"
                name="ssp_notes"
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.sspNotes ?? ""}
              />
            </AdminSupplementableField>

            <RecommendationFieldBlock label="Коментар керівника" htmlFor="manager_comment">
              <Textarea
                id="manager_comment"
                name="manager_comment"
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.managerComment ?? ""}
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Коментар аналітика" htmlFor="analyst_comment">
              <Textarea
                id="analyst_comment"
                name="analyst_comment"
                className="min-h-[120px] resize-y"
                defaultValue={recommendation.analystComment ?? ""}
              />
            </RecommendationFieldBlock>
          </form>

          {needsVerification ? (
            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex gap-3 sm:gap-4">
                <span
                  className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#3a6fb8] sm:mt-3 sm:h-1.5 sm:w-1.5"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-base font-medium text-foreground">Верифікація</h2>
                  <p className="text-sm text-muted-foreground">
                    Рекомендація у статусі «{uk.status[recommendation.status]}». Підтвердіть виконання або
                    поверніть на доопрацювання з коментарем (мінімум 5 символів).
                  </p>
                  <Textarea
                    id="revision_comment"
                    name="revision_comment"
                    form="admin-send-to-revision"
                    minLength={5}
                    defaultValue={revisionCommentDefault}
                    placeholder="Обов’язковий, якщо повертаєте на доопрацювання"
                    className="min-h-[80px] resize-y"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
            <form action={hardDeleteRecommendation}>
              <input type="hidden" name="recommendation_id" value={recommendation.id} />
              <Button type="submit" variant="destructive" className="w-full sm:w-auto">
                Видалити
              </Button>
            </form>
            {recommendation.isActive ? (
              <form action={adminDeactivateRecommendation}>
                <input type="hidden" name="recommendation_id" value={recommendation.id} />
                <Button type="submit" variant="outline" className="w-full sm:w-auto">
                  Деактивувати
                </Button>
              </form>
            ) : (
              <form action={adminReactivateRecommendation}>
                <input type="hidden" name="recommendation_id" value={recommendation.id} />
                <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                  Активувати
                </Button>
              </form>
            )}
            {needsVerification ? (
              <form id="admin-send-to-revision" action={adminSendRecommendationToRevision}>
                <input type="hidden" name="recommendation_id" value={recommendation.id} />
                <Button type="submit" variant="outline" className="w-full sm:w-auto">
                  Повернути на доопрацювання
                </Button>
              </form>
            ) : null}
            <Link
              href={backHref}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-background px-3 text-base font-medium hover:bg-muted sm:w-auto"
            >
              Скасувати
            </Link>
            {needsVerification ? (
              <form action={adminPublishRecommendation}>
                <input type="hidden" name="recommendation_id" value={recommendation.id} />
                <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                  Верифікувати
                </Button>
              </form>
            ) : null}
            <Button
              type="submit"
              form="admin-recommendation-edit"
              className="w-full bg-[#3a6fb8] hover:bg-[#2f5e9a] sm:min-w-[200px] sm:w-auto"
            >
              Зберегти зміни
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
