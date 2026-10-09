// Reads the test set and the first results report of the experiment and
// writes public/data/results.json, the only data file the UI reads.
//
// It fails loudly (throws) on anything it did not expect, instead of
// guessing, because a silent misparse would show wrong numbers on the page.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
// The experiment lives one level up: ui/ is a folder of the email-triage repo.
const sourceRoot = path.join(root, "..");
const testDir = path.join(sourceRoot, "data", "test");
const reportPath = path.join(sourceRoot, "results", "test-1.md");

// One sentence per solution, for the Results page. Not in the source
// markdown, written by hand from email-triage's README.
const SOLUTION_DESCRIPTIONS = {
  A: "Keyword rules score the category by stem matches, and a regular expression finds and normalizes the order number: no model, no network, fully predictable.",
  B1: "A local 7B model (qwen2.5:7b, through Ollama) answers category and order number together from one prompt, running entirely on the machine.",
  C1: "The regular expression supplies the order number, and the local model is asked for the category only, in a shorter prompt.",
  B2: "The same full-triage prompt, sent to a cloud model (Gemini Flash-Lite), at the cost of latency and a per-request price.",
  C2: "The regular expression supplies the order number, and the cloud model is asked for the category only.",
};

function fail(message) {
  throw new Error(`import: ${message}`);
}

function solutionIdFromName(name) {
  // "A · rules" -> "A", "C1 · regex + qwen2.5:7b" -> "C1"
  const id = name.split("·")[0]?.trim();
  if (id === undefined || id === "") fail(`could not read a solution id from "${name}"`);
  return id;
}

function readLabels() {
  const raw = readFileSync(path.join(testDir, "labels.json"), "utf8");
  const labels = JSON.parse(raw);
  if (!Array.isArray(labels) || labels.length !== 25) {
    fail(`expected 25 labels in labels.json, found ${Array.isArray(labels) ? labels.length : "not an array"}`);
  }
  for (const label of labels) {
    if (typeof label.id !== "string" || typeof label.categoria !== "string") {
      fail(`malformed label entry: ${JSON.stringify(label)}`);
    }
  }
  return labels;
}

function readEmailTexts(labels) {
  const texts = {};
  for (const label of labels) {
    const filePath = path.join(testDir, `${label.id}.txt`);
    try {
      texts[label.id] = readFileSync(filePath, "utf8").trim();
    } catch {
      fail(`missing test email file for "${label.id}" (expected ${filePath})`);
    }
  }
  return texts;
}

function parseRunLine(report) {
  const line = report.split("\n").find((line) => line.includes("run on"));
  if (line === undefined) fail('could not find the "run on ..." line with the local and cloud model names');

  // Model names (e.g. "gemini-3.5-flash-lite") contain dots, so each field is
  // read up to the next labeled field or the end of the line, not up to "."
  const runDate = line.match(/run on (\d{4}-\d{2}-\d{2})/)?.[1];
  const localModel = line.match(/Local model: (.+?) \(/)?.[1];
  const cloudModel = line.match(/Cloud model: (.+?)\.?\s*$/)?.[1];
  if (runDate === undefined || localModel === undefined || cloudModel === undefined) {
    fail(`could not read date/local model/cloud model from: "${line}"`);
  }
  return { runDate, localModel, cloudModel };
}

function parseTable(report) {
  const lines = report.split("\n").filter((line) => line.startsWith("|") && !line.includes("---"));
  const solutions = [];
  for (const line of lines) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells[0] === "Solution") continue; // header row
    const [name, category, orderNumber, bothRight, avgTime, , costPer1000] = cells;
    if (name === undefined || category === undefined || orderNumber === undefined || bothRight === undefined) {
      fail(`malformed table row: "${line}"`);
    }
    const id = solutionIdFromName(name);
    if (SOLUTION_DESCRIPTIONS[id] === undefined) fail(`no description written for solution "${id}"`);
    solutions.push({
      id,
      name,
      description: SOLUTION_DESCRIPTIONS[id],
      category,
      orderNumber,
      bothRight,
      avgTime,
      costPer1000: costPer1000 ?? fail(`missing cost column for "${name}"`),
    });
  }
  if (solutions.length !== 5) fail(`expected 5 solutions in the results table, found ${solutions.length}`);
  return solutions;
}

const BULLET_INVALID = /^- (test-\d{2}): expected (\w+) \/ (ORD-\d{5}|null), got an answer still invalid after the retry; the model was told: (.+)$/;
const BULLET_NORMAL = /^- (test-\d{2}): expected (\w+) \/ (ORD-\d{5}|null), got (\w+) \/ (ORD-\d{5}|null)$/;

