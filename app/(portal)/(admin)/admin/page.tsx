import { AdminAuditFolderRow } from "@/components/admin/admin-audit-folder-row";
import { AdminRecommendationRow } from "@/components/admin/admin-recommendation-row";
import { ImportFileInput } from "@/components/import-file-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canArchiveFolderByRecommendations } from "@/lib/audit-folder-archive";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import { dataTable, dataTableClassName, dataTableWrapClassName } from "@/lib/ui/data-table";
import Link from "next/link";

import {
  adminArchiveAuditFolder,
  adminCreateAuditFolder,
  adminImportAuditFolderFromXlsx,
  hardDeleteAuditFolder,
  hardDeleteRecommendation,
} from "./actions";

const adminListErrors: Record<string, string> = {
  missing_recommendation: "Не вказано рекомендацію.",
  recommendation_not_found: "Рекомендацію не знайдено.",
  invalid_folder: "Вкажіть коректну назву та рік папки.",
  folder_not_found: "Папку аудиту не знайдено.",
  import_no_file: "Оберіть файл XLSX для імпорту.",
  import_invalid_format: "Підтримується лише формат .xlsx.",
  import_invalid_year: "Вкажіть коректний рік звіту.",
  import_parse_failed: "Не вдалося прочитати файл. Перевірте формат таблиці.",
  import_no_rows: "У файлі не знайдено рядків з рекомендаціями.",
  import_empty_workbook: "Файл не містить аркушів.",
  import_invalid_deadline: "Некоректний термін виконання у файлі.",
  import_editor_only: "Неповністю заповнені звіти завантажує редактор.",
  already_archived: "Папку вже завершено.",
  cannot_archive_incomplete: "Завершити можна лише папку, де всі активні рекомендації виконані.",
};

