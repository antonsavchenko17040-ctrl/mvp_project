"use client";

import { useState } from "react";

import {
  adminDeleteRecommendationSupplement,
  adminSupplementRecommendationField,
  adminUpdateRecommendationSupplement,
} from "@/app/(portal)/(admin)/admin/actions";
import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import type { FieldSupplementItem } from "@/components/editor/recommendation-field-supplement-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isAdminAppendFieldKey,
  type AdminSupplementFieldKey,
} from "@/lib/admin/recommendation-supplements";
import { formatSupplementDay } from "@/lib/editor/recommendation-supplements";
import { SSP_PROGRESS_REPORT_OPTIONS } from "@/lib/recommendation-execution-status";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const textareaClass =
  "min-h-[88px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type DepartmentOption = { id: string; name: string };

type AdminSupplementableFieldProps = {
  recommendationId: string;
  redirectPath: string;
  fieldKey: AdminSupplementFieldKey;
  label: string;
  htmlFor: string;
  currentValue: string;
  supplements: FieldSupplementItem[];
  defaultChangeDate: string;
  departments?: DepartmentOption[];
  /** Поля основної форми адміна (input / select / textarea). */
  children: React.ReactNode;
};

function ContentInput({
  fieldKey,
  contentId,
  departments,
  currentValueHint,
  defaultValue,
}: {
  fieldKey: AdminSupplementFieldKey;
  contentId: string;
  departments: DepartmentOption[];
  currentValueHint?: string;
  defaultValue?: string;
}) {
  if (fieldKey === "observationSignificance") {
    return (
      <select id={contentId} name="content" className={inputClass} required defaultValue={defaultValue ?? ""}>
        <option value="">— Оберіть —</option>
        <option value="низька">низька</option>
        <option value="середня">середня</option>
        <option value="висока">висока</option>
        <option value="критична">критична</option>
      </select>
    );
  }
  if (fieldKey === "sspUnit") {
    return (
      <select id={contentId} name="content" className={inputClass} required defaultValue={defaultValue ?? ""}>
        <option value="">— Оберіть підрозділ —</option>
        {departments.map((department) => (
          <option key={department.id} value={department.name}>
            {department.name}
          </option>
        ))}
      </select>
    );
  }
  if (fieldKey === "progressReport") {
    return (
      <select id={contentId} name="content" className={inputClass} required defaultValue={defaultValue ?? ""}>
        <option value="">— Оберіть стан —</option>
        {SSP_PROGRESS_REPORT_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    );
  }
  if (
    fieldKey === "deadline" ||
    fieldKey === "informingDeadline" ||
    fieldKey === "actualImplementationDate"
  ) {
    return (
      <>
        <Input
          id={contentId}
          name="content"
          type="date"
          required
          className={inputClass}
          defaultValue={defaultValue ?? ""}
        />
        {currentValueHint ? (
          <p className="mt-1 text-xs text-muted-foreground">Поточне: {currentValueHint}</p>
        ) : null}
      </>
    );
  }
  if (isAdminAppendFieldKey(fieldKey)) {
    return (
      <Textarea
        id={contentId}
        name="content"
        required
        className={textareaClass}
        defaultValue={defaultValue ?? ""}
      />
    );
  }
  return (
    <Input
      id={contentId}
      name="content"
      required
      className={inputClass}
      defaultValue={defaultValue ?? ""}
    />
  );
}

export function AdminSupplementableField({
  recommendationId,
  redirectPath,
  fieldKey,
  label,
  htmlFor,
  currentValue,
  supplements,
  defaultChangeDate,
  departments = [],
  children,
}: AdminSupplementableFieldProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fieldSupplements = supplements
    .filter((item) => item.fieldKey === fieldKey)
    .sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime());
  const hasSupplements = fieldSupplements.length > 0;
  const isAppend = isAdminAppendFieldKey(fieldKey);

  return (
    <div className="space-y-2">
      <RecommendationFieldBlock label={label} htmlFor={hasSupplements ? `${htmlFor}_display` : htmlFor}>
        {hasSupplements ? (
          <EditorAppendFieldDisplay
            id={`${htmlFor}_display`}
            fieldKey={fieldKey}
            currentValue={currentValue}
            supplements={supplements}
          />
        ) : (
          children
        )}
      </RecommendationFieldBlock>

      {hasSupplements ? (
        <>
          {/* Зберігаємо поля основної форми адміна для «Зберегти зміни». */}
          <div className="sr-only" aria-hidden>
            {children}
          </div>
          <div className="space-y-3 rounded-md border border-black/15 bg-muted/10 p-3">
            <p className="text-sm font-medium text-muted-foreground">
              Доповнення ({fieldSupplements.length}) — можна редагувати або видалити
            </p>
            <ul className="space-y-3">
              {fieldSupplements.map((item, index) => {
                const contentId = `admin_edit_content_${item.id}`;
                const reasonId = `admin_edit_reason_${item.id}`;
                const dateId = `admin_edit_date_${item.id}`;
                const dateValue = new Date(item.changeDate).toISOString().slice(0, 10);

                if (editingId === item.id) {
                  return (
                    <li key={item.id} className="rounded-md border border-input bg-background p-3">
                      <form action={adminUpdateRecommendationSupplement} className="space-y-3">
                        <input type="hidden" name="recommendation_id" value={recommendationId} />
                        <input type="hidden" name="redirect_path" value={redirectPath} />
                        <input type="hidden" name="supplement_id" value={item.id} />
                        <p className="text-sm font-medium">Редагування доповнення #{index + 1}</p>
                        <RecommendationFieldBlock
                          label={isAppend ? "Доповнення" : "Значення"}
                          htmlFor={contentId}
                        >
                          <ContentInput
                            fieldKey={fieldKey}
                            contentId={contentId}
                            departments={departments}
                            defaultValue={item.content}
                          />
                        </RecommendationFieldBlock>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <RecommendationFieldBlock label="Причина внесення змін" htmlFor={reasonId}>
                            <Textarea
                              id={reasonId}
                              name="change_reason"
                              required
                              className={textareaClass}
                              defaultValue={item.changeReason}
                            />
                          </RecommendationFieldBlock>
                          <RecommendationFieldBlock label="Дата внесення змін" htmlFor={dateId}>
                            <Input
                              id={dateId}
                              name="change_date"
                              type="date"
                              required
                              className={inputClass}
                              defaultValue={dateValue}
                            />
                          </RecommendationFieldBlock>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" size="sm" className="bg-[#3a6fb8] hover:bg-[#2f5e9a]">
                            Зберегти
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Скасувати
                          </Button>
                        </div>
                      </form>
                    </li>
                  );
                }

                return (
                  <li key={item.id} className="rounded-md border border-input bg-muted/30 px-3 py-2">
                    <p className="whitespace-pre-wrap text-base">{item.content.trim() || "—"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Причина внесення змін: {item.changeReason || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Дата внесення змін: {formatSupplementDay(item.changeDate)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(item.id)}>
                        Редагувати
                      </Button>
                      <form action={adminDeleteRecommendationSupplement}>
                        <input type="hidden" name="recommendation_id" value={recommendationId} />
                        <input type="hidden" name="redirect_path" value={redirectPath} />
                        <input type="hidden" name="supplement_id" value={item.id} />
                        <Button type="submit" size="sm" variant="destructive">
                          Видалити
                        </Button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}

      {createOpen ? (
        <form
          action={adminSupplementRecommendationField}
          className="space-y-3 rounded-md border border-black/15 bg-muted/10 p-3"
        >
          <input type="hidden" name="recommendation_id" value={recommendationId} />
          <input type="hidden" name="redirect_path" value={redirectPath} />
          <input type="hidden" name="field_key" value={fieldKey} />
          <p className="text-sm font-medium text-muted-foreground">
            {isAppend ? "Доповнити поле" : "Змінити значення (попереднє буде збережено в історії)"}
          </p>
          <RecommendationFieldBlock
            label={isAppend ? "Доповнення" : "Нове значення"}
            htmlFor={`admin_supplement_content_${fieldKey}`}
          >
            <ContentInput
              fieldKey={fieldKey}
              contentId={`admin_supplement_content_${fieldKey}`}
              departments={departments}
              currentValueHint={currentValue}
            />
          </RecommendationFieldBlock>
          <div className="grid gap-3 sm:grid-cols-2">
            <RecommendationFieldBlock
              label="Причина внесення змін"
              htmlFor={`admin_supplement_reason_${fieldKey}`}
            >
              <Textarea
                id={`admin_supplement_reason_${fieldKey}`}
                name="change_reason"
                required
                className={textareaClass}
              />
            </RecommendationFieldBlock>
            <RecommendationFieldBlock
              label="Дата внесення змін"
              htmlFor={`admin_supplement_date_${fieldKey}`}
            >
              <Input
                id={`admin_supplement_date_${fieldKey}`}
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
            <Button type="button" size="sm" variant="outline" onClick={() => setCreateOpen(false)}>
              Скасувати
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            Зробити доповнення
          </Button>
        </div>
      )}
    </div>
  );
}
