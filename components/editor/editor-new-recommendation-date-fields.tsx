"use client";

import { useState } from "react";

import { RecommendationFieldBlock } from "@/components/editor/recommendation-field-block";
import { Input } from "@/components/ui/input";

function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date fields for creating a recommendation with linked min constraints. */
export function EditorNewRecommendationDateFields() {
  const today = formatDateInputValue(new Date());
  const [deadline, setDeadline] = useState("");
  const informingMin = deadline || today;

  return (
    <>
      <RecommendationFieldBlock label="Термін виконання" htmlFor="deadline">
        <Input
          id="deadline"
          name="deadline"
          type="date"
          required
          min={today}
          value={deadline}
          onChange={(event) => {
            const nextDeadline = event.target.value;
            setDeadline(nextDeadline);
          }}
          className="h-11 text-base"
        />
      </RecommendationFieldBlock>

      <RecommendationFieldBlock label="Строк інформування" htmlFor="informing_deadline">
        <Input
          id="informing_deadline"
          name="informing_deadline"
          type="date"
          required
          min={informingMin}
          className="h-11 text-base"
        />
      </RecommendationFieldBlock>
    </>
  );
}
