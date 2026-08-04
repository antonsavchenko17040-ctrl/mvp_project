import { EditorFieldSupplementControls } from "@/components/editor/editor-field-supplement-controls";
import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import {
  RecommendationFieldSupplementHistory,
  type FieldSupplementItem,
} from "@/components/editor/recommendation-field-supplement-history";
import { isAppendFieldKey, isReplaceFieldKey, type SupplementFieldKey } from "@/lib/editor/recommendation-supplements";

type DepartmentOption = { id: string; name: string };

type EditorSupplementableFieldProps = {
  recommendationId: string;
  redirectPath: string;
  fieldKey: SupplementFieldKey;
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  supplements: FieldSupplementItem[];
  departments?: DepartmentOption[];
  currentValueHint?: string;
  defaultChangeDate: string;
  /** Для append/replace-полів: доповнення показуються в основному полі, історію ховаємо. */
  mergeAppendSupplements?: boolean;
  /** Якщо false — лише перегляд (папка архівована). */
  allowSupplements?: boolean;
};

export function EditorSupplementableField({
  recommendationId,
  redirectPath,
  fieldKey,
  label,
  htmlFor,
  children,
  supplements,
  departments,
  currentValueHint,
  defaultChangeDate,
  mergeAppendSupplements = false,
  allowSupplements = true,
}: EditorSupplementableFieldProps) {
  const showSupplementHistory = !(
    mergeAppendSupplements && (isAppendFieldKey(fieldKey) || isReplaceFieldKey(fieldKey))
  );

  return (
    <div className="space-y-0">
      <RecommendationFieldBlock label={label} htmlFor={htmlFor}>
        {children}
      </RecommendationFieldBlock>
      {showSupplementHistory ? (
        <RecommendationFieldSupplementHistory fieldKey={fieldKey} items={supplements} />
      ) : null}
      {allowSupplements ? (
        <EditorFieldSupplementControls
          recommendationId={recommendationId}
          redirectPath={redirectPath}
          fieldKey={fieldKey}
          currentValueHint={currentValueHint}
          departments={departments}
          defaultChangeDate={defaultChangeDate}
        />
      ) : null}
    </div>
  );
}
