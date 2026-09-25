// Solution A: keywords for the category, a regular expression for the order
// number. No model, no network: fast, free and fully predictable.

// An order number is "ord" or "ordine", an optional abbreviation of "numero",
// an optional separator, then exactly five digits. The rule accepts the common
// ways of writing the same number but does not guess: a number with the wrong
// digit count, or with no "ord" in front, is not an order number.
//
//   \bord(?:ine)?                    "ord" or "ordine", at the start of a word
//   \s*(?:numero|num\.?|nr\.?|n°|n\.?)?  optional "numero", "num.", "nr.", "n°", "n."
//   \s*[-:#.]?\s*                    optional separator: "-", ":", "#" or "."
//   (\d{5})(?!\d)                    exactly five digits, not followed by a sixth
//
// The "i" flag ignores case: "ORD", "Ord" and "ord" all match.
const ORDER_NUMBER = /\bord(?:ine)?\s*(?:numero|num\.?|nr\.?|n°|n\.?)?\s*[-:#.]?\s*(\d{5})(?!\d)/i;

// Returns the first order number in the text, normalized to "ORD-12345".
export function findOrderNumber(text: string): string | null {
  const match = ORDER_NUMBER.exec(text);
  if (match === null) return null;
  return `ORD-${match[1]}`;
}
