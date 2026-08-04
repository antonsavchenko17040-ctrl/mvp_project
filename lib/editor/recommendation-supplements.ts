export const SUPPLEMENT_FIELD_KEYS = [
  "vkElement",
  "observationSignificance",
  "deficiency",
  "recommendationText",
  "executionIndicator",
  "expectedResult",
  "sspUnit",
  "deadline",
  "informingDeadline",
  "changeReason",
] as const;

export type SupplementFieldKey = (typeof SUPPLEMENT_FIELD_KEYS)[number];

export const SUPPLEMENT_FIELD_LABELS: Record<SupplementFieldKey, string> = {
  vkElement: "Елемент ВК",
  observationSignificance: "Значущість спостереження",
  deficiency: "Недоліки, проблеми та порушення (точки зростання)",
  recommendationText: "Надані аудиторські рекомендації",
  executionIndicator: "Індикатор виконання рекомендацій (захід / документ)",
  expectedResult: "Очікуваний результат від впровадження рекомендацій",
  sspUnit: "Відповідальний підрозділ",
  deadline: "Термін виконання",
  informingDeadline: "Строк інформування",
  changeReason: "Причина зміни",
};

/** Текстові поля: нове доповнення додається до поточного значення поля; попереднє зберігається в історії. */
export const APPEND_FIELD_KEYS = [
  "vkElement",
  "deficiency",
  "recommendationText",
  "executionIndicator",
  "expectedResult",
  "changeReason",
] as const satisfies readonly SupplementFieldKey[];

/** Випадаючі списки та дати: попереднє значення блокується в історії, актуальне замінюється. */
export const REPLACE_FIELD_KEYS = [
  "observationSignificance",
  "sspUnit",
  "deadline",
  "informingDeadline",
] as const satisfies readonly SupplementFieldKey[];

export function isAppendFieldKey(key: string): key is (typeof APPEND_FIELD_KEYS)[number] {
  return (APPEND_FIELD_KEYS as readonly string[]).includes(key);
}

export function isReplaceFieldKey(key: string): key is (typeof REPLACE_FIELD_KEYS)[number] {
  return (REPLACE_FIELD_KEYS as readonly string[]).includes(key);
}

export function isSupplementFieldKey(key: string): key is SupplementFieldKey {
  return (SUPPLEMENT_FIELD_KEYS as readonly string[]).includes(key);
}

export function formatSupplementDate(value: Date): string {
  return value.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSupplementDay(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export type SupplementHistoryItem = {
  fieldKey: string;
  content: string;
  previousContent?: string | null;
  changeReason?: string | null;
  changeDate: Date;
};

function compactDisplayText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

/** Структурований вміст append-поля для відображення в UI. */
export type AppendFieldSupplementBlock = {
  chunk: string;
  changeReason: string;
  changeDateLabel: string;
};

export type AppendFieldDisplayContent = {
  base: string;
  supplements: AppendFieldSupplementBlock[];
};

function formatSupplementChunk(fieldKey: SupplementFieldKey, content: string): string {
  const text = compactDisplayText(content);
  if (!text) return "—";
  if (fieldKey === "deadline" || fieldKey === "informingDeadline") {
    return formatSupplementDay(text);
  }
  return text;
}

function resolveReplaceSupplementChunk(
  fieldKey: SupplementFieldKey,
  item: SupplementHistoryItem,
): string | null {
  const previous = compactDisplayText(item.previousContent ?? "");
  const content = compactDisplayText(item.content);
  const legacyReplace = !previous;
  const shownNew = legacyReplace ? "" : content;

  if (shownNew) {
    return formatSupplementChunk(fieldKey, shownNew);
  }
  if (legacyReplace && content) {
    return formatSupplementChunk(fieldKey, content);
  }
  return null;
}

export function buildAppendFieldDisplayContent(
  fieldKey: SupplementFieldKey,
  currentValue: string,
  supplements: SupplementHistoryItem[],
): AppendFieldDisplayContent | null {
  if (!isAppendFieldKey(fieldKey) && !isReplaceFieldKey(fieldKey)) return null;

  const items = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime());

  if (items.length === 0) return null;

  const baseRaw = compactDisplayText(items[0].previousContent ?? "");
  const base = baseRaw ? formatSupplementChunk(fieldKey, baseRaw) : "";

  const supplementBlocks = items
    .map((item) => {
      const chunk = isReplaceFieldKey(fieldKey)
        ? resolveReplaceSupplementChunk(fieldKey, item)
        : formatSupplementChunk(fieldKey, item.content);
      if (!chunk) return null;
      return {
        chunk,
        changeReason: compactDisplayText(item.changeReason ?? "") || "—",
        changeDateLabel: formatSupplementDay(item.changeDate),
      };
    })
    .filter((block): block is AppendFieldSupplementBlock => block !== null);

  if (!base && supplementBlocks.length === 0) return null;

  return { base, supplements: supplementBlocks };
}

/** Плоский текст append-поля (fallback / експорт). */
export function buildAppendFieldDisplayValue(
  fieldKey: SupplementFieldKey,
  currentValue: string,
  supplements: SupplementHistoryItem[],
): string {
  const content = buildAppendFieldDisplayContent(fieldKey, currentValue, supplements);
  if (!content) return currentValue;

  const parts: string[] = [];
  if (content.base) {
    parts.push(content.base);
  }

  for (const block of content.supplements) {
    parts.push(
      [
        block.chunk,
        `Причина внесення змін: ${block.changeReason}`,
        `Дата внесення змін: ${block.changeDateLabel}`,
      ].join("\n"),
    );
  }

  return parts.length > 0 ? parts.join("\n\n") : currentValue;
}
