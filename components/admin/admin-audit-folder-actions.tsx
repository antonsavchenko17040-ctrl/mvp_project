"use client";

import { useState } from "react";

import {
  adminCreateAuditFolder,
  adminImportAuditFolderFromXlsx,
} from "@/app/(portal)/(admin)/admin/actions";
import { ImportFileInput } from "@/components/import-file-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const createErrorKeys = new Set(["invalid_folder"]);
const importErrorKeys = new Set([
  "import_no_file",
  "import_invalid_format",
  "import_invalid_year",
  "import_parse_failed",
  "import_no_rows",
  "import_empty_workbook",
  "import_invalid_deadline",
  "import_editor_only",
]);

const yellowButtonClass =
  "rounded-3xl border border-black/10 bg-[#e8d773] px-4 text-sm font-semibold text-black hover:bg-[#dcca64] sm:text-base";

type AdminAuditFolderActionsProps = {
  error?: string | null;
};

/** Кнопки створення/імпорту папки аудиту з модальними формами (поля без змін). */
export function AdminAuditFolderActions({ error = null }: AdminAuditFolderActionsProps) {
  const [createOpen, setCreateOpen] = useState(() => Boolean(error && createErrorKeys.has(error)));
  const [importOpen, setImportOpen] = useState(() => Boolean(error && importErrorKeys.has(error)));
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <Button
          type="button"
          className={cn("h-9 sm:h-10", yellowButtonClass)}
          onClick={() => setCreateOpen(true)}
        >
          + Створити папку
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-3xl border-black/15 bg-white px-4 text-sm font-semibold sm:h-10 sm:text-base"
          onClick={() => setImportOpen(true)}
        >
          Імпорт папки
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="gap-5 p-5 sm:max-w-md sm:p-6"
          overlayClassName="bg-black/45 backdrop-blur-[1px]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Створення папки аудиту</DialogTitle>
          </DialogHeader>
          <form action={adminCreateAuditFolder} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Назва</Label>
              <Input id="title" name="title" required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Рік</Label>
              <Input
                id="year"
                name="year"
                type="number"
                defaultValue={currentYear}
                required
                className="h-10"
              />
            </div>
            {error === "invalid_folder" ? (
              <p className="text-sm text-red-600">Вкажіть коректну назву та рік папки.</p>
            ) : null}
            <Button type="submit" className={cn("h-10 w-full sm:w-auto", yellowButtonClass)}>
              Створити папку
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent
          className="gap-5 p-5 sm:max-w-md sm:p-6"
          overlayClassName="bg-black/45 backdrop-blur-[1px]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Імпорт повністю заповненого звіту з XLSX
            </DialogTitle>
          </DialogHeader>
          <form
            action={adminImportAuditFolderFromXlsx}
            className="space-y-4"
            encType="multipart/form-data"
          >
            <div className="space-y-1.5">
              <Label htmlFor="admin-import-file">Файл таблиці (.xlsx)</Label>
              <ImportFileInput
                id="admin-import-file"
                name="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-import-year">Рік</Label>
              <Input
                id="admin-import-year"
                name="year"
                type="number"
                defaultValue={currentYear}
                required
                className="h-10"
              />
            </div>
            {error === "import_no_file" ? (
              <p className="text-sm text-red-600">Оберіть файл XLSX для імпорту.</p>
            ) : null}
            {error === "import_invalid_format" ? (
              <p className="text-sm text-red-600">Підтримується лише формат .xlsx.</p>
            ) : null}
            {error === "import_invalid_year" ? (
              <p className="text-sm text-red-600">Вкажіть коректний рік звіту.</p>
            ) : null}
            {error === "import_parse_failed" ? (
              <p className="text-sm text-red-600">Не вдалося прочитати файл. Перевірте формат таблиці.</p>
            ) : null}
            {error === "import_no_rows" ? (
              <p className="text-sm text-red-600">У файлі не знайдено рядків з рекомендаціями.</p>
            ) : null}
            {error === "import_empty_workbook" ? (
              <p className="text-sm text-red-600">Файл не містить аркушів.</p>
            ) : null}
            {error === "import_invalid_deadline" ? (
              <p className="text-sm text-red-600">Некоректний термін виконання у файлі.</p>
            ) : null}
            {error === "import_editor_only" ? (
              <p className="text-sm text-red-600">Неповністю заповнені звіти завантажує редактор.</p>
            ) : null}
            <Button type="submit" className={cn("h-10 w-full sm:w-auto", yellowButtonClass)}>
              Завантажити звіт
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
