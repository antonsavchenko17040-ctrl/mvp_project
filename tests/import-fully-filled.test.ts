import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isExecutionSectionFullyFilled,
  isFullyFilledImportedFolder,
  type ParsedImportRecommendation,
} from "@/lib/import/audit-folder-xlsx";

function stubRecommendation(
  status: ParsedImportRecommendation["status"],
): ParsedImportRecommendation {
  return {
    excelRow: 1,
    sequenceNumber: 1,
    vkElement: "",
    deficiency: "",
    recommendationText: "",
    executionIndicator: "",
    expectedResult: "",
    sspUnit: "",
    deadline: null,
    informingDeadline: null,
    progressReport: null,
    actualImplementationDate: null,
    measuresDescription: null,
    expectedAchievement: null,
    supportingDocuments: null,
    sspNotes: null,
    observationSignificance: "",
    status,
    supplements: [],
  };
}

/** texts[0]=A … texts[8]=informingDeadline, texts[9–14]=execution J–O */
function rowTexts(execution: Array<string | undefined>): string[] {
  const texts = Array.from({ length: 15 }, () => "");
  execution.forEach((value, index) => {
    texts[9 + index] = value ?? "";
  });
  return texts;
}

test("execution section fully filled only when every J–O cell has a value", () => {
  assert.equal(
    isExecutionSectionFullyFilled(rowTexts(["a", "2024-01-01", "b", "c", "d", "e"])),
    true,
  );
});

test("execution section is incomplete when any J–O cell is empty", () => {
  assert.equal(
    isExecutionSectionFullyFilled(rowTexts(["a", "2024-01-01", "", "c", "d", "e"])),
    false,
  );
});

test("execution section is incomplete when only some J–O cells are filled", () => {
  assert.equal(isExecutionSectionFullyFilled(rowTexts(["лише прогрес", "", "", "", "", ""])), false);
});

test("execution section is incomplete when all J–O cells are empty", () => {
  assert.equal(isExecutionSectionFullyFilled(rowTexts(["", "", "", "", "", ""])), false);
});

test("execution section treats em dash as empty", () => {
  assert.equal(
    isExecutionSectionFullyFilled(rowTexts(["a", "—", "b", "c", "d", "e"])),
    false,
  );
});

test("fully filled folder when every recommendation is published", () => {
  assert.equal(
    isFullyFilledImportedFolder([stubRecommendation("published"), stubRecommendation("published")]),
    true,
  );
});

test("incomplete folder when any recommendation is still a draft", () => {
  assert.equal(
    isFullyFilledImportedFolder([stubRecommendation("published"), stubRecommendation("draft")]),
    false,
  );
});

test("empty import is not fully filled", () => {
  assert.equal(isFullyFilledImportedFolder([]), false);
});
