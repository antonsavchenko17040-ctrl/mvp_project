import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

import { adminCreateRecommendation } from "@/app/(portal)/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { getDepartments } from "@/lib/admin/departments-store";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export default async function AdminNewRecommendationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["admin"]);
  const { id: folderId } = await params;
  const query = await searchParams;

  const folder = await db.auditFolder.findFirst({
    where: { id: folderId },
    select: { id: true, title: true, archivedAt: true },
  });
  if (!folder) notFound();

  const activeDepartments = (await getDepartments()).filter((d) => d.isActive);
  const basePath = `/admin/folders/${folder.id}/new`;

  return (
    <section className="space-y-5">
      <div className="flex w-full justify-start">
        <Link
          href="/admin"
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 pr-3 text-foreground transition-colors hover:bg-muted sm:gap-2.5 sm:px-2.5 sm:pr-4"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-left text-sm font-medium sm:text-base">Назад до робочого столу</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#3a6fb8] text-white shadow-sm">
          <Plus className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Створення нової рекомендації
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-base text-muted-foreground">
            <span>Папка: «{folder.title}»</span>
            {folder.archivedAt ? (
              <span className="rounded-full border border-slate-400/70 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                Архівовано
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <Card className="border border-black/20 shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          {query.error === "folder_not_found" ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
              Папку не знайдено.
            </p>
          ) : null}
          {query.error === "assignee_not_found" ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
              Оберіть дійсного користувача з роллю ССП.
            </p>
          ) : null}
          {query.error === "invalid_department" ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
              Оберіть дійсний активний підрозділ зі списку.
            </p>
          ) : null}

          <form action={adminCreateRecommendation} className="space-y-6">
            <input type="hidden" name="audit_folder_id" value={folder.id} />
            <input type="hidden" name="redirect_path" value={basePath} />

            <RecommendationFieldBlock label="Елемент ВК" htmlFor="vk_element">
              <Input
                id="vk_element"
                name="vk_element"
                required
                className="h-11 text-base"
                placeholder="Елемент внутрішнього контролю"
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Значущість спостереження" htmlFor="observation_significance">
              <select
                id="observation_significance"
                name="observation_significance"
                className={cn(
                  "h-11 w-full rounded-md border border-input bg-background px-3 text-base",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                )}
                required
                defaultValue="середній"
              >
                <option value="низький">низький</option>
                <option value="середній">середній</option>
                <option value="високий">високий</option>
                <option value="критичний">критичний</option>
              </select>
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Недоліки, проблеми та порушення (точки зростання)" htmlFor="deficiency">
              <Textarea
                id="deficiency"
                name="deficiency"
                required
                className="min-h-[120px] resize-y"
                placeholder="Опишіть суть виявленої проблеми, порушення або недоліку"
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Надані аудиторські рекомендації" htmlFor="recommendation_text">
              <Textarea
                id="recommendation_text"
                name="recommendation_text"
                required
                className="min-h-[120px] resize-y"
                placeholder="Розпишіть потрібні дії для усунення недоліку"
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Індикатор виконання рекомендацій (захід / документ)" htmlFor="execution_indicator">
              <Textarea
                id="execution_indicator"
                name="execution_indicator"
                required
                className="min-h-[120px] resize-y"
                placeholder="Дії, що підтверджують виконання рекомендації"
              />
            </RecommendationFieldBlock>

            <RecommendationFieldBlock label="Очікуваний результат від впровадження рекомендацій" htmlFor="expected_result">
              <Textarea
                id="expected_result"
                name="expected_result"
                required
                className="min-h-[120px] resize-y"
                placeholder="Який ефект мусить бути досягнутим?"
              />
            </RecommendationFieldBlock>

            <div className="grid gap-6 md:grid-cols-3">
              <RecommendationFieldBlock label="Відповідальний підрозділ" htmlFor="ssp_unit">
                <select
                  id="ssp_unit"
                  name="ssp_unit"
                  className={cn(
                    "h-11 w-full rounded-md border border-input bg-background px-3 text-base",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  )}
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    — Оберіть підрозділ —
                  </option>
                  {activeDepartments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </RecommendationFieldBlock>

              <RecommendationFieldBlock label="Термін виконання" htmlFor="deadline">
                <Input id="deadline" name="deadline" type="date" required className="h-11 text-base" />
              </RecommendationFieldBlock>

              <RecommendationFieldBlock label="Строк інформування" htmlFor="informing_deadline">
                <Input id="informing_deadline" name="informing_deadline" type="date" required className="h-11 text-base" />
              </RecommendationFieldBlock>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="submit" variant="outline" name="intent" value="draft" className="sm:min-w-[200px]">
                Зберегти як чернетку
              </Button>
              <Button type="submit" className="bg-[#3a6fb8] hover:bg-[#2f5e9a] sm:min-w-[220px]" name="intent" value="assign">
                Зберегти та призначити
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