const adminListOk: Record<string, string> = {
  folder_created: "Папку аудиту створено.",
  recommendation_created: "Рекомендацію створено.",
  published: "Рекомендацію верифіковано.",
  deactivated: "Рекомендацію деактивовано.",
  imported: "Повністю заповнений звіт імпортовано. Завершіть його вручну, коли будете готові.",
  archived: "Папку аудиту завершено.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; folder?: string }>;
}) {
  await requireRole(["admin"]);
  const query = await searchParams;
  const listError = query.error && adminListErrors[query.error] ? adminListErrors[query.error] : null;
  const listOk = query.ok && adminListOk[query.ok] ? adminListOk[query.ok] : null;
  const selectedFolderId = String(query.folder ?? "").trim();

  const auditFolders = await db.auditFolder.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      archivedAt: true,
      _count: { select: { recommendations: true } },
      createdBy: { select: { email: true, fullName: true } },
      recommendations: {
        where: { isActive: true },
        select: { status: true, isActive: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const selectedFolder = selectedFolderId
    ? auditFolders.find((folder) => folder.id === selectedFolderId) ??
      (await db.auditFolder.findUnique({
        where: { id: selectedFolderId },
        select: { id: true, title: true, year: true, archivedAt: true },
      }))
    : null;

  const recommendations = selectedFolder
    ? await db.recommendation.findMany({
        where: { auditFolderId: selectedFolder.id },
        select: {
          id: true,
          vkElement: true,
          observationSignificance: true,
          recommendationText: true,
          status: true,
          progressReport: true,
          isActive: true,
        },
        orderBy: recommendationSequenceOrderBy,
      })
    : [];

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold">Робочий стіл адміністратора</h1>

      <p>
        <Link
          href="/admin/audit-log"
          className="text-base font-semibold text-sky-800 hover:underline"
        >
          Перегляд повного Audit Log (історії змін) →
        </Link>
      </p>

      {listError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-base text-destructive">
          {listError}
        </p>
      ) : null}
      {listOk ? (
        <p className="rounded-md border border-emerald-600/30 bg-emerald-50 p-3 text-base text-emerald-800">
          {listOk}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Створення папки аудиту</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={adminCreateAuditFolder} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="title">Назва</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="year">Рік</Label>
              <Input id="year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
            </div>
            <Button type="submit" className="md:col-span-3 w-fit">
              Створити папку
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Імпорт повністю заповненого звіту з XLSX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Завантажуйте лише повністю заповнені звіти. Після імпорту статус «Завершено» не
            виставляється автоматично — завершіть папку вручну нижче.
          </p>
          <form
            action={adminImportAuditFolderFromXlsx}
            className="grid gap-3 md:grid-cols-3"
            encType="multipart/form-data"
          >
            <div className="md:col-span-2">
              <Label htmlFor="admin-import-file">Файл таблиці (.xlsx)</Label>
              <ImportFileInput
                id="admin-import-file"
                name="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-import-year">Рік</Label>
              <Input
                id="admin-import-year"
                name="year"
                type="number"
                defaultValue={new Date().getFullYear()}
                required
              />
            </div>
            <Button type="submit" className="md:col-span-3 w-fit">
              Завантажити звіт
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Папки аудиту</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-base text-muted-foreground">
            Натисніть на рядок папки, щоб відкрити її рекомендації. Також можна додати рекомендацію або видалити
            папку разом із усіма рекомендаціями (каскадно).
          </p>
          <div className={dataTableWrapClassName()}>
            <table className={dataTableClassName("min-w-[720px]")}>
              <thead className={dataTable.thead}>
                <tr className={dataTable.headRow}>
                  <th className={dataTable.th}>Назва</th>
                  <th className={dataTable.th}>Рік</th>
                  <th className={dataTable.th}>Автор</th>
                  <th className={dataTable.th}>Рекомендацій</th>
                  <th className={dataTable.th}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {auditFolders.length === 0 ? (
                  <tr className={dataTable.bodyRow}>
                    <td className={dataTable.emptyCell} colSpan={5}>
                      Папок аудиту ще немає.
                    </td>
                  </tr>
                ) : (
                  auditFolders.map((folder) => {
                    const canComplete =
                      !folder.archivedAt && canArchiveFolderByRecommendations(folder.recommendations);
                    return (
                    <AdminAuditFolderRow
                      key={folder.id}
                      id={folder.id}
                      title={folder.title}
                      year={folder.year}
                      authorEmail={folder.createdBy.email}
                      authorFullName={folder.createdBy.fullName}
                      recommendationsCount={folder._count.recommendations}
                      archivedAt={folder.archivedAt}
                      selected={selectedFolder?.id === folder.id}
                      actions={
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/folders/${folder.id}/new`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-base font-medium hover:bg-muted"
                          >
                            Додати рекомендацію
                          </Link>
                          {canComplete ? (
                            <form action={adminArchiveAuditFolder}>
                              <input type="hidden" name="audit_folder_id" value={folder.id} />
                              <Button type="submit" variant="outline">
                                Завершити
                              </Button>
                            </form>
                          ) : null}
                          <form action={hardDeleteAuditFolder}>
                            <input type="hidden" name="audit_folder_id" value={folder.id} />
                            <Button type="submit" variant="destructive">
                              Видалити папку
                            </Button>
                          </form>
                        </div>
                      }
                    />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedFolder ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span>
                Критичні операції з рекомендаціями — {selectedFolder.title} ({selectedFolder.year})
              </span>
              {selectedFolder.archivedAt ? (
                <span className="rounded-full border border-slate-400/70 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  Завершено
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={dataTableWrapClassName()}>
              <table className={dataTableClassName("min-w-[1100px]")}>
                <thead className={dataTable.thead}>
                  <tr className={dataTable.headRow}>
                    <th className={dataTable.th}>Елемент ВК</th>
                    <th className={dataTable.th}>Рекомендація</th>
                    <th className={`${dataTable.th} whitespace-nowrap`}>Значущість спостереження</th>
                    <th className={`${dataTable.th} whitespace-nowrap`}>Стан</th>
                    <th className={`${dataTable.th} whitespace-nowrap`}>Стан виконання</th>
                    <th className={dataTable.th}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.length === 0 ? (
                    <tr className={dataTable.bodyRow}>
                      <td className={dataTable.emptyCell} colSpan={6}>
                        У цій папці ще немає рекомендацій.
                      </td>
                    </tr>
                  ) : (
                    recommendations.map((item) => (
                      <AdminRecommendationRow
                        key={item.id}
                        id={item.id}
                        vkElement={item.vkElement}
                        recommendationText={item.recommendationText}
                        observationSignificance={item.observationSignificance}
                        status={item.status}
                        progressReport={item.progressReport}
                        isActive={item.isActive}
                        actions={
                          <form action={hardDeleteRecommendation}>
                            <input type="hidden" name="recommendation_id" value={item.id} />
                            <Button type="submit" variant="destructive">
                              Видалити
                            </Button>
                          </form>
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
