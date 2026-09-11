import ExcelJS from "exceljs";

import type { SupplementHistoryItem } from "@/lib/editor/recommendation-supplements";
import {
  buildFieldDisplayBlocks,
  type ExportFieldKey,
} from "@/lib/export/field-display-blocks";
import { recommendationSequenceOrderBy } from "@/lib/recommendation-sequence";
import {
  executionStatusSourceText,
  resolveExecutionStatusLabel,
} from "@/lib/recommendation-execution-status";

export type AuditFolderXlsxRecommendation = {
  sequenceNumber: number;
  vkElement: string;
  deficiency: string;
  recommendationText: string;
  executionIndicator: string;
  expectedResult: string;
  sspUnit: string;
  deadline: Date;
  informingDeadline: Date | null;
  progressReport: string | null;
  actualImplementationDate: Date | null;
  measuresDescription: string | null;
  expectedAchievement: string | null;
  supportingDocuments: string | null;
  sspNotes: string | null;
  fieldSupplements: SupplementHistoryItem[];
};

export type AuditFolderXlsxExportInput = {
  title: string;
  year: number;
  recommendations: AuditFolderXlsxRecommendation[];
};

/** Порядок сортування рядків у XLSX — як у таблицях порталу. */
export const auditFolderXlsxOrderBy = recommendationSequenceOrderBy;

/** Ширини колонок (Excel width). */
const COLUMN_WIDTHS = [
  4.5, // 1 № (мінімум)
  7, // 2 Елемент ВК (мінімум)
  89, // 3 Недоліки…
  88, // 4 Надані аудиторські рекомендації
  48.57, // 5 Індикатор виконання (÷1.5)
  46.19, // 6 Очікуваний результат (÷1.5)
  19.71, // 7 Відповідальний підрозділ
  18, // 8 Термін виконання
  16.86, // 9 Строк інформування
  17.43, // 10 Стан впровадження
  16.86, // 11 Фактична дата
  56.86, // 12 Заходи
  31.29, // 13 Досягнення (= Підтверджуючі документи)
  31.29, // 14 Підтверджуючі документи
  31.29, // 15 Примітки (= Підтверджуючі документи)
] as const;

const thinBorder: ExcelJS.Border = { style: "thin", color: { argb: "FF000000" } };
const allBorders: Partial<ExcelJS.Borders> = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
};

const headerFont: Partial<ExcelJS.Font> = {
  bold: true,
  size: 12,
  name: "Calibri",
};

const headerAlign: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "center",
  wrapText: true,
};

const bodyFont: Partial<ExcelJS.Font> = { name: "Calibri", size: 11 };
/** Менший і світліший текст для причини/дати змін. */
const metaFont: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 9,
  color: { argb: "FF6B7280" },
};

type ColumnSpec =
  | { kind: "number" }
  | { kind: "field"; fieldKey: ExportFieldKey; currentValue: (item: AuditFolderXlsxRecommendation) => string };

function formatDateIsoDay(value: Date | null | undefined): string {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function progressStatusLabel(item: AuditFolderXlsxRecommendation): string {
  return resolveExecutionStatusLabel(
    executionStatusSourceText(item.progressReport, item.executionIndicator),
  );
}

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = { ...allBorders };
}

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { ...headerFont };
  cell.alignment = { ...headerAlign };
  applyBorder(cell);
}

const COLUMN_SPECS: ColumnSpec[] = [
  { kind: "number" },
  { kind: "field", fieldKey: "vkElement", currentValue: (i) => i.vkElement },
  { kind: "field", fieldKey: "deficiency", currentValue: (i) => i.deficiency },
  { kind: "field", fieldKey: "recommendationText", currentValue: (i) => i.recommendationText },
  { kind: "field", fieldKey: "executionIndicator", currentValue: (i) => i.executionIndicator },
  { kind: "field", fieldKey: "expectedResult", currentValue: (i) => i.expectedResult },
  { kind: "field", fieldKey: "sspUnit", currentValue: (i) => i.sspUnit },
  { kind: "field", fieldKey: "deadline", currentValue: (i) => formatDateIsoDay(i.deadline) },
  {
    kind: "field",
    fieldKey: "informingDeadline",
    currentValue: (i) => formatDateIsoDay(i.informingDeadline),
  },
  {
    kind: "field",
    fieldKey: "progressReport",
    currentValue: (i) => {
      const label = progressStatusLabel(i);
      return label === "—" ? (i.progressReport ?? "") : label;
    },
  },
  {
    kind: "field",
    fieldKey: "actualImplementationDate",
    currentValue: (i) => formatDateIsoDay(i.actualImplementationDate),
  },
  { kind: "field", fieldKey: "measuresDescription", currentValue: (i) => i.measuresDescription ?? "" },
  { kind: "field", fieldKey: "expectedAchievement", currentValue: (i) => i.expectedAchievement ?? "" },
  { kind: "field", fieldKey: "supportingDocuments", currentValue: (i) => i.supportingDocuments ?? "" },
  { kind: "field", fieldKey: "sspNotes", currentValue: (i) => i.sspNotes ?? "" },
];

