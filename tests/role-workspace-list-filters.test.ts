import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analystStatusFilterWhere,
  managerStatusFilterWhere,
} from "@/lib/role-workspace-list-filters";

describe("analystStatusFilterWhere", () => {
  it("shows only on_review in the default analyst queue", () => {
    assert.deepEqual(analystStatusFilterWhere("all"), { status: "on_review" });
    assert.deepEqual(analystStatusFilterWhere("on_review"), { status: "on_review" });
  });

  it("does not expose revision items in the analyst workspace", () => {
    assert.deepEqual(analystStatusFilterWhere("revision"), { status: { in: [] } });
  });
});

describe("managerStatusFilterWhere", () => {
  it("keeps revision visible for the manager queue", () => {
    assert.deepEqual(managerStatusFilterWhere("all"), {
      status: { in: ["manager_review", "revision"] },
    });
  });
});
