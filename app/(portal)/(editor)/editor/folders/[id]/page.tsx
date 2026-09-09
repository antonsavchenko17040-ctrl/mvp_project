import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { archiveAuditFolder } from "@/app/(portal)/(editor)/editor/actions";
import { ArchivedFolderXlsxDownloadButton } from "@/components/archived-folder-xlsx-download-button";
import { RecommendationStatusBadge } from "@/components/recommendation-status-badge";
import { EditorFolderSearch } from "@/components/editor/editor-folder-search";
import { EditorRecommendationTableCell } from "@/components/editor/editor-recommendation-table-cell";
import { EditorRecommendationTableRow } from "@/components/editor/editor-recommendation-table-row";
import { ReportFolderBackLink } from "@/components/report-folder-back-link";
import { ReportFolderHeaderCard } from "@/components/report-folder-header-card";
import { TableSortableTh } from "@/components/table-sortable-th";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canArchiveFolderByRecommendations, isFolderArchived } from "@/lib/audit-folder-archive";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { countExecutionStatuses } from "@/lib/recommendation-execution-status";
import type { RecommendationStatus } from "@/lib/types";
import { editorWorkspaceStatusLabel } from "@/lib/editor/editor-workspace-status-label";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import {
  applySortParams,
  parseTableSort,
  significanceRank,
  sortByAccessor,
  statusRank,
  type TableSortState,
} from "@/lib/table-sort";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import { cn } from "@/lib/utils";

const editorSortKeys = ["number", "significance", "status", "sspUnit"] as const;
type EditorSortKey = (typeof editorSortKeys)[number];
const editorSortDefaults: TableSortState<EditorSortKey> = { key: "number", dir: "asc", explicit: false };

