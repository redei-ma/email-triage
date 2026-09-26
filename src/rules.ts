// Solution A: keywords for the category, a regular expression for the order
// number. No model, no network: fast, free and fully predictable.

import type { Category, Triage } from "./types.ts";

/**
 * An order number is "ord" or "ordine", an optional abbreviation of "numero",
 * an optional separator, then exactly five digits. The rule accepts the common
 * ways of writing the same number but does not guess: a number with the wrong
 * digit count, or with no "ord" in front, is not an order number.
 *
 *     \bord(?:ine)?                    "ord" or "ordine", at the start of a word
 *     \s*(?:numero|num\.?|nr\.?|n°|n\.?)?  optional "numero", "num.", "nr.", "n°", "n."
 *     \s*[-:#.]?\s*                    optional separator: "-", ":", "#" or "."
 *     (\d{5})(?!\d)                    exactly five digits, not followed by a sixth
 *
 * The "i" flag ignores case: "ORD", "Ord" and "ord" all match.
 */
const ORDER_NUMBER = /\bord(?:ine)?\s*(?:numero|num\.?|nr\.?|n°|n\.?)?\s*[-:#.]?\s*(\d{5})(?!\d)/i;

/**
 * @returns the first order number in the text, normalized to "ORD-12345", or
 * null if there is none.
 */
export function findOrderNumber(text: string): string | null {
  const match = ORDER_NUMBER.exec(text);
  if (match === null) return null;
  return `ORD-${match[1]}`;
}

/**
 * Keywords for each category, as stems anchored at the start of a word:
 * "restitu" covers restituire, restituisco, restituzione. A few entries are
 * fixed expressions ("non funzion", "ancora arrivat") whose words mean one
 * thing only together. Words that fit several categories are left out rather
 * than patched with context rules: that ambiguity is what the LLM is for.
 *
 * The order of the list is the tie-break: on equal scores the earlier
 * category wins. Reso comes first because its words state what the customer
 * wants (a refund), while most garanzia words only describe the problem.
 * "altro" has no keywords: it is what is left when nothing matches.
 */
const KEYWORDS: { category: Category; patterns: RegExp[] }[] = [
  {
    category: "reso",
    patterns: [/\brestitu/g, /\bres[oi]\b/g, /\brimbors/g, /\brecesso/g, /\baccredit/g, /\bcambi/g],
  },
  {
    category: "garanzia",
    patterns: [
      /\bgaranzi/g, /\bdifett/g, /\bripar/g, /\bguast/g, /\brott/g, /\bspezz/g,
      /\bstacc/g, /\ballent/g, /\bgraffi/g, /\bdanneggi/g, /\bsostitu/g, /\bnon funzion/g,
    ],
  },
  {
    category: "stato_ordine",
    patterns: [
      /\bspedi/g, /\bconsegn/g, /\btracking/g, /\btraccia/g, /\bcorrier/g, /\bpacc/g,
      /\britard/g, /\bannull/g, /\b(?:ancora|mai) (?:arrivat|ricevut)/g,
    ],
  },
  {
    category: "info_prodotto",
    patterns: [
      /\bdisponibil/g, /\bmaterial/g, /\bcompatibil/g, /\bgraduat/g, /\bprescrizion/g,
      /\bcertific/g, /\bpolarizz/g, /\buv\b/g, /\bprezz/g, /\bcost[oa]\b/g,
      /\bmanutenzion/g, /\bpulizi/g, /\bpulir/g, /\bmisur/g, /\btagli/g,
    ],
  },
];

/**
 * Scores each category by counting every occurrence of its keywords, so a
 * customer who repeats one word weighs as much as one who uses synonyms.
 *
 * @returns the highest-scoring category, or "altro" if nothing matched.
 */
function scoreCategories(text: string): Category {
  const lower = text.toLowerCase();
  let best: Category = "altro";
  let bestScore = 0;
  for (const { category, patterns } of KEYWORDS) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = lower.match(pattern); // every occurrence, thanks to the "g" flag
      if (matches !== null) score += matches.length;
    }
    if (score > bestScore) { // strictly greater: on a tie the earlier category stays
      best = category;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Solution A. The subject line is scored together with the body, with the
 * same weight: a rule letting the subject decide changed nothing on the
 * development set.
 */
export function classifyWithRules(text: string): Triage {
  return { categoria: scoreCategories(text), numero_ordine: findOrderNumber(text) };
}
