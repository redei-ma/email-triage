# email-triage

An eyewear retailer's customer inbox: each email has to reach the right
department, with the order number it refers to. This experiment asks when
keyword rules are enough and when a language model is worth its cost. It
compares rules, a local model, a cloud model and hybrids of the two, all in
TypeScript on Node, measured on a held-out test set that stayed closed until
rules and prompt were frozen.

## In short

Rules are the right tool for the order number, a mechanical pattern; a
language model for the category, which needs context. Combined, a regular
expression and a local 7B model got all 25 held-out emails right in all three
runs, in about half a second per email, with no cost per request and no email
leaving the machine.

| Solution | Both fields right | Time / email | Cost / 1,000 emails |
|---|---|---|---|
| A · keyword rules + regex | 80% | < 1 ms | $0 |
| B1 · local model (qwen2.5:7b) | 88% | 1.1 s | $0 |
| **C1 · regex + local model** | **100%** | **0.55 s** | **$0** |
| B2 · cloud model (gemini-3.5-flash-lite) | 96–100% | 2.5–9.3 s | $0.29 |
| C2 · regex + cloud model | 96–100% | 2.4–6.8 s | $0.22 |

## The task

Given one email, return:

```json
{ "categoria": "reso", "numero_ordine": "ORD-52870" }
```

- `categoria`: `reso` (return or exchange), `garanzia` (warranty repair or
  identical replacement), `stato_ordine` (an order not yet received),
  `info_prodotto` (product questions) or `altro`. When an email carries two
  requests, the main one counts. The definitions and their borderline cases
  are in [`data/categories.md`](data/categories.md), which both the labels and
  the prompt follow.
- `numero_ordine`: `"ORD-"` plus five digits, however the customer wrote it
  (`Ord 52870`, `ord61742`, `ordine n. 48213`), or `null` when absent or not a
  valid order number (four or six digits, a promo code, a phone number).

Urgency is left out on purpose: the receiving department decides it, and
without a shared criterion its labels would be arbitrary.

## Dataset

40 emails in Italian: 15 for development (`data/dev/`), 25 for testing
(`data/test/`), the same number per category. They were generated with
ChatGPT, a model from another vendor than the two evaluated, and asked to
include hard cases: warranty requests without the word "warranty", malformed
order numbers, two requests in one email, one-line messages, an angry tone on
a simple question. Every label was checked by hand against the definitions
(0 changed of 15, 0 of 25).

The commit history shows the order: development set, rules and prompt
written on it alone, evaluation frozen, then the test set, then the results.

## Solutions

- **A. Rules.** The order number comes from one regular expression: `ord` or
  `ordine` in front, an optional "n." or "numero", exactly five digits. It
  accepts the usual ways of writing a number and does not guess. The category
  comes from keyword stems (`restitu` covers restituire, restituzione): every
  occurrence scores a point, the highest score wins, a tie goes to `reso`,
  no keyword means `altro`. Words that fit several categories were left out
  rather than patched with context rules: that ambiguity is the model's job.
- **B. A model does everything.** One prompt with the definitions, the email
  between `<email>` tags, and the output format. The providers constrain the
  answer to a JSON schema; the code still checks the order-number format and
  allows one retry that says what was wrong. An answer still invalid counts
  as wrong on both fields. **B1** runs `qwen2.5:7b` locally through Ollama at
  temperature 0. **B2** runs `gemini-3.5-flash-lite` on the Gemini free tier,
  at temperature 1.0 as Google recommends for Gemini 3 models.
- **C. Hybrid.** The regular expression gives the order number and the model,
  with a shorter prompt, the category only: C1 with the local model, C2 with
  the cloud one. Running both avoids choosing "the better model" after seeing
  the test.

## Results

Test set, 25 emails, three runs decided before the first
([1](results/test-1.md), [2](results/test-2.md), [3](results/test-3.md)).
A, B1 and C1 gave the same answers every time; ranges show where the cloud
model varied.

| Solution | Category | Order number | Both right | Time / email | Tokens in / out | Cost / 1,000 emails |
|---|---|---|---|---|---|---|
| A · rules | 20/25 | 25/25 | 20/25 | < 1 ms | - | $0 |
| B1 · qwen2.5:7b | 23/25 | 22/25 | 22/25 | 1.1 s | 1007 / 22 | $0 |
| C1 · regex + qwen2.5:7b | 25/25 | 25/25 | 25/25 | 0.54–0.58 s | 771 / 9 | $0 |
| B2 · gemini-3.5-flash-lite | 24–25/25 | 25/25 | 24–25/25 | 2.5–9.3 s | 811 / 19–20 | $0.29 |
| C2 · regex + gemini-3.5-flash-lite | 24–25/25 | 25/25 | 24–25/25 | 2.4–6.8 s | 663 / 8 | $0.22 |

On the 15 development emails ([results/dev.md](results/dev.md)) every
solution scored 14/15 or 15/15.

- **Time** counts only the request that succeeded, not waits for a busy
  service. Local times: MacBook Pro, Apple M5, 32 GB, Ollama 0.34.4. The cloud
  time mostly reflects how busy the free tier was.
- **Cost** uses the tokens measured on the run at the Gemini list price of
  2026-09-25 (paid tier, Standard mode, taxes excluded: $0.30 per million
  input tokens, $2.50 per million output). All input is priced in full,
  without the cache discount a burst of test requests would get. The free
  tier used here costs nothing; the local model needs a machine, not a bill.

