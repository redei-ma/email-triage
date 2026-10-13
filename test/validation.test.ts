// The check every model answer goes through, and labels.json too: what it
// accepts as a Triage, and what it reports when the answer is not one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { findTriageProblem } from "../src/types.ts";

test("a valid answer has no problem, with or without an order number", () => {
  assert.equal(findTriageProblem({ categoria: "reso", numero_ordine: "ORD-48213" }), null);
  assert.equal(findTriageProblem({ categoria: "altro", numero_ordine: null }), null);
});

test("a category outside the five is rejected", () => {
  assert.equal(
    findTriageProblem({ categoria: "rimborso", numero_ordine: null }),
    'la categoria "rimborso" non è fra quelle ammesse',
  );
});

test("a missing field is rejected", () => {
  assert.equal(findTriageProblem({ categoria: "reso" }), "mancano i campi categoria o numero_ordine");
});

test("the order number format is strict", () => {
  for (const numero of ["ord-48213", "ORD-8462", "48213"]) {
    assert.equal(
      findTriageProblem({ categoria: "reso", numero_ordine: numero }),
      `numero_ordine "${numero}" non è "ORD-" seguito da 5 cifre, né null`,
    );
  }
});

test("an answer that is not an object is rejected", () => {
  assert.equal(findTriageProblem("reso"), "la risposta non è un oggetto JSON");
  assert.equal(findTriageProblem(null), "la risposta non è un oggetto JSON");
});