function parseErrorSections(report, solutions, labelsById) {
  const errorsBySolution = {};
  for (const solution of solutions) {
    const heading = `## Errors of ${solution.name} (`;
    const start = report.indexOf(heading);
    if (start === -1) fail(`no "Errors of" section for solution "${solution.name}"`);
    const countMatch = report.slice(start).match(/\((\d+)\)/);
    if (countMatch === null) fail(`could not read the error count for "${solution.name}"`);
    const expectedCount = Number(countMatch[1]);

    const sectionEnd = report.indexOf("\n## ", start + heading.length);
    const section = report.slice(start, sectionEnd === -1 ? undefined : sectionEnd);
    const bulletLines = section.split("\n").filter((line) => line.startsWith("- "));

    if (expectedCount === 0) {
      if (!section.includes("None.")) fail(`"${solution.name}" declares 0 errors but has no "None." line`);
      errorsBySolution[solution.id] = {};
      continue;
    }
    if (bulletLines.length !== expectedCount) {
      fail(`"${solution.name}" declares ${expectedCount} errors but lists ${bulletLines.length}`);
    }

    const errors = {};
    for (const line of bulletLines) {
      const invalidMatch = line.match(BULLET_INVALID);
      if (invalidMatch !== null) {
        const [, id, expCategory, expOrder, rawMessage] = invalidMatch;
        checkExpectedMatchesLabel(id, expCategory, expOrder, labelsById, solution.name);
        if (!rawMessage.startsWith('"') || !rawMessage.endsWith('"')) {
          fail(`unexpected quoting in the model message for "${id}" (${solution.name})`);
        }
        errors[id] = { invalid: rawMessage.slice(1, -1) };
        continue;
      }
      const normalMatch = line.match(BULLET_NORMAL);
      if (normalMatch === null) fail(`unparsable error line for "${solution.name}": "${line}"`);
      const [, id, expCategory, expOrder, gotCategory, gotOrder] = normalMatch;
      checkExpectedMatchesLabel(id, expCategory, expOrder, labelsById, solution.name);
      errors[id] = {
        categoria: gotCategory,
        numero_ordine: gotOrder === "null" ? null : gotOrder,
      };
    }
    errorsBySolution[solution.id] = errors;
  }
  return errorsBySolution;
}

function checkExpectedMatchesLabel(id, expCategory, expOrder, labelsById, solutionName) {
  const label = labelsById[id];
  if (label === undefined) fail(`"${solutionName}" lists an error for unknown email "${id}"`);
  const expectedOrder = expOrder === "null" ? null : expOrder;
  if (label.categoria !== expCategory || label.numero_ordine !== expectedOrder) {
    fail(
      `"${solutionName}" error line for "${id}" expects ${expCategory}/${expOrder}, ` +
        `but labels.json says ${label.categoria}/${label.numero_ordine}`,
    );
  }
}

function buildEmails(labels, texts, solutions, errorsBySolution) {
  return labels.map((label) => {
    const expected = { categoria: label.categoria, numero_ordine: label.numero_ordine };
    const answers = {};
    let hasError = false;
    for (const solution of solutions) {
      const error = errorsBySolution[solution.id][label.id];
      if (error === undefined) {
        answers[solution.id] = {
          categoria: expected.categoria,
          numero_ordine: expected.numero_ordine,
          categoriaCorrect: true,
          numeroOrdineCorrect: true,
        };
      } else if ("invalid" in error) {
        answers[solution.id] = { invalid: error.invalid, categoriaCorrect: false, numeroOrdineCorrect: false };
        hasError = true;
      } else {
        answers[solution.id] = {
          categoria: error.categoria,
          numero_ordine: error.numero_ordine,
          categoriaCorrect: error.categoria === expected.categoria,
          numeroOrdineCorrect: error.numero_ordine === expected.numero_ordine,
        };
        hasError = true;
      }
    }
    return { id: label.id, text: texts[label.id], expected, nota: label.nota, answers, hasError };
  });
}

function main() {
  const labels = readLabels();
  const labelsById = Object.fromEntries(labels.map((label) => [label.id, label]));
  const texts = readEmailTexts(labels);
  const report = readFileSync(reportPath, "utf8");
  const { runDate, localModel, cloudModel } = parseRunLine(report);
  const solutions = parseTable(report);
  const errorsBySolution = parseErrorSections(report, solutions, labelsById);
  const emails = buildEmails(labels, texts, solutions, errorsBySolution);

  const data = {
    runDate,
    localModel,
    cloudModel,
    solutions: solutions.map(({ id, name, description, category, orderNumber, bothRight, avgTime, costPer1000 }) => ({
      id,
      name,
      description,
      category,
      orderNumber,
      bothRight,
      avgTime,
      costPer1000,
    })),
    emails,
  };

  const outDir = path.join(root, "public", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "results.json");
  writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, outPath)}: ${emails.length} emails, ${solutions.length} solutions.`);
}

main();