## Errors worth reading

- **test-03, rules**: *"Non mi interessa una sostituzione, vorrei riavere i
  soldi"*. A refund, classified as warranty: keywords cannot read "not". The
  same error appeared in development, so it was predicted.
- **test-12, rules**: *"Il tracking non cambia da 2 giorni"*. "cambia" scores
  for an exchange, "tracking" for the order status, and the tie goes to
  `reso`: the ambiguous word was kept knowing this could happen.
- **test-10, local model**: the customer wrote `ORD-3146`, four digits, so the
  answer is `null`. Qwen answered `ORD-31465`, adding a digit: a well-formed,
  invented number that no format check can catch. On test-05 and test-15 it
  copied four- and six-digit numbers and the answers were rejected, although
  their category was right.
- **test-25, cloud model**: a rambling message that asks for nothing,
  labeled `altro`. Gemini called it `info_prodotto` in one run of B2 and one
  of C2: at temperature 1.0 a borderline email can change answer.

## Conclusions

**Split the task by its nature.** The order number is a mechanical pattern:
the regular expression got 25/25 and never invents a digit, while the
language models copied malformed numbers or, once, added a digit that was not
in the email (test-10). The category needs context: keyword rules got 80%
right, and their five errors came from a negation, an ambiguous word and
vocabulary missing from the list, which more keywords would not fix reliably.
A post-test check shows the local model understood all 25 emails and failed
only when copying an order number.

**The hybrid is the best trade-off.** Regex for the order number plus a model
for the category (C) scored 25/25 with the local model in all three runs, in
about half the time of the full LLM answer and with less than half the output
tokens. With 25 test emails, C1, C2 and B2 are one email apart: a tie on
accuracy.

**Local over cloud, for this task.** The local model gave identical results
in all three runs, never got a busy reply, answered in 0.54–0.58 s, and no
email left the machine. The cloud model's time ranged from 2.5 to 9.3 s on
its free tier, and it changed its answer on one email between runs. Cost
does not decide: at list price the cloud option costs $0.22–0.29 per 1,000
emails. Privacy, stability and independence from an external service do. A
company could run larger local models on its own hardware.

**A hypothesis, not a result.** Four of the rules' five errors were emails
with no keyword or a tie, so the keyword score could decide which emails
need the model at all. But the rules were also wrong once when they looked
sure (the negation), so this would need a new test set before relying on it.

## Limitations

- 25 test emails show large differences, not small ones: one email is 4
  points.
- The emails were written by an LLM: new, so no model saw them in training,
  but likely easier for another LLM than real email. They also have few
  typos; a misspelled keyword ("rimborzo") defeats the rules, not a model.
- No test email carries two requests from different categories, and some
  resemble the development ones (same generator, same prompt).
- The cloud model is a small free-tier one; a larger paid model was not
  tested and could do better everywhere.
- Nothing was changed after the test was opened.

## From prototype to production

Incoming emails would go on a queue, with workers taking them and more
workers as it grows; one C1 worker on the machine above handles about 6,500
emails an hour. Invalid answers go to a queue for a person. Monitoring would
track invalid answers, retries and the mix of categories, plus a sample
checked by hand, since the labels, not the model, define correctness.

## Build and run

Docker needs nothing else; Node needs Node 23.6 or later and, for the local
model, [Ollama](https://ollama.com). The cloud model needs a free Gemini API
key in `.env` (`cp .env.example .env`); without it B2 and C2 are skipped.

```bash
git clone https://github.com/redei-ma/email-triage.git
cd email-triage

# Docker
make          # every solution on the test set (make dev: development set)
make local    # local model only
make cloud    # cloud model only, never starts Ollama
make help     # all targets, including cleanup

# or Node
npm ci
ollama pull qwen2.5:7b
npm run evaluate          # also evaluate:dev, evaluate:local, evaluate:cloud
```

`make` uses the Ollama installed on the machine when the container can reach
it, and otherwise starts one in a container (about 12 GB to download the
first time). Docker cannot use a Mac's GPU, so Ollama in a container is 2.5
to 3.5 times slower with the same answers; the published times use Ollama
on the Mac, which Docker matches. Cloud requests are spaced 4 seconds apart
for the free tier, so a full run takes 3.5 to 8 or more minutes; if Gemini
stays busy or the daily quota runs out, that solution is skipped with a note.
Each run writes its report to `runs/`; the official ones in `results/` are
never overwritten.

## Notes

Tested on macOS (Apple Silicon) and Linux arm64, natively and in Docker;
x86_64 was checked in emulation, code only. On Linux, where Ollama listens
only on 127.0.0.1 by default, `make` uses the Ollama container; `OLLAMA=host`
or `OLLAMA=docker` forces the choice.

## Repository layout

```
data/categories.md     category definitions, shared by the labels and the prompt
src/rules.ts           solution A
src/llm.ts             the two providers, behind one signature
src/prompt.ts          the two tasks: full triage (B) and category only (C)
src/classify.ts        validation and the single retry
src/evaluate.ts        runs every solution and writes a report to runs/
results/               the official reports quoted above
compose.ollama.yaml    Ollama in a container, added only when needed
```
