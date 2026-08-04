export type ParsedCellBlock = {
  chunk: string;
  changeReason?: string;
  changeDateLabel?: string;
};

export type FieldImportSupplement = {
  fieldKey: string;
  content: string;
  previousContent: string;
  changeReason: string;
  changeDate: Date;
};

export type FieldImportResult = {
  currentValue: string;
  supplements: FieldImportSupplement[];
};

const REASON_PREFIX = "\nПричина внесення змін:";
const DATE_PREFIX = "\nДата внесення змін:";

function compactText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

/** Розбір комірки на блоки з причиною/датою змін (як у експорті). */
export function parseCellBlocks(raw: string): ParsedCellBlock[] {
  const normalized = compactText(raw);
  if (!normalized) return [];

  return normalized
    .split(/\n\n+/)
    .map((segment) => {
      const reasonIndex = segment.indexOf(REASON_PREFIX);
      const dateIndex = segment.indexOf(DATE_PREFIX);

      let chunk = segment;
      let changeReason: string | undefined;
      let changeDateLabel: string | undefined;

      if (reasonIndex !== -1 || dateIndex !== -1) {
        const metaStart = [reasonIndex, dateIndex]
          .filter((index) => index !== -1)
          .sort((a, b) => a - b)[0];
        chunk = segment.slice(0, metaStart).trim();
      }

      if (reasonIndex !== -1) {
        const afterReason = segment.slice(reasonIndex + REASON_PREFIX.length);
        const reasonEnd = afterReason.indexOf(DATE_PREFIX);
        changeReason = compactText(reasonEnd === -1 ? afterReason : afterReason.slice(0, reasonEnd));
      }

      if (dateIndex !== -1) {
        changeDateLabel = compactText(segment.slice(dateIndex + DATE_PREFIX.length));
      }

      return { chunk, changeReason, changeDateLabel };
    })
    .filter((block) => block.chunk || block.changeReason || block.changeDateLabel);
}

export function parseChangeDateLabel(label: string | undefined): Date {
  const text = compactText(label ?? "");
  if (!text) return new Date();

  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotted) {
    return new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]));
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatStoredDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateCellValue(raw: string): Date | null {
  const text = compactText(raw);
  if (!text || text === "—") return null;

  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const date = new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildFieldImportFromBlocks(
  fieldKey: string,
  blocks: ParsedCellBlock[],
  mode: "append" | "replace" | "replace-date",
): FieldImportResult {
  if (blocks.length === 0) {
    return { currentValue: "", supplements: [] };
  }

  if (mode === "append") {
    const chunks = blocks.map((block) => block.chunk).filter(Boolean);
    const currentValue = chunks.join("\n\n");
    const supplements: FieldImportSupplement[] = [];
    let cumulative = "";

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (index === 0) {
        cumulative = block.chunk;
        continue;
      }
      if (!block.chunk.trim()) continue;

      supplements.push({
        fieldKey,
        content: block.chunk,
        previousContent: cumulative,
        changeReason: block.changeReason?.trim() || "—",
        changeDate: parseChangeDateLabel(block.changeDateLabel),
      });
      cumulative = cumulative.trim() ? `${cumulative.trim()}\n\n${block.chunk}` : block.chunk;
    }

    return { currentValue, supplements };
  }

  const supplements: FieldImportSupplement[] = [];
  let previous = blocks[0].chunk;

  for (let index = 1; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block.chunk.trim()) continue;

    supplements.push({
      fieldKey,
      content: block.chunk,
      previousContent: previous,
      changeReason: block.changeReason?.trim() || "—",
      changeDate: parseChangeDateLabel(block.changeDateLabel),
    });
    previous = block.chunk;
  }

  const lastChunk = blocks[blocks.length - 1].chunk;
  const currentText = blocks.length === 1 ? blocks[0].chunk : lastChunk;

  if (mode === "replace-date") {
    const parsed = parseDateCellValue(currentText);
    return {
      currentValue: parsed ? formatStoredDate(parsed) : "",
      supplements: supplements.map((item) => ({
        ...item,
        content: parseDateCellValue(item.content)
          ? formatStoredDate(parseDateCellValue(item.content)!)
          : item.content,
        previousContent: parseDateCellValue(item.previousContent)
          ? formatStoredDate(parseDateCellValue(item.previousContent)!)
          : item.previousContent,
      })),
    };
  }

  return { currentValue: currentText, supplements };
}
