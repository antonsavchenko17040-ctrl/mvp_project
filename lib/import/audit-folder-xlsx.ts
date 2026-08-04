import ExcelJS from "exceljs";

import type { RecommendationStatus } from "@/lib/types";
import {
  buildFieldImportFromBlocks,
  parseCellBlocks,
  parseDateCellValue,
  type FieldImportSupplement,
} from "@/lib/import/parse-cell-blocks";

export type ParsedImportRecommendation = {
  excelRow: number;
  sequenceNumber: number | null;
  vkElement: string;
  deficiency: string;
  recommendationText: string;
  executionIndicator: string;
  expectedResult: string;
  sspUnit: string;
  deadline: Date | null;
  informingDeadline: Date | null;
  progressReport: string | null;
  actualImplementationDate: Date | null;
  measuresDescription: string | null;
  expectedAchievement: string | null;
  supportingDocuments: string | null;
  sspNotes: string | null;
  observationSignificance: string;
  status: RecommendationStatus;
  supplements: FieldImportSupplement[];
};

export type ParsedAuditFolderXlsx = {
  title: string;
  recommendations: ParsedImportRecommendation[];
};

type ColumnFieldConfig = {
  key: string;
  mode: "append" | "replace" | "replace-date" | "replace-date-optional";
};

const COLUMN_FIELDS: ColumnFieldConfig[] = [
  { key: "vkElement", mode: "append" },
  { key: "deficiency", mode: "append" },
  { key: "recommendationText", mode: "append" },
  { key: "executionIndicator", mode: "append" },
  { key: "expectedResult", mode: "append" },
  { key: "sspUnit", mode: "replace" },
  { key: "deadline", mode: "replace-date" },
  { key: "informingDeadline", mode: "replace-date-optional" },
  { key: "progressReport", mode: "replace" },
  { key: "actualImplementationDate", mode: "replace-date-optional" },
  { key: "measuresDescription", mode: "append" },
  { key: "expectedAchievement", mode: "append" },
  { key: "supportingDocuments", mode: "append" },
  { key: "sspNotes", mode: "append" },
];

/** Індекси колонок J–O у масиві texts (0 = A). */
const EXECUTION_TEXT_INDEXES = [9, 10, 11, 12, 13, 14];

export class AuditFolderXlsxImportError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly row?: number,
  ) {
    super(message);
    this.name = "AuditFolderXlsxImportError";
  }
}

function cellToPlainText(value: ExcelJS.CellValue | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("").trim();
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellToPlainText(value.result as ExcelJS.CellValue);
    if ("formula" in value && "result" in value) {
      return cellToPlainText(value.result as ExcelJS.CellValue);
    }
  }
  return String(value).trim();
}

function readRowTexts(sheet: ExcelJS.Worksheet, rowIndex: number, count = 15): string[] {
  const row = sheet.getRow(rowIndex);
  return Array.from({ length: count }, (_, index) => cellToPlainText(row.getCell(index + 1).value));
}

function rowJoinedText(texts: string[]): string {
  return texts.join(" ").trim();
}

function isHeaderRow(texts: string[]): boolean {
  const joined = rowJoinedText(texts).toLowerCase();
  if (texts[0]?.trim() === "№") return true;
  if (joined.includes("елемент") && joined.includes("вк")) return true;
  if (joined.includes("недоліки") && joined.includes("порушення")) return true;
  if (joined.includes("аудиторські рекомендації")) return true;
  return false;
}

function isKmuExportFormat(sheet: ExcelJS.Worksheet): boolean {
  const row2 = rowJoinedText(readRowTexts(sheet, 2));
  const row3 = rowJoinedText(readRowTexts(sheet, 3));
  return (
    row2.includes("Виявлені недоліки") ||
    row2.includes("Показники виконання") ||
    row3.includes("Елемент ВК")
  );
}

function detectLayout(sheet: ExcelJS.Worksheet): {
  title: string | null;
  dataStartRow: number;
} {
  if (isKmuExportFormat(sheet)) {
    const title = readRowTexts(sheet, 1, 1)[0]?.trim() || null;
    return { title, dataStartRow: 4 };
  }

  const row1 = readRowTexts(sheet, 1);
  if (isHeaderRow(row1)) {
    return { title: null, dataStartRow: 2 };
  }

  const row2 = readRowTexts(sheet, 2);
  if (isHeaderRow(row2)) {
    const title = row1[0]?.trim() || rowJoinedText(row1) || null;
    return { title, dataStartRow: 3 };
  }

  if (looksLikeDataRow(row1)) {
    return { title: null, dataStartRow: 1 };
  }

  const title = row1[0]?.trim() || rowJoinedText(row1) || null;
  return { title, dataStartRow: 2 };
}

