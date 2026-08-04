"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useState } from "react";

import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import type { FieldSupplementItem } from "@/components/editor/recommendation-field-supplement-history";
import { SspFieldSupplementControls } from "@/components/ssp/ssp-field-supplement-controls";
import { SspSupplementableField } from "@/components/ssp/ssp-supplementable-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SSP_PROGRESS_REPORT_OPTIONS } from "@/lib/recommendation-execution-status";
import { isSupportingDocumentsRequired } from "@/lib/ssp/recommendation-form-validation";
import { cn } from "@/lib/utils";

const SUPPORTING_DOCUMENTS_INFO =
  "Для внутрішнього документу: назва, реквізити, ID. Для зовнішнього: назва, реквізити, посилання";

const FORM_ID = "ssp-main-form";

const fieldInputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const fieldTextareaClass =
  "min-h-[120px] w-full resize-y border-input bg-background text-base leading-relaxed text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type SspRecommendationEditFormProps = {
  recommendationId: string;
  currentStatus: string;
  redirectPath: string;
  defaultChangeDate: string;
  supplements: FieldSupplementItem[];
  progressReport: string | null;
  measuresDescription: string | null;
  actualImplementationDate: string | null;
  expectedAchievement: string | null;
  supportingDocuments: string | null;
  sspNotes: string | null;
  saveSspDraft: (formData: FormData) => Promise<void>;
  submitForReview: (formData: FormData) => Promise<void>;
};

export function SspRecommendationEditForm({
  recommendationId,
  currentStatus,
  redirectPath,
  defaultChangeDate,
  supplements,
  progressReport,
  measuresDescription,
  actualImplementationDate,
  expectedAchievement,
  supportingDocuments,
  sspNotes,
  saveSspDraft,
  submitForReview,
}: SspRecommendationEditFormProps) {
  const [progress, setProgress] = useState(progressReport ?? "");
  const supportingRequired = isSupportingDocumentsRequired(progress);
  const hasSupportingSupplements = supplements.some((item) => item.fieldKey === "supportingDocuments");

  const fieldProps = {
    recommendationId,
    redirectPath,
    supplements,
    defaultChangeDate,
    mode: "edit" as const,
  };

  return (
    <div className="space-y-6">
      <form id={FORM_ID} action={saveSspDraft}>
        <input type="hidden" name="recommendation_id" value={recommendationId} />
        <input type="hidden" name="current_status" value={currentStatus} />
      </form>

      <SspSupplementableField
        {...fieldProps}
        fieldKey="progressReport"
        label="Стан впровадження рекомендацій"
        htmlFor="progress_report"
        currentValue={progressReport ?? ""}
      >
        <select
          id="progress_report"
          name="progress_report"
          form={FORM_ID}
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          className={fieldInputClass}
          required
        >
          <option value="">-- Оберіть стан виконання --</option>
          {SSP_PROGRESS_REPORT_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </SspSupplementableField>

      <SspSupplementableField
        {...fieldProps}
        fieldKey="actualImplementationDate"
        label="Фактична дата впровадження"
        htmlFor="actual_implementation_date"
        currentValue={actualImplementationDate ?? ""}
        currentValueHint={actualImplementationDate ?? undefined}
      >
        <Input
          id="actual_implementation_date"
          name="actual_implementation_date"
          form={FORM_ID}
          type="date"
          defaultValue={actualImplementationDate ?? ""}
          required
          className="h-11 w-full text-base md:max-w-xs"
        />
      </SspSupplementableField>

      <SspSupplementableField
        {...fieldProps}
        fieldKey="measuresDescription"
        label="Заходи з впровадження рекомендацій"
        htmlFor="measures_description"
        currentValue={measuresDescription ?? ""}
      >
        <Textarea
          id="measures_description"
          name="measures_description"
          form={FORM_ID}
          defaultValue={measuresDescription ?? ""}
          required
          className={fieldTextareaClass}
        />
      </SspSupplementableField>

      <SspSupplementableField
        {...fieldProps}
        fieldKey="expectedAchievement"
        label="Досягнення очікуваного"
        htmlFor="expected_achievement"
        currentValue={expectedAchievement ?? ""}
      >
        <Textarea
          id="expected_achievement"
          name="expected_achievement"
          form={FORM_ID}
          defaultValue={expectedAchievement ?? ""}
          className="min-h-[100px] w-full resize-y border-input bg-background text-base leading-relaxed text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="За потреби опишіть досягнення очікуваного результату"
        />
      </SspSupplementableField>

      <div className="space-y-0">
        <div className="flex gap-3 sm:gap-4">
          <span
            className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#3a6fb8] sm:mt-3 sm:h-1.5 sm:w-1.5"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Label htmlFor="supporting_documents" className="text-base font-medium">
                Підтверджуючі документи
              </Label>
              <span className="group relative inline-flex shrink-0">
                <button
                  type="button"
                  tabIndex={0}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-md text-[#3a6fb8]",
                    "transition-colors hover:bg-[#3a6fb8]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-describedby="supporting_documents_info"
                  aria-label="Інформація"
                >
                  <Info className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <span
                  id="supporting_documents_info"
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute left-full top-1/2 z-20 ml-2 w-max max-w-[min(22rem,calc(100vw-3rem))] -translate-y-1/2",
                    "rounded-md border border-border bg-background px-3 py-2 text-sm leading-snug text-muted-foreground shadow-sm",
                    "invisible opacity-0 transition-opacity duration-150",
                    "group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
                  )}
                >
                  {SUPPORTING_DOCUMENTS_INFO}
                </span>
              </span>
            </div>
            <Textarea
              id="supporting_documents"
              name="supporting_documents"
              form={FORM_ID}
              defaultValue={supportingDocuments ?? ""}
              required={supportingRequired}
              className="min-h-[100px] w-full resize-y border-input bg-background text-base leading-relaxed text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Перелік або опис підтверджуючих документів"
            />
          </div>
        </div>
        {hasSupportingSupplements ? (
          <div className="mt-2">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Історія доповнень</p>
            <EditorAppendFieldDisplay
              id="supporting_documents_history"
              fieldKey="supportingDocuments"
              currentValue={supportingDocuments ?? ""}
              supplements={supplements}
              className="border-input bg-neutral-200/80 text-neutral-950"
            />
          </div>
        ) : null}
        <SspFieldSupplementControls
          recommendationId={recommendationId}
          redirectPath={redirectPath}
          fieldKey="supportingDocuments"
          currentValueHint={supportingDocuments ?? ""}
          defaultChangeDate={defaultChangeDate}
        />
      </div>

      <SspSupplementableField
        {...fieldProps}
        fieldKey="sspNotes"
        label="Примітки"
        htmlFor="ssp_notes"
        currentValue={sspNotes ?? ""}
      >
        <Textarea
          id="ssp_notes"
          name="ssp_notes"
          form={FORM_ID}
          defaultValue={sspNotes ?? ""}
          required
          className="min-h-[100px] w-full resize-y border-input bg-background text-base leading-relaxed text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </SspSupplementableField>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          form={FORM_ID}
          formAction={submitForReview}
          className={cn(buttonVariants({ variant: "default" }), "bg-[#3a6fb8] text-white hover:bg-[#2f5e9a]")}
        >
          Відправити на верифікацію
        </button>
        <button
          type="submit"
          form={FORM_ID}
          formNoValidate
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Зберегти в чернетку
        </button>
        <Button variant="outline" asChild>
          <Link href="/ssp">Скасувати</Link>
        </Button>
      </div>
    </div>
  );
}
