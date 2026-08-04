import {
  formatSupplementDay,
  isAppendFieldKey,
  isReplaceFieldKey,
  type SupplementHistoryItem,
} from "@/lib/editor/recommendation-supplements";
import {
  isSspAppendFieldKey,
  isSspReplaceFieldKey,
} from "@/lib/ssp/recommendation-supplements";

export type ExportFieldKey =
  | "vkElement"
  | "deficiency"
  | "recommendationText"
  | "executionIndicator"
  | "expectedResult"
  | "sspUnit"
  | "deadline"
  | "informingDeadline"
  | "progressReport"
  | "actualImplementationDate"
  | "measuresDescription"
  | "expectedAchievement"
  | "supportingDocuments"
  | "sspNotes";

export type FieldDisplayBlock = {
  chunk: string;
  changeReason?: string;
  changeDateLabel?: string;
};

function compactDisplayText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

function isAppendKey(fieldKey: string): boolean {
  return isAppendFieldKey(fieldKey) || isSspAppendFieldKey(fieldKey);
}

function isReplaceKey(fieldKey: string): boolean {
  return isReplaceFieldKey(fieldKey) || isSspReplaceFieldKey(fieldKey);
}

function formatDisplayChunk(fieldKey: string, content: string): string {
  const text = compactDisplayText(content);
  if (!text) return "—";
  if (
    fieldKey === "deadline" ||
    fieldKey === "informingDeadline" ||
    fieldKey === "actualImplementationDate"
  ) {
    return formatSupplementDay(text);
  }
  return text;
}

/**
 * Блоки тексту поля з історією змін (як у UI):
 * базове значення + доповнення з причиною/датою.
 */
export function buildFieldDisplayBlocks(
  fieldKey: ExportFieldKey,
  currentValue: string,
  supplements: SupplementHistoryItem[],
): FieldDisplayBlock[] {
  if (!isAppendKey(fieldKey) && !isReplaceKey(fieldKey)) {
    const current = compactDisplayText(currentValue);
    return current ? [{ chunk: formatDisplayChunk(fieldKey, current) }] : [];
  }

  const items = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime());

  if (items.length === 0) {
    const current = compactDisplayText(currentValue);
    return current ? [{ chunk: formatDisplayChunk(fieldKey, current) }] : [];
  }

  const blocks: FieldDisplayBlock[] = [];
  const baseRaw = compactDisplayText(items[0].previousContent ?? "");
  if (baseRaw) {
    blocks.push({ chunk: formatDisplayChunk(fieldKey, baseRaw) });
  }

  for (const item of items) {
    const previous = compactDisplayText(item.previousContent ?? "");
    const content = compactDisplayText(item.content);
    let chunk: string | null = null;

    if (isReplaceKey(fieldKey)) {
      const legacyReplace = !previous;
      const shownNew = legacyReplace ? "" : content;
      if (shownNew) chunk = formatDisplayChunk(fieldKey, shownNew);
      else if (legacyReplace && content) chunk = formatDisplayChunk(fieldKey, content);
    } else {
      chunk = formatDisplayChunk(fieldKey, item.content);
    }

    if (!chunk) continue;
    blocks.push({
      chunk,
      changeReason: compactDisplayText(item.changeReason ?? "") || "—",
      changeDateLabel: formatSupplementDay(item.changeDate),
    });
  }

  return blocks;
}
