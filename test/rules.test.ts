// Regression test: solution A must still give the results published in
// results/dev.md and results/test-1.md. The rules are frozen (v1), so a change
// that makes this fail also makes the README's numbers false;

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadDataset } from "../src/dataset.ts";
import { classifyWithRules } from "../src/rules.ts";

/**
 * Every email the rules get wrong in `data/<folder>`, as "id: categoria /
 * numero_ordine" with the answer given, the same form as the reports.
 */
function rulesErrors(folder: string): string[] {
  const emails = loadDataset(join(import.meta.dirname, "..", "data", folder));
  const errors: string[] = [];
  for (const email of emails) {
    const answer = classifyWithRules(email.text);
    if (
      answer.categoria !== email.expected.categoria ||
      answer.numero_ordine !== email.expected.numero_ordine
    ) {
      errors.push(`${email.id}: ${answer.categoria} / ${answer.numero_ordine}`);
    }
  }
  return errors;
}

test("rules on the dev set: 14/15, wrong only on dev-02", () => {
  assert.deepEqual(rulesErrors("dev"), ["dev-02: garanzia / ORD-73105"]);
});

test("rules on the test set: 20/25, wrong on the five published errors", () => {
  assert.deepEqual(rulesErrors("test"), [
    "test-03: garanzia / ORD-60437",
    "test-12: reso / ORD-85743",
    "test-14: altro / ORD-54281",
    "test-19: altro / null",
    "test-25: stato_ordine / null",
  ]);
});
