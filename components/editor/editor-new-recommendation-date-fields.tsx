"use client";

import { useMemo, useState } from "react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { cn } from "@/lib/utils";

function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const dateInputClassName = cn(
  "h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground",
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
);

/**
 * Календарні обмеження одразу в picker:
 * — термін виконання ≥ сьогодні;
 * — строк інформування ≥ термін виконання.
 */
export function EditorNewRecommendationDateFields() {
  const today = useMemo(() => formatDateInputValue(new Date()), []);
  const [deadline, setDeadline] = useState("");
  const [informingDeadline, setInformingDeadline] = useState("");

  return (
    <>
      <RecommendationFieldBlock label="Термін виконання" htmlFor="deadline">
        <input
          id="deadline"
          name="deadline"
          type="date"
          required
          min={today}
          value={deadline}
          onChange={(event) => {
            const nextDeadline = event.target.value;
            if (nextDeadline && nextDeadline < today) {
              setDeadline(today);
              if (informingDeadline && informingDeadline < today) {
                setInformingDeadline("");
              }
              return;
            }
            setDeadline(nextDeadline);
            if (informingDeadline && nextDeadline && informingDeadline < nextDeadline) {
              setInformingDeadline("");
            }
          }}
          className={dateInputClassName}
        />
      </RecommendationFieldBlock>

      <RecommendationFieldBlock label="Строк інформування" htmlFor="informing_deadline">
        <input
          id="informing_deadline"
          name="informing_deadline"
          type="date"
          required
          disabled={!deadline}
          min={deadline || today}
          value={informingDeadline}
          onChange={(event) => {
            const nextInforming = event.target.value;
            const minAllowed = deadline || today;
            if (nextInforming && nextInforming < minAllowed) {
              setInformingDeadline(minAllowed);
              return;
            }
            setInformingDeadline(nextInforming);
          }}
          className={dateInputClassName}
          title={!deadline ? "Спочатку оберіть термін виконання" : undefined}
        />
      </RecommendationFieldBlock>
    </>
  );
}