function setCellFromBlocks(
  cell: ExcelJS.Cell,
  blocks: ReturnType<typeof buildFieldDisplayBlocks>,
) {
  if (blocks.length === 0) {
    cell.value = "";
    cell.font = { ...bodyFont };
    return;
  }

  const hasMeta = blocks.some((b) => b.changeReason != null || b.changeDateLabel != null);
  if (!hasMeta && blocks.length === 1) {
    cell.value = blocks[0].chunk;
    cell.font = { ...bodyFont };
    return;
  }

  const richText: ExcelJS.RichText[] = [];
  blocks.forEach((block, index) => {
    if (index > 0) {
      richText.push({ text: "\n\n", font: { ...bodyFont } });
    }
    richText.push({ text: block.chunk, font: { ...bodyFont } });
    if (block.changeReason != null) {
      richText.push({
        text: `\nПричина внесення змін: ${block.changeReason}`,
        font: { ...metaFont },
      });
    }
    if (block.changeDateLabel != null) {
      richText.push({
        text: `\nДата внесення змін: ${block.changeDateLabel}`,
        font: { ...metaFont },
      });
    }
  });

  cell.value = { richText };
}

/** Приблизна кількість рядків тексту з урахуванням переносу в межах ширини колонки. */
function estimateWrappedLines(text: string, columnWidth: number): number {
  const charsPerLine = Math.max(4, Math.floor(columnWidth * 1.05));
  const parts = text.replace(/\r\n/g, "\n").split("\n");
  let lines = 0;
  for (const part of parts) {
    if (!part) {
      lines += 1;
      continue;
    }
    lines += Math.max(1, Math.ceil(part.length / charsPerLine));
  }
  return Math.max(1, lines);
}

