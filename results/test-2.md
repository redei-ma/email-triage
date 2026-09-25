# Results on data/test

25 emails, run on 2026-09-25. Local model: qwen2.5:7b (Ollama). Cloud model: gemini-3.5-flash-lite.

| Solution | Category | Order number | Both right | Avg time / email | Avg tokens in / out | Est. cost / 1,000 emails | Retries | Busy replies |
|---|---|---|---|---|---|---|---|---|
| A · rules | 20/25 (80%) | 25/25 (100%) | 20/25 (80%) | < 1 ms | - | $0.00 | - | - |
| B1 · qwen2.5:7b | 23/25 (92%) | 22/25 (88%) | 22/25 (88%) | 1.1 s | 1007 / 22 | $0.00 | 2 | 0 |
| C1 · regex + qwen2.5:7b | 25/25 (100%) | 25/25 (100%) | 25/25 (100%) | 577 ms | 771 / 9 | $0.00 | 0 | 0 |
| B2 · gemini-3.5-flash-lite | 24/25 (96%) | 25/25 (100%) | 24/25 (96%) | 3.7 s | 811 / 19 | $0.29 | 0 | 0 |
| C2 · regex + gemini-3.5-flash-lite | 25/25 (100%) | 25/25 (100%) | 25/25 (100%) | 2.9 s | 663 / 8 | $0.22 | 0 | 0 |

Cost: tokens measured on this run, priced at the Gemini list price of 2026-09-25 (paid tier, Standard mode, taxes excluded: $0.3 per million input tokens, $2.5 per million output tokens). The free tier used here costs nothing; the local model has no cost per request. Time counts only the request that succeeded: waits for a busy service and pauses to respect the rate limit are excluded. Retries: answers in the wrong format that needed a second attempt. Busy replies: HTTP 503 or 429 from the service.

## Errors of A · rules (5)

- test-03: expected reso / ORD-60437, got garanzia / ORD-60437
- test-12: expected stato_ordine / ORD-85743, got reso / ORD-85743
- test-14: expected stato_ordine / ORD-54281, got altro / ORD-54281
- test-19: expected info_prodotto / null, got altro / null
- test-25: expected altro / null, got stato_ordine / null

## Errors of B1 · qwen2.5:7b (3)

- test-05: expected reso / null, got an answer still invalid after the retry; the model was told: "numero_ordine "ORD-8462" non è "ORD-" seguito da 5 cifre, né null"
- test-10: expected garanzia / null, got garanzia / ORD-31465
- test-15: expected stato_ordine / null, got an answer still invalid after the retry; the model was told: "numero_ordine "ORD-764219" non è "ORD-" seguito da 5 cifre, né null"

## Errors of C1 · regex + qwen2.5:7b (0)

None.

## Errors of B2 · gemini-3.5-flash-lite (1)

- test-25: expected altro / null, got info_prodotto / null

## Errors of C2 · regex + gemini-3.5-flash-lite (0)

None.
