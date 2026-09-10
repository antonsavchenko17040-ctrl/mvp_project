import { Suspense } from "react";

import { EditorAuditFolderCard } from "@/components/editor/editor-audit-folder-card";
import { ReportsLibraryFilters } from "@/components/reports-library-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

import { createAuditFolder, importAuditFolderFromXlsx } from "./actions";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; row?: string; q?: string; year?: string }>;
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
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-semibold">Простір Редактора</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Створення папки аудиту</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAuditFolder} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="title">Назва</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="year">Рік</Label>
              <Input
                id="year"
                name="year"
                type="number"
                defaultValue={currentYear}
                min={2000}
                max={currentYear}
                required
              />
            </div>
            <Button type="submit" className="md:col-span-3 w-fit bg-[#e8d773] text-black hover:bg-[#dcca64]">
              Створити папку
            </Button>
          </form>
          {query.error === "invalid_year" ? (
            <p className="mt-3 text-sm text-red-600">
              Рік папки аудиту не може бути більшим за поточний ({currentYear}).
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Імпорт звіту з XLSX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={importAuditFolderFromXlsx} className="grid gap-3 md:grid-cols-3" encType="multipart/form-data">
            <div className="md:col-span-2">
              <Label htmlFor="import-file">Файл таблиці (.xlsx)</Label>
              <Input id="import-file" name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
            </div>
            <div>
              <Label htmlFor="import-year">Рік</Label>
              <Input id="import-year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
            </div>
            <Button type="submit" className="md:col-span-3 w-fit bg-[#e8d773] text-black hover:bg-[#dcca64]">
              Завантажити звіт
            </Button>
          </form>
          {query.error === "import_no_file" ? (
            <p className="text-sm text-red-600">Оберіть файл XLSX для імпорту.</p>
          ) : null}
          {query.error === "import_invalid_format" ? (
            <p className="text-sm text-red-600">Підтримується лише формат .xlsx.</p>
          ) : null}
          {query.error === "import_invalid_year" ? (
            <p className="text-sm text-red-600">Вкажіть коректний рік звіту.</p>
          ) : null}
          {query.error === "import_parse_failed" ? (
            <p className="text-sm text-red-600">Не вдалося прочитати файл. Перевірте формат таблиці.</p>
          ) : null}
          {query.error === "import_no_rows" ? (
            <p className="text-sm text-red-600">У файлі не знайдено рядків з рекомендаціями.</p>
          ) : null}
          {query.error === "import_empty_workbook" ? (
            <p className="text-sm text-red-600">Файл не містить аркушів.</p>
          ) : null}
          {query.error === "import_invalid_deadline" ? (
            <p className="text-sm text-red-600">Некоректний термін виконання{errorRow}.</p>
          ) : null}
          {query.error === "import_admin_only" ? (
            <p className="text-sm text-red-600">
              Повністю заповнені звіти може завантажувати лише адміністратор.
            </p>
          ) : null}
        </CardContent>
      </Card>

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
