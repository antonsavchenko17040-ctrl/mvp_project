"use client";

import { useState } from "react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supplementRecommendationField } from "@/app/(portal)/(editor)/editor/actions";
import {
  isAppendFieldKey,
  type SupplementFieldKey,
} from "@/lib/editor/recommendation-supplements";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const textareaClass =
  "min-h-[88px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type DepartmentOption = { id: string; name: string };

type EditorFieldSupplementControlsProps = {
  recommendationId: string;
  redirectPath: string;
  fieldKey: SupplementFieldKey;
  /** Для select/date — підказка поточного значення. */
  currentValueHint?: string;
  departments?: DepartmentOption[];
  defaultChangeDate: string;
};

export function EditorFieldSupplementControls({
  recommendationId,
  redirectPath,
  fieldKey,
  currentValueHint,
  departments = [],
  defaultChangeDate,
}: EditorFieldSupplementControlsProps) {
  const [open, setOpen] = useState(false);
  const isAppend = isAppendFieldKey(fieldKey);
  const contentId = `supplement_content_${fieldKey}`;
  const reasonId = `change_reason_${fieldKey}`;
  const dateId = `change_date_${fieldKey}`;

  if (!open) {
    return (
      <div className="mt-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Зробити доповнення
        </Button>
      </div>
    );
  }

  return (
    <form
      action={supplementRecommendationField}
      className="mt-2 space-y-3 rounded-md border border-black/15 bg-muted/10 p-3"
    >
      <input type="hidden" name="recommendation_id" value={recommendationId} />
      <input type="hidden" name="redirect_path" value={redirectPath} />
      <input type="hidden" name="field_key" value={fieldKey} />

      <p className="text-sm font-medium text-muted-foreground">
        {isAppend ? "Доповнити поле" : "Змінити значення (попереднє буде заблоковано)"}
      </p>

      {fieldKey === "observationSignificance" ? (
        <RecommendationFieldBlock label="Нове значення" htmlFor={contentId}>
          <select id={contentId} name="content" className={inputClass} required>
            <option value="">— Оберіть —</option>
            <option value="низька">низька</option>
            <option value="середня">середня</option>
            <option value="висока">висока</option>
            <option value="критична">критична</option>
          </select>
        </RecommendationFieldBlock>
      ) : fieldKey === "sspUnit" ? (
        <RecommendationFieldBlock label="Нове значення" htmlFor={contentId}>
          <select id={contentId} name="content" className={inputClass} required>
            <option value="">— Оберіть підрозділ —</option>
            {departments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
        </RecommendationFieldBlock>
      ) : fieldKey === "deadline" || fieldKey === "informingDeadline" ? (
        <RecommendationFieldBlock label="Нове значення" htmlFor={contentId}>
          <Input id={contentId} name="content" type="date" required className={inputClass} />
          {currentValueHint ? (
            <p className="mt-1 text-xs text-muted-foreground">Поточне: {currentValueHint}</p>
          ) : null}
        </RecommendationFieldBlock>
      ) : isAppend ? (
        <RecommendationFieldBlock label="Доповнення" htmlFor={contentId}>
          <Textarea id={contentId} name="content" required className={textareaClass} />
        </RecommendationFieldBlock>
      ) : (
        <RecommendationFieldBlock label="Нове значення" htmlFor={contentId}>
          <Input id={contentId} name="content" required className={inputClass} />
          {currentValueHint ? (
            <p className="mt-1 text-xs text-muted-foreground">Поточне: {currentValueHint}</p>
          ) : null}
        </RecommendationFieldBlock>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <RecommendationFieldBlock label="Причина внесення змін" htmlFor={reasonId}>
          <Textarea id={reasonId} name="change_reason" required className={textareaClass} />
        </RecommendationFieldBlock>
        <RecommendationFieldBlock label="Дата внесення змін" htmlFor={dateId}>
          <Input
            id={dateId}
            name="change_date"
            type="date"
            required
            defaultValue={defaultChangeDate}
            className={inputClass}
          />
        </RecommendationFieldBlock>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="bg-[#3a6fb8] hover:bg-[#2f5e9a]">
          Зберегти доповнення
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}
