import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { RecommendationDetailHeader } from "@/components/recommendation-detail-header";
import { RecommendationDetailHeaderMeta } from "@/components/recommendation-detail-header-meta";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  findDepartmentByName,
  getDepartments,
  normalizeImportedDepartmentName,
  resolveDepartmentNameFromImport,
} from "@/lib/admin/departments-store";
import { observationSignificanceSelectValue } from "@/lib/observation-significance";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { editorWorkspaceStatusLabel } from "@/lib/editor/editor-workspace-status-label";

import {
  deleteRecommendation,
  startExecution,
  updateRecommendation,
} from "@/app/(portal)/(editor)/editor/actions";

const errorMessages: Record<string, string> = {
  assignee_not_found:
    "Оберіть дійсного користувача з роллю ССП або залиште поле «Відповідальна особа» порожнім.",
  invalid_department: "Оберіть дійсний активний підрозділ зі списку.",
  invalid_deadline: "Некоректний термін виконання.",
  invalid_informing_deadline: "Некоректний строк інформування.",
  recommendation_not_found: "Рекомендацію не знайдено або доступ до неї відсутній.",
  cannot_edit_status: "Редагування доступне лише для чернетки редактора або чернетки відповідального.",
  assignee_required_before_start:
    "Перед передачею в роботу оберіть відповідальний підрозділ зі списку.",
  cannot_start_from_status: "Передати в роботу можна лише з чернетки редактора або чернетки відповідального.",
};

