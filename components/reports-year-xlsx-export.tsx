"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ReportsYearXlsxExportProps = {
  years: number[];
  className?: string;
};

/** Зведений Excel усіх звітів за вибраний рік (поточний рік недоступний). */
export function ReportsYearXlsxExport({ years, className }: ReportsYearXlsxExportProps) {
  const sortedYears = useMemo(() => [...years].sort((a, b) => b - a), [years]);

  if (sortedYears.length === 0) return null;

  return (
    <form
      action="/reports/export/year"
      method="get"
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:flex-row sm:items-end sm:p-3.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <Label htmlFor="reports-year-export" className="mb-1.5 block text-sm font-medium">
          Зведений Excel за рік
        </Label>
        <select
          id="reports-year-export"
          name="year"
          required
          defaultValue=""
          className="flex h-9 w-full rounded-3xl border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 md:text-sm"
        >
          <option value="">Не обрано</option>
          {sortedYears.map((optionYear) => (
            <option key={optionYear} value={optionYear}>
              {optionYear}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" className="h-9 shrink-0 rounded-3xl sm:h-10">
        <Download data-icon="inline-start" />
        Скачати зведений XLSX
      </Button>
    </form>
  );
}
