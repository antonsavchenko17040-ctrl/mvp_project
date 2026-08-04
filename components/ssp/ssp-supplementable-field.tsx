import { EditorAppendFieldDisplay } from "@/components/editor/editor-append-field-display";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import type { FieldSupplementItem } from "@/components/editor/recommendation-field-supplement-history";
import { SspFieldSupplementControls } from "@/components/ssp/ssp-field-supplement-controls";
import type { SspSupplementFieldKey } from "@/lib/ssp/recommendation-supplements";

type SspSupplementableFieldProps = {
  recommendationId: string;
  redirectPath: string;
  fieldKey: SspSupplementFieldKey;
  label: string;
  htmlFor: string;
  currentValue: string;
  supplements: FieldSupplementItem[];
  currentValueHint?: string;
  defaultChangeDate: string;
  mode: "edit" | "view";
  children?: React.ReactNode;
  /** Якщо false — без форми доповнення (папка архівована). */
  allowSupplements?: boolean;
};

export function SspSupplementableField({
  recommendationId,
  redirectPath,
  fieldKey,
  label,
  htmlFor,
  currentValue,
  supplements,
  currentValueHint,
  defaultChangeDate,
  mode,
  children,
  allowSupplements = true,
}: SspSupplementableFieldProps) {
  const hasSupplements = supplements.some((item) => item.fieldKey === fieldKey);

  return (
    <div className="space-y-0">
      <RecommendationFieldBlock label={label} htmlFor={htmlFor}>
        {mode === "edit" ? (
          children
        ) : (
          <EditorAppendFieldDisplay
            id={htmlFor}
            fieldKey={fieldKey}
            currentValue={currentValue}
            supplements={supplements}
            className="border-input bg-neutral-200/80 text-neutral-950"
          />
        )}
      </RecommendationFieldBlock>
      {mode === "edit" && hasSupplements ? (
        <div className="mt-2">
          <p className="mb-1 text-sm font-medium text-muted-foreground">Історія доповнень</p>
          <EditorAppendFieldDisplay
            id={`${htmlFor}_history`}
            fieldKey={fieldKey}
            currentValue={currentValue}
            supplements={supplements}
            className="border-input bg-neutral-200/80 text-neutral-950"
          />
        </div>
      ) : null}
      {allowSupplements ? (
        <SspFieldSupplementControls
          recommendationId={recommendationId}
          redirectPath={redirectPath}
          fieldKey={fieldKey}
          currentValueHint={currentValueHint ?? currentValue}
          defaultChangeDate={defaultChangeDate}
        />
      ) : null}
    </div>
  );
}