const editTextareaClass =
  "min-h-[120px] w-full resize-y rounded-md border border-input bg-muted/20 px-3 py-2 text-base leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const editSelectClass =
  "h-11 w-full rounded-md border border-input bg-muted/20 px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default async function EditorRecommendationEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recommendationId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireRole(["editor"]);
  const { id: folderId, recommendationId } = await params;
  const query = await searchParams;

  const folder = await db.auditFolder.findFirst({
    where: { id: folderId, createdById: profile.id },
    select: { id: true, title: true, archivedAt: true },
  });
  if (!folder) notFound();
  if (folder.archivedAt) {
    redirect(`/editor/folders/${folder.id}?error=folder_archived`);
  }

  const recommendation = await db.recommendation.findFirst({
    where: { id: recommendationId, auditFolderId: folder.id },
    select: {
      id: true,
      sequenceNumber: true,
      status: true,
      recommendationText: true,
      deficiency: true,
      vkElement: true,
      observationSignificance: true,
      executionIndicator: true,
      expectedResult: true,
      sspUnit: true,
      deadline: true,
      informingDeadline: true,
      assigneeUserId: true,
      updatedAt: true,
    },
  });
  if (!recommendation) notFound();

  if (recommendation.status !== "draft") {
    redirect(`/editor/folders/${folder.id}/recommendations/${recommendation.id}`);
  }

  const importedSspUnit = normalizeImportedDepartmentName(recommendation.sspUnit);
  // Якщо підрозділ уже є в імпортованих даних — гарантуємо, що він є в довіднику й у dropdown.
  const resolvedImportedSspUnit = importedSspUnit
    ? await resolveDepartmentNameFromImport(importedSspUnit)
    : "";
  if (
    resolvedImportedSspUnit &&
    resolvedImportedSspUnit !== recommendation.sspUnit
  ) {
    await db.recommendation.update({
      where: { id: recommendation.id },
      data: { sspUnit: resolvedImportedSspUnit },
    });
    recommendation.sspUnit = resolvedImportedSspUnit;
  }

  const activeDepartments = (await getDepartments()).filter((d) => d.isActive);
  const selectedSspUnit =
    findDepartmentByName(activeDepartments, recommendation.sspUnit)?.name ??
    (resolvedImportedSspUnit || "");
  const redirectPath = `/editor/folders/${folder.id}/recommendations/${recommendation.id}/edit`;

  const errorKey = query.error ?? "";
  const errorText = errorKey && errorMessages[errorKey] ? errorMessages[errorKey] : null;

  const metaLine = `Оновлено: ${recommendation.updatedAt.toLocaleString("uk-UA")}`;

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
          {errorText ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
              {errorText}
            </p>
          ) : null}

          <form action={updateRecommendation} className="space-y-6">
            <input type="hidden" name="recommendation_id" value={recommendation.id} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <input type="hidden" name="return_path" value={redirectPath} />
            <input type="hidden" name="assignee_user_id" value={recommendation.assigneeUserId ?? ""} />

            <RecommendationFieldBlock label="Елемент ВК" htmlFor="vk_element">
              <Input
                id="vk_element"
                name="vk_element"
                defaultValue={recommendation.vkElement}
                required
                className={editSelectClass}
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Значущість спостереження" htmlFor="observation_significance">
              <select
                id="observation_significance"
                name="observation_significance"
                className={editSelectClass}
                defaultValue={observationSignificanceSelectValue(recommendation.observationSignificance)}
                required
              >
                <option value="">Не обрано</option>
                <option value="низька">низька</option>
                <option value="середня">середня</option>
                <option value="висока">висока</option>
                <option value="критична">критична</option>
              </select>
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Недоліки, проблеми та порушення (точки зростання)" htmlFor="deficiency">
              <Textarea
                id="deficiency"
                name="deficiency"
                defaultValue={recommendation.deficiency}
                required
                className={editTextareaClass}
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Надані аудиторські рекомендації" htmlFor="recommendation_text">
              <Textarea
                id="recommendation_text"
                name="recommendation_text"
                defaultValue={recommendation.recommendationText}
                required
                className={editTextareaClass}
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Індикатор виконання рекомендацій (захід / документ)" htmlFor="execution_indicator">
              <Textarea
                id="execution_indicator"
                name="execution_indicator"
                defaultValue={recommendation.executionIndicator}
                required
                className={editTextareaClass}
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Очікуваний результат від впровадження рекомендацій" htmlFor="expected_result">
              <Textarea
                id="expected_result"
                name="expected_result"
                defaultValue={recommendation.expectedResult}
                required
                className={editTextareaClass}
              />
            </RecommendationFieldBlock>

            <div className="grid gap-6 md:grid-cols-3">
              <RecommendationFieldBlock label="Відповідальний підрозділ" htmlFor="ssp_unit">
                <select
                  id="ssp_unit"
                  name="ssp_unit"
                  className={editSelectClass}
                  defaultValue={selectedSspUnit}
                  required
                >
                  <option value="">— Оберіть підрозділ —</option>
                  {selectedSspUnit &&
                  !activeDepartments.some((department) => department.name === selectedSspUnit) ? (
                    <option value={selectedSspUnit}>{selectedSspUnit}</option>
                  ) : null}
                  {activeDepartments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </RecommendationFieldBlock>

              <RecommendationFieldBlock label="Термін виконання" htmlFor="deadline">
                <Input
                  id="deadline"
                  name="deadline"
                  type="date"
                  defaultValue={new Date(recommendation.deadline).toISOString().slice(0, 10)}
                  required
                  className={editSelectClass}
                />
              </RecommendationFieldBlock>

              <RecommendationFieldBlock label="Строк інформування" htmlFor="informing_deadline">
                <Input
                  id="informing_deadline"
                  name="informing_deadline"
                  type="date"
                  defaultValue={
                    recommendation.informingDeadline
                      ? new Date(recommendation.informingDeadline).toISOString().slice(0, 10)
                      : ""
                  }
                  required
                  className={editSelectClass}
                />
              </RecommendationFieldBlock>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" formNoValidate className="bg-[#3a6fb8] hover:bg-[#2f5e9a]">
                Зберегти зміни
              </Button>
              <Button type="submit" formAction={startExecution} variant="outline">
                Передати в роботу
              </Button>
              <Link
                href={`/editor/folders/${folder.id}/recommendations/${recommendation.id}`}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
              >
                Доповнити з історією
              </Link>
              <Button
                type="submit"
                formAction={deleteRecommendation}
                variant="outline"
                className="ml-auto text-destructive hover:text-destructive"
              >
                Видалити рекомендацію
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
