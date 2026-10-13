import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatSspUnits,
  formatSspUnitsMultiline,
  parseSspUnits,
  recommendationMatchesSspDepartments,
  renameSspUnitToken,
  sspUnitIncludesDepartment,
  sspUnitVisibilityWhere,
} from "../lib/ssp-units";

describe("ssp-units", () => {
  it("keeps a single unit unchanged", () => {
    assert.equal(formatSspUnits(["Відділ А"]), "Відділ А");
    assert.deepEqual(parseSspUnits("Відділ А"), ["Відділ А"]);
    assert.equal(sspUnitIncludesDepartment("Відділ А", "Відділ А"), true);
    assert.equal(sspUnitIncludesDepartment("Відділ А", "Відділ Б"), false);
  });

  it("formats and parses multiple units", () => {
    assert.equal(formatSspUnits(["Б", "А", "А"]), "А | Б");
    assert.deepEqual(parseSspUnits("А | Б"), ["А", "Б"]);
    assert.deepEqual(parseSspUnits("А|Б"), ["А", "Б"]);
    assert.equal(sspUnitIncludesDepartment("А | Б", "Б"), true);
  });

  it("formats multiline display without truncating long names", () => {
    const longA = "Відділ цифрової трансформації та інноваційного розвитку";
    const longB = "IT Департамент";
    const stored = formatSspUnits([longA, longB]);
    const lines = formatSspUnitsMultiline(stored).split("\n");
    assert.deepEqual(new Set(lines), new Set([longA, longB]));
    assert.ok(lines.every((line) => line === longA || line === longB));
    assert.equal(recommendationMatchesSspDepartments(stored, [longA]), true);
    assert.equal(recommendationMatchesSspDepartments(stored, [longB]), true);
    assert.equal(recommendationMatchesSspDepartments(stored, ["Інший"]), false);
  });

  it("renames one token inside a multi value", () => {
    assert.equal(renameSspUnitToken("А | Б", "А", "А2"), "А2 | Б");
    assert.equal(renameSspUnitToken("А", "А", "А2"), "А2");
  });

  it("builds prisma visibility for single and multi stored values", () => {
    const where = sspUnitVisibilityWhere(["А"]);
    assert.ok(where.OR);
    assert.ok(Array.isArray(where.OR));
    assert.ok((where.OR as unknown[]).length >= 4);
  });
});