export default async function EditorFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    status?: string;
    mode?: string;
    recommendationId?: string;
    q?: string;
    qf?: string;
    sort?: string;
    dir?: string;
    ok?: string;
  }>;
}) {
  const profile = await requireRole(["editor"]);
  const routeParams = await params;
  const query = await searchParams;

  const folder = await db.auditFolder.findFirst({
    where: { id: routeParams.id, createdById: profile.id },
    select: { id: true, title: true, createdAt: true, archivedAt: true },
  });
  if (!folder) notFound();

  if (query.mode === "create") {
    redirect(`/editor/folders/${routeParams.id}/new`);
  }

  if (query.mode === "edit" && query.recommendationId) {
    redirect(`/editor/folders/${folder.id}/recommendations/${query.recommendationId}/edit`);
  }

  const allowedStatuses: RecommendationStatus[] = [
    "draft",
    "in_progress",
    "on_review",
    "revision",
    "published",
  ];
  const activeStatus = allowedStatuses.includes((query.status ?? "") as RecommendationStatus)
    ? (query.status as RecommendationStatus)
    : "all";
  const searchQuery = (query.q ?? "").trim().toLowerCase();
  const searchFieldRaw = (query.qf ?? "").trim();
  const searchField =
    searchFieldRaw === "deficiency" || searchFieldRaw === "recommendationText"
      ? searchFieldRaw
      : "";
  const sort = parseTableSort(query, editorSortKeys, editorSortDefaults);
  const folderPath = `/editor/folders/${folder.id}`;

  const recommendations = await db.recommendation.findMany({
    where: {
      auditFolderId: folder.id,
      isActive: true,
      status:
        activeStatus === "all"
          ? { not: "ssp_draft" }
          : activeStatus === "on_review"
            ? { in: ["manager_review", "on_review"] }
            : activeStatus,
    },
    select: {
      id: true,
      sequenceNumber: true,
      recommendationText: true,
      deficiency: true,
      vkElement: true,
      observationSignificance: true,
      executionIndicator: true,
      expectedResult: true,
      status: true,
      sspUnit: true,
      deadline: true,
      informingDeadline: true,
      assigneeUserId: true,
    },
    orderBy: recommendationSequenceOrderBy,
  });

  const searchedRecommendations = searchQuery
    ? recommendations.filter((item) => {
        const deficiency = (item.deficiency ?? "").toLowerCase();
        const recommendationText = (item.recommendationText ?? "").toLowerCase();
        if (searchField === "deficiency") return deficiency.includes(searchQuery);
        if (searchField === "recommendationText") {
          return recommendationText.includes(searchQuery);
        }
        return deficiency.includes(searchQuery) || recommendationText.includes(searchQuery);
      })
    : recommendations;

  const filteredRecommendations = (() => {
    switch (sort.key) {
      case "significance":
        return sortByAccessor(
          searchedRecommendations,
          sort.dir,
          (r) => significanceRank(r.observationSignificance),
          (r) => r.sequenceNumber,
        );
      case "status":
        return sortByAccessor(
          searchedRecommendations,
          sort.dir,
          (r) => statusRank(r.status),
          (r) => r.sequenceNumber,
        );
      case "sspUnit":
        return sortByAccessor(
          searchedRecommendations,
          sort.dir,
          (r) => r.sspUnit,
          (r) => r.sequenceNumber,
        );
      case "number":
      default:
        return sortByAccessor(searchedRecommendations, sort.dir, (r) => r.sequenceNumber);
    }
  })();

  const preserveParams = {
    status: activeStatus,
    q: searchQuery || undefined,
    qf: searchField || undefined,
  };

  const allRecommendations = await db.recommendation.findMany({
    where: { auditFolderId: folder.id, isActive: true, status: { not: "ssp_draft" } },
    select: { status: true, progressReport: true, executionIndicator: true, isActive: true },
  });
  const activeForArchive = await db.recommendation.findMany({
    where: { auditFolderId: folder.id, isActive: true },
    select: { status: true, isActive: true },
  });
  const executionCounts = countExecutionStatuses(allRecommendations);
  const folderArchived = isFolderArchived(folder.archivedAt);
  const canArchive =
    !folderArchived && canArchiveFolderByRecommendations(activeForArchive);

  const folderStatBlocks = [
    { key: "total", value: allRecommendations.length, label: "всього" },
    { key: "full", value: executionCounts.full, label: "виконано повністю" },
    { key: "partial", value: executionCounts.partial, label: "частково" },
    { key: "notDone", value: executionCounts.notDone, label: "не виконані" },
    { key: "deadline", value: executionCounts.deadlineNotReached, label: "термін не настав" },
  ] as const;

  const folderRecommendationFilters = [
    {
      key: "all" as const,
      label: "Усі рекомендації",
      chip: "border-neutral-900 text-neutral-900 hover:bg-neutral-50",
      dot: "bg-neutral-900",
      active: "bg-neutral-100",
    },
    {
      key: "draft" as const,
      label: "Чернетка",
      chip: "border-violet-600 text-violet-800 hover:bg-violet-50/60",
      dot: "bg-violet-600",
      active: "bg-violet-50",
    },
    {
      key: "published" as const,
      label: "Виконано",
      chip: "border-emerald-600 text-emerald-700 hover:bg-emerald-50/60",
      dot: "bg-emerald-600",
      active: "bg-emerald-50",
    },
    {
      key: "on_review" as const,
      label: "На верифікації",
      chip: "border-amber-500 text-amber-800 hover:bg-amber-50/70",
      dot: "bg-amber-500",
      active: "bg-amber-50",
    },
    {
      key: "in_progress" as const,
      label: "На виконанні",
      chip: "border-sky-600 text-sky-700 hover:bg-sky-50/70",
      dot: "bg-sky-600",
      active: "bg-sky-50",
    },
    {
      key: "revision" as const,
      label: "На доопрацюванні",
      chip: "border-red-600 text-red-700 hover:bg-red-50/70",
      dot: "bg-red-600",
      active: "bg-red-50",
    },
  ];

  const statusHref = (statusKey: string) => {
    const params = new URLSearchParams();
    params.set("status", statusKey);
    if (searchQuery) params.set("q", searchQuery);
    if (searchField) params.set("qf", searchField);
    applySortParams(params, sort);
    return `${folderPath}?${params.toString()}`;
  };

  return (
    <section className="space-y-5">
      <ReportFolderBackLink href="/editor" label="Повернутися до папок звітів" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <ReportFolderHeaderCard
              variant="banner"
              title={folder.title}
              createdAt={folder.createdAt}
              archivedAt={folder.archivedAt}
              stats={folderStatBlocks}
            />
          </div>
          {folderArchived ? (
            <ArchivedFolderXlsxDownloadButton
              folderId={folder.id}
              className="shrink-0 self-start border-white/40 bg-white/95 text-slate-900 hover:bg-white"
            />
          ) : null}
        </div>

        <Card className="relative w-full gap-0 overflow-hidden rounded-3xl border border-black/10 bg-white py-0 pb-4 shadow-sm ring-0">
          <CardContent className="space-y-4 pt-4 sm:pt-5">
            {query.ok === "archived" ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-base text-emerald-900">
                Папку архівовано. Подальші зміни рекомендацій недоступні для редактора та відповідального.
              </p>
            ) : null}
            {query.ok === "imported" ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-base text-emerald-900">
                Звіт успішно імпортовано. Папка доступна у вашому просторі та в публічній бібліотеці.
              </p>
            ) : null}
            {folderArchived ? (
              <p className="rounded-md border border-slate-300 bg-slate-50 p-3 text-base text-slate-800">
                Папка архівована — створення та зміна рекомендацій заблоковані. Перегляд доступний.
              </p>
            ) : null}
            {query.error === "folder_archived" ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
                Папку архівовано. Зміни недоступні.
              </p>
            ) : null}
            {query.error === "cannot_archive_incomplete" ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
                Архівувати можна лише коли всі активні рекомендації виконані (верифіковані).
              </p>
            ) : null}
            {query.error === "already_archived" ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
                Папку вже архівовано.
              </p>
            ) : null}
            {query.error === "cannot_delete_non_draft" ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
                Видалити можна лише рекомендацію в редакторській чернетці. Після передачі в роботу або зміни стану
                видалення недоступне.
              </p>
            ) : null}
            {query.error === "assignee_required_before_start" ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
              Перед передачею в роботу відкрийте «Редагувати» та оберіть відповідальну особу ССП для цієї
              рекомендації.
              </p>
            ) : null}
            {query.error === "cannot_start_from_status" ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
                Передати в роботу можна лише з чернетки редактора або з чернетки, збереженої відповідальним ССП.
              </p>
            ) : null}

            <div className="rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:p-3.5">
              <Suspense
                fallback={
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="h-9 min-w-0 flex-1 rounded-3xl border bg-white sm:h-10" />
                    <div className="h-9 w-full rounded-3xl border bg-white sm:h-10 sm:w-64" />
                  </div>
                }
              >
                <EditorFolderSearch
                  fields={[
                    { value: "deficiency", label: "Виявлені недоліки" },
                    { value: "recommendationText", label: "Зміст рекомендації" },
                  ]}
                />
              </Suspense>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:gap-2.5">
                {folderRecommendationFilters.map((item) => {
                  const selected = activeStatus === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={statusHref(item.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-bold transition-colors sm:px-3.5 sm:text-sm",
                        item.chip,
                        selected && item.active,
                      )}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", item.dot)} aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {canArchive ? (
                  <form action={archiveAuditFolder}>
                    <input type="hidden" name="audit_folder_id" value={folder.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      className="h-9 w-full rounded-3xl border-slate-400 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:h-10 sm:w-auto sm:text-base"
                    >
                      Архівувати папку
                    </Button>
                  </form>
                ) : null}
                {!folderArchived ? (
                  <Link
                    href={`/editor/folders/${folder.id}/new`}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-3xl border border-black/10 bg-[#e8d773] px-4 text-sm font-semibold text-black hover:bg-[#dcca64] sm:h-10 sm:text-base"
                  >
                    + Додати
                  </Link>
                ) : null}
              </div>
            </div>

            <div className={dataTableWrapClassName()}>
              <table className={dataTableClassName("min-w-[960px]")}>
                <thead className={dataTable.thead}>
                  <tr className={dataTable.headRow}>
                    <TableSortableTh
                      label="№"
                      column="number"
                      sort={sort}
                      defaults={editorSortDefaults}
                      pathname={folderPath}
                      preserveParams={preserveParams}
                      className="w-12"
                      align="center"
                    />
                    <th className={cn(dataTable.th, "min-w-[11rem]")}>Виявлені недоліки</th>
                    <th className={cn(dataTable.th, "min-w-[11rem]")}>Зміст рекомендації</th>
                    <TableSortableTh
                      label="Значущість"
                      column="significance"
                      sort={sort}
                      defaults={editorSortDefaults}
                      pathname={folderPath}
                      preserveParams={preserveParams}
                      className="w-28"
                    />
                    <TableSortableTh
                      label="Статус виконання"
                      column="status"
                      sort={sort}
                      defaults={editorSortDefaults}
                      pathname={folderPath}
                      preserveParams={preserveParams}
                      className="w-40"
                      align="center"
                    />
                    <TableSortableTh
                      label="Відповідальний ССП"
                      column="sspUnit"
                      sort={sort}
                      defaults={editorSortDefaults}
                      pathname={folderPath}
                      preserveParams={preserveParams}
                      className="w-40"
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {filteredRecommendations.length === 0 ? (
                    <tr className={dataTable.bodyRow}>
                      <td colSpan={6} className={dataTable.emptyCell}>
                        {searchQuery
                          ? "За вашим запитом рекомендацій не знайдено."
                          : "У цій папці ще немає рекомендацій."}
                      </td>
                    </tr>
                  ) : (
                    filteredRecommendations.map((item) => (
                      <EditorRecommendationTableRow
                        key={item.id}
                        href={
                          item.status === "draft"
                            ? `/editor/folders/${folder.id}/recommendations/${item.id}/edit`
                            : `/editor/folders/${folder.id}/recommendations/${item.id}`
                        }
                      >
                        <EditorRecommendationTableCell className="w-12 p-3 text-center" align="center">
                          {item.sequenceNumber}
                        </EditorRecommendationTableCell>
                        <EditorRecommendationTableCell className="min-w-[11rem] p-3">
                          {item.deficiency}
                        </EditorRecommendationTableCell>
                        <EditorRecommendationTableCell className="min-w-[11rem] p-3">
                          {item.recommendationText}
                        </EditorRecommendationTableCell>
                        <EditorRecommendationTableCell className="w-28 p-3">
                          {item.observationSignificance}
                        </EditorRecommendationTableCell>
                        <EditorRecommendationTableCell className="w-40 p-3" align="center">
                          <div className="flex justify-center">
                            <RecommendationStatusBadge
                              status={item.status}
                              label={editorWorkspaceStatusLabel(item.status)}
                            />
                          </div>
                        </EditorRecommendationTableCell>
                        <EditorRecommendationTableCell className="w-40 p-3" align="center">
                          {item.sspUnit}
                        </EditorRecommendationTableCell>
                      </EditorRecommendationTableRow>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
