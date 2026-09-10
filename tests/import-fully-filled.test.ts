import assert from "node:assert/strict";
import { test } from "node:test";

import { isFullyFilledImportedFolder } from "@/lib/import/audit-folder-xlsx";
import type { ParsedImportRecommendation } from "@/lib/import/audit-folder-xlsx";

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
    observationSignificance: "—",
    status,
    supplements: [],
  };
}

test("fully filled when every recommendation is published", () => {
  assert.equal(
    isFullyFilledImportedFolder([stubRecommendation("published"), stubRecommendation("published")]),
    true,
  );
});

test("incomplete when any recommendation is still a draft", () => {
  assert.equal(
    isFullyFilledImportedFolder([stubRecommendation("published"), stubRecommendation("draft")]),
    false,
  );
});

test("empty import is not fully filled", () => {
  assert.equal(isFullyFilledImportedFolder([]), false);
});
