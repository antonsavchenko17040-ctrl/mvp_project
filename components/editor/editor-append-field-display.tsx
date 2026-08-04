import {
  formatSupplementDay,
  isAppendFieldKey,
  isReplaceFieldKey,
  type SupplementFieldKey,
  type SupplementHistoryItem,
} from "@/lib/editor/recommendation-supplements";
import {
  isSspAppendFieldKey,
  isSspReplaceFieldKey,
  type SspSupplementFieldKey,
} from "@/lib/ssp/recommendation-supplements";
import { cn } from "@/lib/utils";

const readBoxClassName =
  "min-h-[120px] cursor-default whitespace-pre-wrap rounded-md border border-input bg-muted/20 px-3 py-2 text-base leading-normal text-foreground";

type DisplayFieldKey = SupplementFieldKey | SspSupplementFieldKey;

type EditorAppendFieldDisplayProps = {
  id: string;
  fieldKey: DisplayFieldKey;
  currentValue: string;
  supplements: SupplementHistoryItem[];
  className?: string;
};

function compactDisplayText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

function formatDisplayChunk(fieldKey: DisplayFieldKey, content: string): string {
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

function isAppendKey(fieldKey: DisplayFieldKey): boolean {
  return isAppendFieldKey(fieldKey) || isSspAppendFieldKey(fieldKey);
}

function isReplaceKey(fieldKey: DisplayFieldKey): boolean {
  return isReplaceFieldKey(fieldKey) || isSspReplaceFieldKey(fieldKey);
}

function buildDisplayContent(
  fieldKey: DisplayFieldKey,
  currentValue: string,
  supplements: SupplementHistoryItem[],
): { base: string; supplements: { chunk: string; changeReason: string; changeDateLabel: string }[] } | null {
  if (!isAppendKey(fieldKey) && !isReplaceKey(fieldKey)) return null;

  const items = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime());

  if (items.length === 0) {
    const current = compactDisplayText(currentValue);
    return current ? { base: formatDisplayChunk(fieldKey, current), supplements: [] } : null;
  }

  const baseRaw = compactDisplayText(items[0].previousContent ?? "");
  const base = baseRaw ? formatDisplayChunk(fieldKey, baseRaw) : "";

  const supplementBlocks = items
    .map((item) => {
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

      if (!chunk) return null;
      return {
        chunk,
        changeReason: compactDisplayText(item.changeReason ?? "") || "—",
        changeDateLabel: formatSupplementDay(item.changeDate),
      };
    })
    .filter((block): block is NonNullable<typeof block> => block !== null);

  if (!base && supplementBlocks.length === 0) return null;
  return { base, supplements: supplementBlocks };
}

export function EditorAppendFieldDisplay({
  id,
  fieldKey,
  currentValue,
  supplements,
  className,
}: EditorAppendFieldDisplayProps) {
  const content = buildDisplayContent(fieldKey, currentValue, supplements);

  if (!content) {
    return (
      <div id={id} className={cn(readBoxClassName, className)}>
        {currentValue || "—"}
      </div>
    );
  }

  const { base, supplements: supplementBlocks } = content;

  return (
    <div id={id} className={cn(readBoxClassName, className)}>
      {base ? <p className="whitespace-pre-wrap">{base}</p> : null}
      {supplementBlocks.map((block, index) => (
        <div key={`${block.changeDateLabel}-${index}`} className={cn(base || index > 0 ? "mt-4" : undefined)}>
          <p className="whitespace-pre-wrap">{block.chunk}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Причина внесення змін: {block.changeReason}
          </p>
          <p className="text-sm text-muted-foreground">Дата внесення змін: {block.changeDateLabel}</p>
        </div>
      ))}
    </div>
  );
}
