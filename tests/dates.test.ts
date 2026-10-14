import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatDateOnlyDisplay,
  formatDateOnlyInput,
  parseDateOnlyInput,
} from "@/lib/dates";

describe("parseDateOnlyInput", () => {
  it("parses ISO and DMY without shifting the calendar day", () => {
    const iso = parseDateOnlyInput("2024-03-15");
    assert.ok(iso);
    assert.equal(iso.getFullYear(), 2024);
    assert.equal(iso.getMonth(), 2);
    assert.equal(iso.getDate(), 15);

    const dmy = parseDateOnlyInput("15.03.2024");
    assert.ok(dmy);
    assert.equal(formatDateOnlyInput(dmy), "2024-03-15");
    assert.equal(formatDateOnlyDisplay(dmy), "15.03.2024");
  });

  it("rejects invalid dates and keeps empty as null", () => {
    assert.equal(parseDateOnlyInput(""), null);
    assert.equal(parseDateOnlyInput("31.02.2024"), null);
    assert.equal(parseDateOnlyInput("2024-13-01"), null);
    assert.equal(parseDateOnlyInput("not-a-date"), null);
  });
});
