import assert from "node:assert/strict";
import test from "node:test";

import { canTransition } from "@/lib/domain/recommendation-state-machine";

test("редактор може перевести чернетку в очікує виконання", () => {
  const result = canTransition({
    currentStatus: "draft",
    nextStatus: "in_progress",
    role: "editor",
  });
  assert.equal(result.ok, true);
});

test("редактор може повернути чернетку відповідального до опрацювання", () => {
  const result = canTransition({
    currentStatus: "ssp_draft",
    nextStatus: "in_progress",
    role: "editor",
  });
  assert.equal(result.ok, true);
});

test("аналітик може повернути на доопрацювання лише з коментарем", () => {
  const failed = canTransition({
    currentStatus: "on_review",
    nextStatus: "revision",
    role: "analyst",
    analystComment: "",
  });
  assert.equal(failed.ok, false);

  const passed = canTransition({
    currentStatus: "on_review",
    nextStatus: "revision",
    role: "analyst",
    analystComment: "Потрібно деталізувати показники виконання.",
  });
  assert.equal(passed.ok, true);
});

test("ССП може зберегти чернетку виконання зі статусів опрацювання", () => {
  const fromProgress = canTransition({
    currentStatus: "in_progress",
    nextStatus: "ssp_draft",
    role: "ssp",
  });
  assert.equal(fromProgress.ok, true);

  const fromRevision = canTransition({
    currentStatus: "revision",
    nextStatus: "ssp_draft",
    role: "ssp",
  });
  assert.equal(fromRevision.ok, true);
});

test("аналітик не може перевести рекомендацію з виконання в чернетку відповідального", () => {
  const result = canTransition({
    currentStatus: "in_progress",
    nextStatus: "ssp_draft",
    role: "analyst",
  });
  assert.equal(result.ok, false);
});

test("ССП не може верифікувати рекомендацію", () => {
  const result = canTransition({
    currentStatus: "on_review",
    nextStatus: "published",
    role: "ssp",
  });
  assert.equal(result.ok, false);
});
