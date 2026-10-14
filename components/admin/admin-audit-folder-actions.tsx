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

const createErrorKeys = new Set(["invalid_folder", "invalid_year"]);
const importErrorKeys = new Set([
  "import_no_file",
  "import_invalid_format",
  "import_invalid_year",
  "import_parse_failed",
  "import_no_rows",
  "import_empty_workbook",
  "import_invalid_deadline",
]);

const yellowButtonClass =
  "rounded-3xl border border-black/10 bg-[#e8d773] px-4 text-sm font-semibold text-black hover:bg-[#dcca64] sm:text-base";

const yearSelectClassName = cn(
  "flex h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm",
);

type AdminAuditFolderActionsProps = {
  error?: string | null;
};

/** Кнопки створення/імпорту папки аудиту з модальними формами. */
export function AdminAuditFolderActions({ error = null }: AdminAuditFolderActionsProps) {
  const [createOpen, setCreateOpen] = useState(() => Boolean(error && createErrorKeys.has(error)));
  const [importOpen, setImportOpen] = useState(() => Boolean(error && importErrorKeys.has(error)));
  const currentYear = new Date().getFullYear();
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
        <DialogContent
          className="gap-5 p-5 sm:max-w-md sm:p-6"
          overlayClassName="bg-black/45 backdrop-blur-[1px]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Створення папки аудиту</DialogTitle>
          </DialogHeader>
          <form action={adminCreateAuditFolder} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Назва
                <span className="ml-1 font-semibold text-destructive" title="Обов’язкове поле">
                  *
                </span>
              </Label>
              <Input id="title" name="title" required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">
                Рік
                <span className="ml-1 font-semibold text-destructive" title="Обов’язкове поле">
                  *
                </span>
              </Label>
              <select
                id="year"
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
            {error === "invalid_folder" ? (
              <p className="text-sm text-red-600">Вкажіть коректну назву папки.</p>
            ) : null}
            {error === "invalid_year" ? (
              <p className="text-sm text-red-600">
                Рік папки аудиту не може бути більшим за поточний ({currentYear}). Майбутній рік
                зберегти не можна.
              </p>
            ) : null}
            <Button type="submit" className={cn("h-10 w-full sm:w-auto", yellowButtonClass)}>
              Створити папку
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent
          className="min-w-0 gap-5 overflow-x-hidden p-5 sm:max-w-md sm:p-6"
          overlayClassName="bg-black/45 backdrop-blur-[1px]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Імпорт папки аудиту</DialogTitle>
          </DialogHeader>
          <form
            action={adminImportAuditFolderFromXlsx}
            className="min-w-0 max-w-full space-y-4"
            encType="multipart/form-data"
          >
            <div className="min-w-0 max-w-full space-y-1.5">
              <Label htmlFor="admin-import-file">
                Файл таблиці (.xlsx)
                <span className="ml-1 font-semibold text-destructive" title="Обов’язкове поле">
                  *
                </span>
              </Label>
              <ImportFileInput
                id="admin-import-file"
                name="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </div>
            <div className="min-w-0 max-w-full space-y-1.5">
              <Label htmlFor="admin-import-year">
                Рік
                <span className="ml-1 font-semibold text-destructive" title="Обов’язкове поле">
                  *
                </span>
              </Label>
              <select
                id="admin-import-year"
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
            <p className="text-xs text-muted-foreground">
              Можна завантажувати повні та неповні звіти. Неповний звіт не вважається завершеним
              автоматично.
            </p>
            {error === "import_no_file" ? (
              <p className="text-sm text-red-600">Оберіть файл XLSX для імпорту.</p>
            ) : null}
            {error === "import_invalid_format" ? (
              <p className="text-sm text-red-600">Підтримується лише формат .xlsx.</p>
            ) : null}
            {error === "import_invalid_year" ? (
              <p className="text-sm text-red-600">
                Рік імпортованої папки не може бути більшим за поточний ({currentYear}). Майбутній рік
                зберегти не можна.
              </p>
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
            <Button type="submit" className={cn("h-10 w-full sm:w-auto", yellowButtonClass)}>
              Завантажити звіт
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