function looksLikeDataRow(texts: string[]): boolean {
  const seq = texts[0]?.trim();
  if (seq && /^\d+$/.test(seq)) return true;
  const meaningful = texts.slice(1).some((value) => value.trim() && value.trim() !== "—");
  return meaningful;
}

function isEmptyDataRow(texts: string[]): boolean {
  return texts.every((value) => !value.trim() || value.trim() === "—");
}

function hasExecutionData(texts: string[]): boolean {
  return EXECUTION_TEXT_INDEXES.some((index) => {
    const value = texts[index]?.trim();
    return Boolean(value && value !== "—");
  });
}

function parseSequenceNumber(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.xlsx$/i, "").trim() || "Звіт";
}

function resolveTitle(titleFromSheet: string | null, fallbackTitle: string): string {
  const sheetTitle = titleFromSheet?.trim();
  if (sheetTitle && !isHeaderRow([sheetTitle])) return sheetTitle;
  return fallbackTitle.trim() || "Звіт";
}

export async function parseAuditFolderXlsx(
  buffer: Buffer,
  options: { fallbackTitle: string },
): Promise<ParsedAuditFolderXlsx> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
  buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new AuditFolderXlsxImportError("Файл не містить аркушів.", "import_empty_workbook");
  }

  const layout = detectLayout(sheet);
  const title = resolveTitle(layout.title, options.fallbackTitle);
  const recommendations: ParsedImportRecommendation[] = [];
  let autoSequence = 1;

  for (let rowIndex = layout.dataStartRow; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const texts = readRowTexts(sheet, rowIndex);
    if (isEmptyDataRow(texts)) continue;

    const sequenceNumber = parseSequenceNumber(texts[0] ?? "", autoSequence);
    autoSequence = Math.max(autoSequence, sequenceNumber) + 1;

    const fieldTexts = texts.slice(1);
    const supplements: FieldImportSupplement[] = [];
    const fieldValues: Record<string, string> = {};

    COLUMN_FIELDS.forEach((config, index) => {
      const raw = fieldTexts[index] ?? "";
      const blocks = parseCellBlocks(raw);
      const mode =
        config.mode === "replace-date-optional" ? "replace-date" : config.mode;
      const imported = buildFieldImportFromBlocks(config.key, blocks, mode);
      fieldValues[config.key] = imported.currentValue;
      supplements.push(...imported.supplements);
    });

    const deadline = parseDateCellValue(fieldValues.deadline) ?? parseDateCellValue(fieldTexts[5] ?? "");
    const informingDeadline =
      parseDateCellValue(fieldValues.informingDeadline) ?? parseDateCellValue(fieldTexts[6] ?? "");
    const actualImplementationDate =
      parseDateCellValue(fieldValues.actualImplementationDate) ??
      parseDateCellValue(fieldTexts[9] ?? "");

    const nullable = (value: string | undefined): string | null => {
      const trimmed = value?.trim();
      if (!trimmed || trimmed === "—") return null;
      return trimmed;
    };

    const status: RecommendationStatus = hasExecutionData(texts) ? "published" : "draft";

    recommendations.push({
      excelRow: rowIndex,
      sequenceNumber,
      vkElement: fieldValues.vkElement ?? "",
      deficiency: fieldValues.deficiency ?? "",
      recommendationText: fieldValues.recommendationText ?? "",
      executionIndicator: fieldValues.executionIndicator ?? "",
      expectedResult: fieldValues.expectedResult ?? "",
      sspUnit: fieldValues.sspUnit ?? "",
      deadline,
      informingDeadline,
      progressReport: nullable(fieldValues.progressReport),
      actualImplementationDate,
      measuresDescription: nullable(fieldValues.measuresDescription),
      expectedAchievement: nullable(fieldValues.expectedAchievement),
      supportingDocuments: nullable(fieldValues.supportingDocuments),
      sspNotes: nullable(fieldValues.sspNotes),
      observationSignificance: "—",
      status,
      supplements,
    });
  }

  if (recommendations.length === 0) {
    throw new AuditFolderXlsxImportError(
      "У файлі не знайдено рядків з рекомендаціями.",
      "import_no_rows",
    );
  }

  return { title, recommendations };
}

export function auditFolderTitleFromFilename(filename: string): string {
  return titleFromFilename(filename);
}

export function shouldArchiveImportedFolder(recommendations: ParsedImportRecommendation[]): boolean {
  return recommendations.length > 0 && recommendations.every((item) => item.status === "published");
}
