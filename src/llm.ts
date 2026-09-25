// The two language-model providers, behind the same signature. Each function
// knows its own API (URL, request shape, where the answer and the token counts
// are); from outside they are interchangeable, so adding a provider means
// adding one function here.

import { setTimeout as sleep } from "node:timers/promises";

export type LlmReply = {
  text: string; // the raw answer, still to be parsed and validated
  inputTokens: number;
  outputTokens: number; // billed output, thinking included
  ms: number; // duration of the request that succeeded, waits excluded
  busyRetries: number; // how many times the service said it was busy first
};

// system: the fixed instructions, the same for every email.
// user: the email to classify.
// schema: the JSON shape the answer must have; the provider constrains
// generation to it (the schemas are defined with the tasks, in prompt.ts).
export type AskLlm = (system: string, user: string, schema: object) => Promise<LlmReply>;

// ---- Local model: Ollama -------------------------------------------------

export const OLLAMA_MODEL = "qwen2.5:7b";
const OLLAMA_URL = "http://localhost:11434/api/chat";

export async function askOllama(system: string, user: string, schema: object): Promise<LlmReply> {
  const { data, ms, busyRetries } = await postJson("Ollama", OLLAMA_URL, {}, {
    model: OLLAMA_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    format: schema,
    stream: false, // one complete answer instead of a stream of pieces
    options: { temperature: 0 },
  });
  return {
    text: readText(data, ["message", "content"]),
    inputTokens: readCount(data, ["prompt_eval_count"]),
    outputTokens: readCount(data, ["eval_count"]),
    ms,
    busyRetries,
  };
}

// ---- Cloud model: Gemini (optional, needs GEMINI_API_KEY in .env) ---------

// Flash-Lite rather than Flash: on the free tier Flash allows 20 requests a
// day, fewer than the 25 test emails, while Flash-Lite allows 500 a day and
// 15 a minute (AI Studio, 2026-09-25). So anyone can rerun the evaluation for free.
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// List price in US dollars per million tokens, paid tier, as of 2026-09-25.
// The free tier costs nothing; this is what the same run would cost when paid.
export const GEMINI_PRICE = { inputPerMillion: 0.3, outputPerMillion: 2.5 };

export async function askGemini(system: string, user: string, schema: object): Promise<LlmReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  // The key goes in a header rather than in the URL, so it never ends up in logs.
  const { data, ms, busyRetries } = await postJson("Gemini", GEMINI_URL, { "x-goog-api-key": apiKey }, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      // Google strongly recommends the default 1.0 for Gemini 3 models: lower
      // values "may lead to unexpected behavior, such as looping or degraded
      // performance". So Gemini runs as its maker advises, unlike Ollama.
      temperature: 1.0,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      // The lowest thinking level: sorting an email needs little reasoning,
      // and the local model does not reason at all.
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  });
  return {
    text: readText(data, ["candidates", 0, "content", "parts", 0, "text"]),
    inputTokens: readCount(data, ["usageMetadata", "promptTokenCount"]),
    // Thinking tokens are billed as output, so they count here too.
    outputTokens:
      readCount(data, ["usageMetadata", "candidatesTokenCount"]) +
      readCount(data, ["usageMetadata", "thoughtsTokenCount"]),
    ms,
    busyRetries,
  };
}

// ---- HTTP -----------------------------------------------------------------

// 429 (too many requests this minute) and 503 (overloaded) mean the service is
// busy, not that the model answered badly: wait and send the same request
// again, up to eight times, doubling the wait up to a 30-second cap (2, 4, 8,
// 16, 30, 30, 30, 30 seconds). On the free tier Gemini often answers 503
// several times in a row at busy hours, on every model. A 429 for the daily
// quota is different: it will not clear in seconds, so it stops the run.
const BUSY_STATUSES = [429, 503];
const MAX_BUSY_RETRIES = 8;
const MAX_WAIT_MS = 30_000;

async function postJson(
  provider: string,
  url: string,
  headers: Record<string, string>,
  body: object,
): Promise<{ data: unknown; ms: number; busyRetries: number }> {
  for (let busyRetries = 0; ; busyRetries++) {
    const start = performance.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    if (BUSY_STATUSES.includes(response.status) && busyRetries < MAX_BUSY_RETRIES) {
      const detail = await response.text();
      if (detail.includes("PerDay")) throw new Error(`${provider}: daily quota exhausted: ${detail}`);
      await sleep(Math.min(2000 * 2 ** busyRetries, MAX_WAIT_MS));
      continue;
    }
    if (!response.ok) throw new Error(`${provider}: HTTP ${response.status}: ${await response.text()}`);
    const data: unknown = await response.json();
    return { data, ms: performance.now() - start, busyRetries };
  }
}

// ---- Reading the JSON the providers send back -----------------------------

// Follows a path of keys and indexes into a parsed JSON value, for example
// ["message", "content"]. Returns undefined as soon as a step is missing, so
// the answer never has to be trusted with a cast to its expected shape.
function dig(value: unknown, path: (string | number)[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    // Any object can be indexed by key; what comes out is still unknown.
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

// The answer text is essential: without it there is nothing to evaluate.
function readText(data: unknown, path: (string | number)[]): string {
  const text = dig(data, path);
  if (typeof text !== "string") throw new Error(`unexpected response: no text at ${path.join(".")}`);
  return text;
}

// Token counts are secondary: a missing one counts as 0 instead of stopping
// the run (Ollama, for instance, omits prompt_eval_count for a cached prompt).
function readCount(data: unknown, path: (string | number)[]): number {
  const count = dig(data, path);
  return typeof count === "number" ? count : 0;
}
