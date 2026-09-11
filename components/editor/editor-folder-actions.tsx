"use client";

import { useState } from "react";

import { createAuditFolder, importAuditFolderFromXlsx } from "@/app/(portal)/(editor)/editor/actions";
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

const createErrorKeys = new Set(["invalid_year"]);
const importErrorKeys = new Set([
  "import_no_file",
  "import_invalid_format",
  "import_invalid_year",
  "import_parse_failed",
  "import_no_rows",
  "import_empty_workbook",
  "import_invalid_deadline",
  "import_admin_only",
]);

const yellowButtonClass =
  "rounded-3xl border border-black/10 bg-[#e8d773] px-4 text-sm font-semibold text-black hover:bg-[#dcca64] sm:text-base";

const yearSelectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm",
);

type EditorFolderActionsProps = {
  currentYear: number;
  error?: string | null;
  errorRow?: string;
};

export function EditorFolderActions({ currentYear, error = null, errorRow = "" }: EditorFolderActionsProps) {
  const [createOpen, setCreateOpen] = useState(() => Boolean(error && createErrorKeys.has(error)));
  const [importOpen, setImportOpen] = useState(() => Boolean(error && importErrorKeys.has(error)));

  const yearOptions = Array.from({ length: currentYear - 1999 }, (_, index) => currentYear - index);

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
        <DialogContent className="gap-5 p-5 sm:max-w-md sm:p-6" overlayClassName="bg-black/45 backdrop-blur-[1px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Створення папки</DialogTitle>
          </DialogHeader>
          <form action={createAuditFolder} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editor-create-title">Назва папки</Label>
              <Input
                id="editor-create-title"
                name="title"
                placeholder="Назва папки"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editor-create-year">Рік</Label>
              <select
                id="editor-create-year"
                name="year"
                required
                defaultValue={currentYear}
                className={yearSelectClassName}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {error === "invalid_year" ? (
              <p className="text-sm text-red-600">
                Рік папки аудиту не може бути більшим за поточний ({currentYear}).
              </p>
            ) : null}
            <Button type="submit" className={cn("h-10 w-full sm:w-auto", yellowButtonClass)}>
              Створити
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="gap-5 p-5 sm:max-w-md sm:p-6" overlayClassName="bg-black/45 backdrop-blur-[1px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Імпорт папки</DialogTitle>
          </DialogHeader>
          <form action={importAuditFolderFromXlsx} className="space-y-4" encType="multipart/form-data">
            <div className="space-y-1.5">
              <Label htmlFor="editor-import-file">Файл таблиці (.xlsx)</Label>
              <ImportFileInput
                id="editor-import-file"
                name="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editor-import-year">Рік</Label>
              <select
                id="editor-import-year"
                name="year"
                required
                defaultValue=""
                className={yearSelectClassName}
              >
                <option value="">Не обрано</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
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
              <p className="text-sm text-red-600">Некоректний термін виконання{errorRow}.</p>
            ) : null}
            {error === "import_admin_only" ? (
              <p className="text-sm text-red-600">
                Повністю заповнені звіти може завантажувати лише адміністратор.
              </p>
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
