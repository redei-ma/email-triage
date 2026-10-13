// The order number rule of solution A, one case per decision: the common ways
// of writing the same number are accepted, anything that is not clearly an
// order number is not.

import { test } from "node:test";
import assert from "node:assert/strict";
import { findOrderNumber } from "../src/rules.ts";

test("common ways of writing an order number are normalized", () => {
  for (const text of ["ORD-48213", "ord 48213", "ORD48213", "ordine n° 48213", "Ordine: 48213", "ordine numero 48213", "ord#48213"]) {
    assert.equal(findOrderNumber(text), "ORD-48213", text);
  }
});

test("four or six digits are not an order number", () => {
  // The two numbers the local model copied in test-05 and test-15.
  assert.equal(findOrderNumber("ORD-8462"), null);
  assert.equal(findOrderNumber("ORD-764219"), null);
});

test("five digits without \"ord\" in front are not an order number", () => {
  // Postcodes and promo codes (dev-15), or a bare "numero".
  assert.equal(findOrderNumber("CAP 35100, codice SCONTO 12345"), null);
  assert.equal(findOrderNumber("numero 48213"), null);
});

test("\"ord\" inside another word does not count", () => {
  assert.equal(findOrderNumber("record 12345"), null);
  assert.equal(findOrderNumber("ordinato 48213"), null);
});

test("with two order numbers, the first one wins", () => {
  assert.equal(findOrderNumber("ORD-11111 e poi ORD-22222"), "ORD-11111");
});

test("known limit: \"ord.\" followed by \"nr.\" is not recognized", () => {
  // The rule takes a dot or an abbreviation of "numero" after "ord", not
  // both. No email of the dataset writes it this way; the rules are frozen
  // (v1), so this is listed in the README's limitations instead of fixed.
  assert.equal(findOrderNumber("ord. nr. 48213"), null);
});
