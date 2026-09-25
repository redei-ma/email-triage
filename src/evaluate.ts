// Runs every solution on one folder of labeled emails and reports, for each,
// how many answers are right, how long an email takes and what it would cost.
// Usage: node --env-file-if-exists=.env src/evaluate.ts <folder> [--local | --cloud]
// The same report is printed and written to runs/<folder name>-<time>.md.
// results/ holds the official runs quoted in the README; nothing writes there.

import { mkdirSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { classifyWithLlm } from "./classify.ts";
import { loadDataset, type Email } from "./dataset.ts";
import { askGemini, askOllama, GEMINI_MODEL, GEMINI_PRICE, OLLAMA_MODEL, type AskLlm } from "./llm.ts";
import { CATEGORY_TASK, TRIAGE_TASK, type LlmTask } from "./prompt.ts";
import { classifyWithRules, findOrderNumber } from "./rules.ts";
import type { Category, Triage } from "./types.ts";

// What a solution answered for one email. categoria is null when the model
// gave no valid category; the whole answer is null when a full triage (B) was
// still invalid after the retry, which counts as wrong on both fields.
type Answer = { categoria: Category | null; numero_ordine: string | null };

type Outcome = { email: Email; answer: Answer | null; problem: string | null };

type Run = {
  name: string;
  outcomes: Outcome[];
  totalMs: number;
  usesLlm: boolean;
  retries: number;
  busy: number;
  inputTokens: number;
  outputTokens: number;
  costDollars: number;
};

type Price = { inputPerMillion: number; outputPerMillion: number };

// A: rules only. Timed per email like the others, though it takes microseconds.
function runRules(emails: Email[]): Run {
  const run = emptyRun("A · rules", false);
  for (const email of emails) {
    const start = performance.now();
    const answer = classifyWithRules(email.text);
    run.totalMs += performance.now() - start;
    run.outcomes.push({ email, answer, problem: null });
  }
  return run;
}

// B and C: a language model does the task on each email, then toAnswer turns
// its valid answer (or null) into the solution's answer. For B that is the
// model's answer as it is; for C it is the model's category plus the order
// number found by the regular expression.
async function runLlm<T>(
  name: string,
  ask: AskLlm,
  task: LlmTask<T>,
  toAnswer: (answer: T | null, email: Email) => Answer | null,
  price: Price | null, // null for the local model, which costs nothing per request
  emails: Email[],
): Promise<Run> {
  const run = emptyRun(name, true);
  for (const email of emails) {
    const result = await classifyWithLlm(ask, task, email.text);
    run.outcomes.push({ email, answer: toAnswer(result.answer, email), problem: result.problem });
    run.totalMs += result.ms;
    if (result.retried) run.retries++;
    run.busy += result.busyRetries;
    run.inputTokens += result.inputTokens;
    run.outputTokens += result.outputTokens;
    if (price !== null) {
      run.costDollars +=
        (result.inputTokens * price.inputPerMillion + result.outputTokens * price.outputPerMillion) / 1_000_000;
    }
  }
  return run;
}

function emptyRun(name: string, usesLlm: boolean): Run {
  return { name, outcomes: [], totalMs: 0, usesLlm, retries: 0, busy: 0, inputTokens: 0, outputTokens: 0, costDollars: 0 };
}

// B keeps the model's triage; an invalid one stays null, wrong on both fields.
function fullTriage(answer: Triage | null): Answer | null {
  return answer;
}

// C takes only the category from the model and the order number from the
// regular expression, so a missing category does not cost the order number.
function categoryPlusRegex(answer: { categoria: Category } | null, email: Email): Answer {
  return { categoria: answer === null ? null : answer.categoria, numero_ordine: findOrderNumber(email.text) };
}

// ---- Report -------------------------------------------------------------------

function isCategoryRight(outcome: Outcome): boolean {
  return outcome.answer !== null && outcome.answer.categoria === outcome.email.expected.categoria;
}

function isOrderNumberRight(outcome: Outcome): boolean {
  return outcome.answer !== null && outcome.answer.numero_ordine === outcome.email.expected.numero_ordine;
}

function score(run: Run, isRight: (outcome: Outcome) => boolean): string {
  const right = run.outcomes.filter(isRight).length;
  const total = run.outcomes.length;
  return `${right}/${total} (${Math.round((right / total) * 100)}%)`;
}

function formatTime(ms: number): string {
  if (ms < 1) return "< 1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatAnswer(answer: Answer): string {
  return `${answer.categoria ?? "no valid category"} / ${answer.numero_ordine ?? "null"}`;
}

function report(folder: string, runs: Run[], notes: string[]): string {
  const count = runs[0].outcomes.length;
  const lines = [
    `# Results on ${folder}`,
    "",
    `${count} emails, run on ${new Date().toISOString().slice(0, 10)}. ` +
      `Local model: ${OLLAMA_MODEL} (Ollama). Cloud model: ${GEMINI_MODEL}.`,
    "",
    "| Solution | Category | Order number | Both right | Avg time / email | Avg tokens in / out | Est. cost / 1,000 emails | Retries | Busy replies |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const run of runs) {
    const tokens = run.usesLlm
      ? `${Math.round(run.inputTokens / count)} / ${Math.round(run.outputTokens / count)}`
      : "-";
    const cost = `$${((run.costDollars / count) * 1000).toFixed(2)}`;
    lines.push(
      `| ${run.name} | ${score(run, isCategoryRight)} | ${score(run, isOrderNumberRight)} | ` +
        `${score(run, (o) => isCategoryRight(o) && isOrderNumberRight(o))} | ${formatTime(run.totalMs / count)} | ` +
        `${tokens} | ${cost} | ${run.usesLlm ? run.retries : "-"} | ${run.usesLlm ? run.busy : "-"} |`,
    );
  }
  lines.push(
    "",
    `Cost: tokens measured on this run, priced at the Gemini list price of 2026-09-25 ` +
      `(paid tier, Standard mode, taxes excluded: $${GEMINI_PRICE.inputPerMillion} per million input tokens, ` +
      `$${GEMINI_PRICE.outputPerMillion} per million output tokens). The free tier used here costs nothing; ` +
      `the local model has no cost per request. Time counts only the request that succeeded: waits for a busy ` +
      `service and pauses to respect the rate limit are excluded. Retries: answers in the wrong format that ` +
      `needed a second attempt. Busy replies: HTTP 503 or 429 from the service.`,
  );
  for (const note of notes) lines.push("", note);

  for (const run of runs) {
    const wrong = run.outcomes.filter((o) => !(isCategoryRight(o) && isOrderNumberRight(o)));
    lines.push("", `## Errors of ${run.name} (${wrong.length})`, "");
    if (wrong.length === 0) lines.push("None.");
    for (const outcome of wrong) {
      const got =
        outcome.answer === null
          ? // The problem is quoted as it was sent to the model, in Italian.
            `an answer still invalid after the retry; the model was told: "${outcome.problem}"`
          : formatAnswer(outcome.answer);
      lines.push(`- ${outcome.email.id}: expected ${formatAnswer(outcome.email.expected)}, got ${got}`);
    }
  }
  return lines.join("\n") + "\n";
}

// ---- Main ---------------------------------------------------------------------

// The first argument that is not an option is the folder. --local skips the
// cloud model, for a quick run that takes seconds and uses no quota; --cloud
// skips the local model, for anyone who does not want to install Ollama.
const args = process.argv.slice(2);
const localOnly = args.includes("--local");
const cloudOnly = args.includes("--cloud");
// A wrong command line is the user's mistake, not a bug: a plain message
// and a failing exit code, without a stack trace.
function stop(message: string): never {
  console.error(message);
  process.exit(1);
}
if (localOnly && cloudOnly) stop("--local and --cloud exclude each other.");
if (cloudOnly && !process.env.GEMINI_API_KEY) stop("--cloud needs GEMINI_API_KEY in .env (see .env.example).");
const folder = args.find((arg) => !arg.startsWith("--")) ?? "data/test";
const emails = loadDataset(folder);
const runs: Run[] = [];
const notes: string[] = [];

console.log(`A: rules on ${emails.length} emails`);
runs.push(runRules(emails));

if (cloudOnly) {
  notes.push("B1 and C1 were skipped: cloud-only run (--cloud).");
} else {
  // Loading the model into memory takes seconds and happens on the first call
  // only: do it once, untimed, so it does not inflate the first email's time.
  console.log(`Warming up ${OLLAMA_MODEL}`);
  // It is also the first contact with Ollama: if it fails, say how to fix it
  // instead of dying with a stack trace.
  try {
    await askOllama("Rispondi ok.", "ok", {});
  } catch (error) {
    stop(
      `${error instanceof Error ? error.message : String(error)}\n` +
        `Start Ollama and download the model with: ollama pull ${OLLAMA_MODEL}`,
    );
  }
  console.log("B1, C1: local model");
  runs.push(await runLlm("B1 · " + OLLAMA_MODEL, askOllama, TRIAGE_TASK, fullTriage, null, emails));
  runs.push(await runLlm("C1 · regex + " + OLLAMA_MODEL, askOllama, CATEGORY_TASK, categoryPlusRegex, null, emails));
}

if (localOnly) {
  notes.push("B2 and C2 were skipped: local-only run (--local).");
} else if (process.env.GEMINI_API_KEY) {
  // The free tier allows 15 requests a minute, so requests start at least
  // 4 seconds apart. The wait counts from the start of the previous request,
  // so the time spent waiting for its answer already counts toward it. The
  // wait comes before the request, so it is never timed.
  let lastStart = -Infinity;
  const pacedGemini: AskLlm = async (system, user, schema) => {
    const wait = lastStart + 4000 - performance.now();
    if (wait > 0) await sleep(wait);
    lastStart = performance.now();
    return askGemini(system, user, schema);
  };
  console.log("B2, C2: cloud model (at most one request every 4 seconds, to respect the rate limit)");
  // The cloud can fail for reasons outside the experiment: busy after every
  // retry, or the daily quota used up. Then the whole solution is skipped, not
  // single emails (a score on part of the emails would not compare with the
  // others), and the report is still written with what did run.
  const runCloud = async (name: string, run: () => Promise<Run>) => {
    try {
      runs.push(await run());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`${name} skipped: ${reason}`);
      notes.push(`${name} was skipped: ${reason}.`);
    }
  };
  await runCloud("B2", () => runLlm("B2 · " + GEMINI_MODEL, pacedGemini, TRIAGE_TASK, fullTriage, GEMINI_PRICE, emails));
  await runCloud("C2", () =>
    runLlm("C2 · regex + " + GEMINI_MODEL, pacedGemini, CATEGORY_TASK, categoryPlusRegex, GEMINI_PRICE, emails),
  );
} else {
  notes.push("B2 and C2 were skipped: GEMINI_API_KEY is not set in .env.");
}

const text = report(folder, runs, notes);
// A new file for every run, named after the folder and the UTC time, so no
// run overwrites another; the "wx" flag makes sure of it.
const time = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
mkdirSync("runs", { recursive: true });
const file = `runs/${basename(folder)}-${time}.md`;
writeFileSync(file, text, { flag: "wx" });
console.log("\n" + text);
console.log(`Written to ${file}`);
