import { Suspense } from "react";

import { EditorAuditFolderCard } from "@/components/editor/editor-audit-folder-card";
import { EditorFolderActions } from "@/components/editor/editor-folder-actions";
import { ReportsLibraryFilters } from "@/components/reports-library-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; row?: string; q?: string; year?: string; ok?: string }>;
}) {
  const profile = await requireRole(["editor"]);
  const query = await searchParams;
  const errorRow = query.row ? ` (рядок ${query.row})` : "";
  const currentYear = new Date().getFullYear();
  const titleQuery = (query.q ?? "").trim();
  const yearRaw = Number(query.year);
  const yearFilter = Number.isFinite(yearRaw) ? yearRaw : null;

  const folders = await db.auditFolder.findMany({
    where: { createdById: profile.id },
    include: {
      recommendations: {
        where: { isActive: true, status: { not: "ssp_draft" } },
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const availableYears = Array.from(new Set(folders.map((folder) => folder.year))).sort((a, b) => b - a);
  const normalizedTitleQuery = titleQuery.toLowerCase();
  const filteredFolders = folders.filter((folder) => {
    if (yearFilter != null && folder.year !== yearFilter) return false;
    if (!normalizedTitleQuery) return true;
    return folder.title.toLowerCase().includes(normalizedTitleQuery);
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-5xl font-semibold">Простір Редактора</h1>
        <EditorFolderActions
          currentYear={currentYear}
          error={query.error ?? null}
          errorRow={errorRow}
        />
      </div>

      {query.ok === "folder_created" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-base text-emerald-900">
          Папку аудиту створено.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Мої папки аудиту</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Suspense
            fallback={
              <div className="flex w-full flex-col gap-2 rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:flex-row sm:items-center sm:p-3.5">
                <div className="h-9 min-w-0 flex-1 rounded-3xl border bg-white sm:h-10" />
                <div className="h-9 w-full rounded-3xl border bg-white sm:h-10 sm:w-40" />
              </div>
            }
          >
            <ReportsLibraryFilters years={availableYears} />
          </Suspense>
          {filteredFolders.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {normalizedTitleQuery || yearFilter != null
                ? "За обраними фільтрами папок не знайдено."
                : "Папок аудиту ще немає."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredFolders.map((folder) => (
                <EditorAuditFolderCard key={folder.id} folder={folder} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
