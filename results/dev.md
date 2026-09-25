# Results on data/dev

15 emails, run on 2026-09-25. Local model: qwen2.5:7b (Ollama). Cloud model: gemini-3.5-flash-lite.

| Solution | Category | Order number | Both right | Avg time / email | Avg tokens in / out | Est. cost / 1,000 emails | Retries | Busy replies |
|---|---|---|---|---|---|---|---|---|
| A · rules | 14/15 (93%) | 15/15 (100%) | 14/15 (93%) | < 1 ms | - | $0.00 | - | - |
| B1 · qwen2.5:7b | 14/15 (93%) | 14/15 (93%) | 14/15 (93%) | 937 ms | 997 / 20 | $0.00 | 1 | 0 |
| C1 · regex + qwen2.5:7b | 15/15 (100%) | 15/15 (100%) | 15/15 (100%) | 493 ms | 775 / 9 | $0.00 | 0 | 0 |
| B2 · gemini-3.5-flash-lite | 15/15 (100%) | 15/15 (100%) | 15/15 (100%) | 2.5 s | 814 / 17 | $0.29 | 0 | 0 |
| C2 · regex + gemini-3.5-flash-lite | 15/15 (100%) | 15/15 (100%) | 15/15 (100%) | 2.4 s | 666 / 8 | $0.22 | 0 | 0 |

Cost: tokens measured on this run, priced at the Gemini list price of 2026-09-25 (paid tier, Standard mode, taxes excluded: $0.3 per million input tokens, $2.5 per million output tokens). The free tier used here costs nothing; the local model has no cost per request. Time counts only the request that succeeded: waits for a busy service and pauses to respect the rate limit are excluded. Retries: answers in the wrong format that needed a second attempt. Busy replies: HTTP 503 or 429 from the service.

## Errors of A · rules (1)

- dev-02: expected reso / ORD-73105, got garanzia / ORD-73105

## Errors of B1 · qwen2.5:7b (1)

- dev-09: expected stato_ordine / null, got an answer still invalid after the retry; the model was told: "numero_ordine "ORD-1234" non è "ORD-" seguito da 5 cifre, né null"

## Errors of C1 · regex + qwen2.5:7b (0)

None.

## Errors of B2 · gemini-3.5-flash-lite (0)

None.

## Errors of C2 · regex + gemini-3.5-flash-lite (0)

None.
