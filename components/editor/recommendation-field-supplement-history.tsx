"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatSupplementDay,
  isReplaceFieldKey,
  type SupplementFieldKey,
} from "@/lib/editor/recommendation-supplements";

export type FieldSupplementItem = {
  id: string;
  fieldKey: string;
  content: string;
  previousContent?: string | null;
  changeReason: string;
  changeDate: Date;
  createdAt: Date;
};

function displayContent(fieldKey: string, content: string): string {
  if (fieldKey === "deadline" || fieldKey === "informingDeadline") {
    return formatSupplementDay(content);
  }
  return content.trim() ? content : "—";
}

export function RecommendationFieldSupplementHistory({
  fieldKey,
  items,
  alwaysVisible = false,
}: {
  fieldKey: SupplementFieldKey;
  items: FieldSupplementItem[];
  /** Якщо true — історія одразу видима (для публічного перегляду). */
  alwaysVisible?: boolean;
}) {
  const [open, setOpen] = useState(alwaysVisible);
  const forField = items.filter((item) => item.fieldKey === fieldKey);
  if (forField.length === 0) return null;

  const isReplace = isReplaceFieldKey(fieldKey);
  const title = isReplace ? "Попередні значення" : "Раніше додані доповнення";
  const showList = alwaysVisible || open;

  return (
    <div className="mt-2 space-y-2">
      {alwaysVisible ? (
        <p className="text-sm font-medium text-muted-foreground">
          {title} ({forField.length})
        </p>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
          {title} ({forField.length})
        </Button>
      )}
      {showList ? (
        <div className="space-y-2 rounded-md border border-black/20 bg-muted/10 p-3">
          <ul className="space-y-3">
            {forField.map((item) => {
              const previous = (item.previousContent ?? "").trim();
              // Старі записи (до виправлення): у content лежало попереднє значення.
              const legacyReplace = isReplace && !previous;
              const shownPrevious = legacyReplace ? item.content : previous;
              const shownNew = legacyReplace ? "" : item.content;

              return (
                <li key={item.id} className="rounded-md border border-input bg-muted/30 px-3 py-2 text-base">
                  {isReplace ? (
                    <div className="space-y-1">
                      {shownPrevious ? (
                        <p className="whitespace-pre-wrap text-foreground">
                          <span className="text-sm text-muted-foreground">Попереднє значення: </span>
                          {displayContent(fieldKey, shownPrevious)}
                        </p>
                      ) : null}
                      {shownNew ? (
                        <p className="whitespace-pre-wrap text-foreground">
                          <span className="text-sm text-muted-foreground">Нове значення: </span>
                          {displayContent(fieldKey, shownNew)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {previous ? (
                        <p className="whitespace-pre-wrap text-foreground">
                          <span className="text-sm text-muted-foreground">Попереднє значення: </span>
                          {displayContent(fieldKey, previous)}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap text-foreground">
                        <span className="text-sm text-muted-foreground">Доповнення: </span>
                        {displayContent(fieldKey, item.content)}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Причина внесення змін: {item.changeReason || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Дата внесення змін: {formatSupplementDay(item.changeDate)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
