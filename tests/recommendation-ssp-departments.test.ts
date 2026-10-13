import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  readDepartmentIdsFromForm,
  resolveDepartmentsByIds,
  resolveDepartmentsByNames,
  resolveSspAssignmentFromForm,
  sspDepartmentsVisibilityWhere,
} from "@/lib/recommendation-ssp-departments";

const departments = [
  { id: "dep-a", name: "Відділ А" },
  { id: "dep-b", name: "Відділ Б" },
  { id: "dep-c", name: "Служба внутрішнього аудиту | регіон" },
];

describe("recommendation-ssp-departments", () => {
  it("reads department ids from JSON hidden field", () => {
    const formData = new FormData();
    formData.set("ssp_department_ids", JSON.stringify(["dep-a", "dep-b", "dep-a"]));
    assert.deepEqual(readDepartmentIdsFromForm(formData), ["dep-a", "dep-b"]);
  });

  it("resolves assignment from ids and keeps all selected departments", () => {
    const resolved = resolveDepartmentsByIds(["dep-b", "dep-a"], departments);
    assert.ok(resolved);
    assert.deepEqual(resolved.ids, ["dep-b", "dep-a"]);
    assert.equal(resolved.sspUnit, "Відділ А | Відділ Б");
  });

  it("resolves assignment from form ids even when name field is content", () => {
    const formData = new FormData();
    formData.set("content", JSON.stringify(["dep-a", "dep-c"]));
    const resolved = resolveSspAssignmentFromForm(formData, departments, {
      idField: "ssp_department_ids",
      nameField: "content",
    });
    assert.ok(resolved);
    assert.deepEqual(resolved.ids, ["dep-a", "dep-c"]);
    assert.ok(resolved.names.includes("Відділ А"));
    assert.ok(resolved.names.includes("Служба внутрішнього аудиту | регіон"));
  });

  it("falls back to legacy ssp_unit name checkboxes", () => {
    const formData = new FormData();
    formData.append("ssp_unit", "Відділ А");
    formData.append("ssp_unit", "Відділ Б");
    const resolved = resolveSspAssignmentFromForm(formData, departments);
    assert.ok(resolved);
    assert.deepEqual(new Set(resolved.ids), new Set(["dep-a", "dep-b"]));
  });

  it("builds visibility where that matches join rows by departmentId", () => {
    const where = sspDepartmentsVisibilityWhere(["dep-a"], ["Відділ А"]);
    assert.ok(where.OR || where.sspDepartments);
    const serialized = JSON.stringify(where);
    assert.ok(serialized.includes("dep-a"));
    assert.ok(serialized.includes("sspDepartments"));
  });

  it("resolves multi names that contain pipe characters via ids only", () => {
    const resolved = resolveDepartmentsByNames(
      ["Служба внутрішнього аудиту | регіон"],
      departments,
    );
    // Name-based parse splits on `|` — this is why ids are the source of truth.
    assert.equal(resolved, null);

    const byIds = resolveDepartmentsByIds(["dep-c"], departments);
    assert.ok(byIds);
    assert.equal(byIds.names[0], "Служба внутрішнього аудиту | регіон");
  });
});
