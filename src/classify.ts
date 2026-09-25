// A language model does a task on one email: the full triage for solution B,
// the category alone for solution C. The answer is validated and, if it is
// not valid, the model gets one more attempt.

import type { AskLlm } from "./llm.ts";
import { emailPrompt, retryPrompt, type LlmTask } from "./prompt.ts";

// T is the type of a valid answer: Triage for B, CategoryOnly for C.
export type LlmResult<T> = {
  answer: T | null; // null if the answer was still invalid after the retry
  problem: string | null; // what was wrong with the first answer, if anything
  retried: boolean;
  // Both attempts together: a retry is part of what the solution costs.
  ms: number;
  inputTokens: number;
  outputTokens: number;
  busyRetries: number;
};

// JSON.parse throws on text that is not JSON; here that is just one more kind
// of invalid answer, which the task's findProblem then describes.
function parseAnswer(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function classifyWithLlm<T>(ask: AskLlm, task: LlmTask<T>, email: string): Promise<LlmResult<T>> {
  const first = await ask(task.system, emailPrompt(email), task.schema);
  const firstAnswer = parseAnswer(first.text);
  const problem = task.findProblem(firstAnswer);
  const result: LlmResult<T> = {
    answer: task.isValid(firstAnswer) ? firstAnswer : null,
    problem,
    retried: false,
    ms: first.ms,
    inputTokens: first.inputTokens,
    outputTokens: first.outputTokens,
    busyRetries: first.busyRetries,
  };
  if (problem === null) return result;

  const second = await ask(task.system, retryPrompt(email, first.text, problem), task.schema);
  const secondAnswer = parseAnswer(second.text);
  result.answer = task.isValid(secondAnswer) ? secondAnswer : null;
  result.retried = true;
  result.ms += second.ms;
  result.inputTokens += second.inputTokens;
  result.outputTokens += second.outputTokens;
  result.busyRetries += second.busyRetries;
  return result;
}