function plainTextFromBlocks(blocks: ReturnType<typeof buildFieldDisplayBlocks>): string {
  return blocks
    .map((block) => {
      const lines = [block.chunk];
      if (block.changeReason != null) lines.push(`Причина внесення змін: ${block.changeReason}`);
      if (block.changeDateLabel != null) lines.push(`Дата внесення змін: ${block.changeDateLabel}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/** Висота рядка (pt), щоб вмістився весь текст у всіх комірках. */
function estimateRowHeight(lineCounts: number[]): number {
  const maxLines = Math.max(1, ...lineCounts);
  const lineHeightPt = 15;
  const paddingPt = 6;
  // Максимум Excel для висоти рядка — 409 pt
  return Math.min(409, Math.max(18, maxLines * lineHeightPt + paddingPt));
}

/** Безпечна назва файлу = назва аудиту. */
export function auditFolderExportFilename(title: string): string {
  const safe = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  return `${safe || "zvit"}.xlsx`;
}

/** Назва зведеного файлу за рік. */
export function yearAuditFoldersExportFilename(year: number): string {
  return `Звіти за ${year}.xlsx`;
}

/** Повертає наступний вільний рядок після заголовка звіту. */
function writeSheetTitle(sheet: ExcelJS.Worksheet, startRow: number, title: string): number {
  const titleRow = sheet.getRow(startRow);
  titleRow.getCell(1).value = title;
  sheet.mergeCells(startRow, 1, startRow, 15);
  const titleCell = sheet.getCell(startRow, 1);
  titleCell.font = { bold: true, size: 12, name: "Calibri" };
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  const titleWidth = COLUMN_WIDTHS.reduce((sum, w) => sum + w, 0);
  titleRow.height = estimateRowHeight([estimateWrappedLines(title, titleWidth)]) * 2;
  return startRow + 1;
}

/** Дворівнева шапка таблиці; повертає перший рядок даних. */
function writeSheetHeaders(sheet: ExcelJS.Worksheet, startRow: number): number {
  const headerRow1 = [
    "№",
    "Виявлені недоліки, проблеми та порушення",
    null,
    "Надані аудиторські рекомендації",
    "Показники виконання",
    null,
    "Відповідальний підрозділ",
    "Термін виконання",
    "Строк інформування",
    "Стан впровадження рекомендацій",
    "Фактична дата впровадження",
    "Заходи з впровадження рекомендацій",
    "Досягнення очікуваного результату",
    "Підтверджуючі документи",
    "Примітки",
  ] as const;

  const headerRow2 = [
    null,
    "Елемент ВК",
    "Недоліки, проблеми та порушення (точки зростання)",
    null,
    "Індикатор виконання рекомендацій (захід / документ)",
    "Очікуваний результат від впровадження рекомендацій",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ] as const;

  const topRowIndex = startRow;
  const bottomRowIndex = startRow + 1;
  const topRow = sheet.getRow(topRowIndex);
  const bottomRow = sheet.getRow(bottomRowIndex);
  bottomRow.height = 60;

  for (let col = 1; col <= 15; col++) {
    const v1 = headerRow1[col - 1];
    const v2 = headerRow2[col - 1];
    if (v1 != null) topRow.getCell(col).value = v1;
    if (v2 != null) bottomRow.getCell(col).value = v2;
  }

  sheet.mergeCells(topRowIndex, 1, bottomRowIndex, 1); // A
  sheet.mergeCells(topRowIndex, 2, topRowIndex, 3); // B:C top
  sheet.mergeCells(topRowIndex, 4, bottomRowIndex, 4); // D
  sheet.mergeCells(topRowIndex, 5, topRowIndex, 6); // E:F top
  sheet.mergeCells(topRowIndex, 7, bottomRowIndex, 7); // G
  sheet.mergeCells(topRowIndex, 8, bottomRowIndex, 8); // H
  sheet.mergeCells(topRowIndex, 9, bottomRowIndex, 9); // I
  sheet.mergeCells(topRowIndex, 10, bottomRowIndex, 10); // J
  sheet.mergeCells(topRowIndex, 11, bottomRowIndex, 11); // K
  sheet.mergeCells(topRowIndex, 12, bottomRowIndex, 12); // L
  sheet.mergeCells(topRowIndex, 13, bottomRowIndex, 13); // M
  sheet.mergeCells(topRowIndex, 14, bottomRowIndex, 14); // N
  sheet.mergeCells(topRowIndex, 15, bottomRowIndex, 15); // O

  for (let r = topRowIndex; r <= bottomRowIndex; r++) {
    const row = sheet.getRow(r);
    for (let col = 1; col <= 15; col++) {
      styleHeaderCell(row.getCell(col));
    }
  }

  return bottomRowIndex + 1;
}

function writeRecommendationRow(
  sheet: ExcelJS.Worksheet,
  dataRowIndex: number,
  item: AuditFolderXlsxRecommendation,
) {
  const row = sheet.getRow(dataRowIndex);
  const lineCounts: number[] = [];

  for (let col = 1; col <= 15; col++) {
    const cell = row.getCell(col);
    const spec = COLUMN_SPECS[col - 1];
    const colWidth = COLUMN_WIDTHS[col - 1];

    if (spec.kind === "number") {
      cell.value = item.sequenceNumber;
      cell.font = { ...bodyFont };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      lineCounts.push(1);
    } else {
      const blocks = buildFieldDisplayBlocks(
        spec.fieldKey,
        spec.currentValue(item),
        item.fieldSupplements,
      );
      setCellFromBlocks(cell, blocks);
      cell.alignment = { vertical: "top", wrapText: true };
      lineCounts.push(estimateWrappedLines(plainTextFromBlocks(blocks), colWidth));
    }
    applyBorder(cell);
  }

  row.height = estimateRowHeight(lineCounts);
}

function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Портал моніторингу звітності";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Аркуш1");
  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  return { workbook, sheet };
}

/** Один звіт: назва + шапка + рядки. Повертає наступний вільний рядок. */
function writeAuditFolderSection(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  folder: { title: string; recommendations: AuditFolderXlsxRecommendation[] },
): number {
  let row = writeSheetTitle(sheet, startRow, folder.title);
  row = writeSheetHeaders(sheet, row);
  for (const item of folder.recommendations) {
    writeRecommendationRow(sheet, row, item);
    row += 1;
  }
  return row;
}

/** XLSX за зразком КМУ: назва аудиту + заголовки + історія змін у комірках. */
export async function buildAuditFolderXlsxBuffer(
  input: AuditFolderXlsxExportInput,
): Promise<Buffer> {
  const { workbook, sheet } = createWorkbook();
  writeAuditFolderSection(sheet, 1, {
    title: input.title,
    recommendations: input.recommendations,
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export type YearAuditFolderXlsxExportInput = {
  year: number;
  folders: Array<{
    title: string;
    recommendations: AuditFolderXlsxRecommendation[];
  }>;
};

/**
 * Зведений XLSX за рік: кожен звіт іде один за одним
 * зі своєю назвою та шапкою таблиці (без спільного річного заголовка).
 */
export async function buildYearAuditFoldersXlsxBuffer(
  input: YearAuditFolderXlsxExportInput,
): Promise<Buffer> {
  const { workbook, sheet } = createWorkbook();

  let row = 1;
  for (let index = 0; index < input.folders.length; index += 1) {
    if (index > 0) {
      row += 1; // порожній рядок між звітами
    }
    row = writeAuditFolderSection(sheet, row, input.folders[index]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
