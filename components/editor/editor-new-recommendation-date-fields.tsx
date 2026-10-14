"use client";

import { useMemo, useState } from "react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { UkDateInput } from "@/components/ui/uk-date-input";
import { formatDateOnlyInput } from "@/lib/dates";

/**
 * Календарні обмеження (без підміни введеного значення на «сьогодні»):
 * — термін виконання ≥ сьогодні;
 * — строк інформування ≥ термін виконання.
 */
export function EditorNewRecommendationDateFields() {
  const today = useMemo(() => formatDateOnlyInput(new Date()), []);
  const [deadline, setDeadline] = useState("");
  const [informingDeadline, setInformingDeadline] = useState("");

  return (
    <>
      <RecommendationFieldBlock label="Термін виконання" htmlFor="deadline" required>
        <UkDateInput
          id="deadline"
          name="deadline"
          required
          min={today}
          value={deadline}
          onChange={(nextDeadline) => {
            setDeadline(nextDeadline);
            if (informingDeadline && nextDeadline && informingDeadline < nextDeadline) {
              setInformingDeadline("");
            }
          }}
        />
      </RecommendationFieldBlock>

      <RecommendationFieldBlock label="Строк інформування" htmlFor="informing_deadline" required>
        <UkDateInput
          id="informing_deadline"
          name="informing_deadline"
          required
          disabled={!deadline}
          min={deadline || today}
          value={informingDeadline}
          onChange={setInformingDeadline}
          title={!deadline ? "Спочатку оберіть термін виконання" : undefined}
        />
      </RecommendationFieldBlock>
    </>
  );
}
