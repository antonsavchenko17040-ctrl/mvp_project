import { parseDateOnlyInput } from "@/lib/dates";
import { EXECUTION_STATUS_LABELS } from "@/lib/recommendation-execution-status";

export type SspRecommendationFormFields = {
  progressReport: string;
  measuresDescription: string;
  actualImplementationDate: Date | null;
  expectedAchievement: string;
  supportingDocuments: string;
  sspNotes: string;
};

export function parseSspRecommendationFormFields(formData: FormData): SspRecommendationFormFields {
  const actualImplementationDateRaw = String(formData.get("actual_implementation_date") ?? "").trim();
  const actualImplementationDate = parseDateOnlyInput(actualImplementationDateRaw);
  if (actualImplementationDateRaw && !actualImplementationDate) {
    // Невалідний рядок дати — окремий маркер через Invalid Date для downstream-перевірок.
    return {
      progressReport: String(formData.get("progress_report") ?? "").trim(),
      measuresDescription: String(formData.get("measures_description") ?? "").trim(),
      actualImplementationDate: new Date(Number.NaN),
      expectedAchievement: String(formData.get("expected_achievement") ?? "").trim(),
      supportingDocuments: String(formData.get("supporting_documents") ?? "").trim(),
      sspNotes: String(formData.get("ssp_notes") ?? "").trim(),
    };
  }

  return {
    progressReport: String(formData.get("progress_report") ?? "").trim(),
    measuresDescription: String(formData.get("measures_description") ?? "").trim(),
    actualImplementationDate,
    expectedAchievement: String(formData.get("expected_achievement") ?? "").trim(),
    supportingDocuments: String(formData.get("supporting_documents") ?? "").trim(),
    sspNotes: String(formData.get("ssp_notes") ?? "").trim(),
  };
}

export function isSupportingDocumentsRequired(progressReport: string): boolean {
  return progressReport === EXECUTION_STATUS_LABELS.full;
}

/** Перевірка перед відправкою на верифікацію. Повертає текст помилки або null. */
export function validateSspSubmitFields(fields: SspRecommendationFormFields): string | null {
  if (!fields.progressReport) {
    return "Оберіть стан впровадження рекомендацій.";
  }
  if (!fields.measuresDescription) {
    return "Заповніть заходи з впровадження рекомендацій.";
  }
  // Фактична дата впровадження та досягнення очікуваного результату — необов’язкові.
  if (fields.actualImplementationDate && Number.isNaN(fields.actualImplementationDate.getTime())) {
    return "Фактична дата впровадження вказана некоректно.";
  }
  if (!fields.sspNotes) {
    return "Заповніть примітки.";
  }
  if (isSupportingDocumentsRequired(fields.progressReport) && !fields.supportingDocuments) {
    return "Заповніть підтверджуючі документи для стану «Виконано повністю».";
  }
  return null;
}

export function sspFieldsToDbData(fields: SspRecommendationFormFields) {
  return {
    progressReport: fields.progressReport,
    measuresDescription: fields.measuresDescription,
    actualImplementationDate: fields.actualImplementationDate,
    expectedAchievement: fields.expectedAchievement || null,
    supportingDocuments: fields.supportingDocuments || null,
    sspNotes: fields.sspNotes || null,
  };
}
