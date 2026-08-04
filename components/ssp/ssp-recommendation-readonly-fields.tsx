import type { FieldSupplementItem } from "@/components/editor/recommendation-field-supplement-history";
import { SspSupplementableField } from "@/components/ssp/ssp-supplementable-field";
import { formatSspStoredDate } from "@/lib/ssp/recommendation-supplements";

type SspRecommendationReadonlyFieldsProps = {
  recommendationId: string;
  redirectPath: string;
  defaultChangeDate: string;
  supplements: FieldSupplementItem[];
  progressReport: string | null;
  expectedAchievement: string | null;
  supportingDocuments: string | null;
  measuresDescription: string | null;
  sspNotes: string | null;
  actualImplementationDate: Date | null;
  allowSupplements?: boolean;
};

export function SspRecommendationReadonlyFields({
  recommendationId,
  redirectPath,
  defaultChangeDate,
  supplements,
  progressReport,
  expectedAchievement,
  supportingDocuments,
  measuresDescription,
  sspNotes,
  actualImplementationDate,
  allowSupplements = true,
}: SspRecommendationReadonlyFieldsProps) {
  const fieldProps = {
    recommendationId,
    redirectPath,
    supplements,
    defaultChangeDate,
    mode: "view" as const,
    allowSupplements,
  };

  const actualDateIso = formatSspStoredDate(actualImplementationDate);
  const actualDateLabel = actualImplementationDate
    ? actualImplementationDate.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  return (
    <>
      <SspSupplementableField
        {...fieldProps}
        fieldKey="progressReport"
        label="Стан впровадження рекомендацій"
        htmlFor="progress_report_ro"
        currentValue={progressReport ?? ""}
      />

      <SspSupplementableField
        {...fieldProps}
        fieldKey="actualImplementationDate"
        label="Фактична дата впровадження"
        htmlFor="actual_implementation_date_ro"
        currentValue={actualDateIso || "—"}
        currentValueHint={actualDateLabel}
      />

      <SspSupplementableField
        {...fieldProps}
        fieldKey="measuresDescription"
        label="Заходи з впровадження рекомендацій"
        htmlFor="measures_description_ro"
        currentValue={measuresDescription ?? ""}
      />

      <SspSupplementableField
        {...fieldProps}
        fieldKey="expectedAchievement"
        label="Досягнення очікуваного"
        htmlFor="expected_achievement_ro"
        currentValue={expectedAchievement ?? ""}
      />

      <SspSupplementableField
        {...fieldProps}
        fieldKey="supportingDocuments"
        label="Підтверджуючі документи"
        htmlFor="supporting_documents_ro"
        currentValue={supportingDocuments ?? ""}
      />

      <SspSupplementableField
        {...fieldProps}
        fieldKey="sspNotes"
        label="Примітки"
        htmlFor="ssp_notes_ro"
        currentValue={sspNotes ?? ""}
      />
    </>
  );
}
