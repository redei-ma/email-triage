// The validate-and-retry logic of solutions B and C, with a fake model in
// place of Ollama or Gemini: it returns answers written here, so the logic
// runs without a model, a network or a key.

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyWithLlm } from "../src/classify.ts";
import type { AskLlm } from "../src/llm.ts";
import { TRIAGE_TASK } from "../src/prompt.ts";

const EMAIL = "Oggetto: reso\n\nVorrei restituire gli occhiali dell'ordine ORD-48213.";
const VALID = '{"categoria":"reso","numero_ordine":"ORD-48213"}';

/**
 * A model that gives the answers in order, one per call, each taking 100 ms
 * and 10 tokens in, 2 out. `prompts` collects what it was asked.
 */
function fakeModel(answers: string[]): { ask: AskLlm; prompts: string[] } {
  const prompts: string[] = [];
  const ask: AskLlm = async (_system, user) => {
    const text = answers[prompts.length];
    if (text === undefined) throw new Error("the model was asked more times than expected");
    prompts.push(user);
    return { text, inputTokens: 10, outputTokens: 2, ms: 100, busyRetries: 0 };
  };
  return { ask, prompts };
}

test("a valid first answer is taken, with no retry", async () => {
  const model = fakeModel([VALID]);
  const result = await classifyWithLlm(model.ask, TRIAGE_TASK, EMAIL);
  assert.deepEqual(result.answer, { categoria: "reso", numero_ordine: "ORD-48213" });
  assert.equal(result.retried, false);
  assert.equal(model.prompts.length, 1);
});

test("an invalid first answer gets one retry, which is taken if valid", async () => {
  const model = fakeModel(['{"categoria":"reso","numero_ordine":"ORD-8462"}', VALID]);
  const result = await classifyWithLlm(model.ask, TRIAGE_TASK, EMAIL);
  assert.deepEqual(result.answer, { categoria: "reso", numero_ordine: "ORD-48213" });
  assert.equal(result.retried, true);
  // A retry is part of what the solution costs: both attempts are counted.
  assert.equal(result.ms, 200);
  assert.equal(result.inputTokens, 20);
  assert.equal(result.outputTokens, 4);
});

test("the retry shows the model its answer and what was wrong with it", async () => {
  // At temperature 0 the same prompt would give the same answer again.
  const wrong = '{"categoria":"reso","numero_ordine":"ORD-8462"}';
  const model = fakeModel([wrong, VALID]);
  await classifyWithLlm(model.ask, TRIAGE_TASK, EMAIL);
  assert.ok(model.prompts[1].includes(wrong));
  assert.ok(model.prompts[1].includes('numero_ordine "ORD-8462" non è "ORD-" seguito da 5 cifre, né null'));
});

test("invalid twice: no answer, and no third attempt", async () => {
  // What happened to the local model on test-05 in the published results.
  const wrong = '{"categoria":"reso","numero_ordine":"ORD-8462"}';
  const model = fakeModel([wrong, wrong]);
  const result = await classifyWithLlm(model.ask, TRIAGE_TASK, EMAIL);
  assert.equal(result.answer, null);
  assert.equal(result.retried, true);
  assert.equal(model.prompts.length, 2);
});

test("text that is not JSON is an invalid answer, not a crash", async () => {
  const model = fakeModel(["La categoria è reso.", VALID]);
  const result = await classifyWithLlm(model.ask, TRIAGE_TASK, EMAIL);
  assert.equal(result.problem, "la risposta non è un oggetto JSON");
  assert.deepEqual(result.answer, { categoria: "reso", numero_ordine: "ORD-48213" });
});
