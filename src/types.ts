// The five departments an email can be routed to.
export const CATEGORIES = ["reso", "garanzia", "stato_ordine", "info_prodotto", "altro"] as const;
export type Category = (typeof CATEGORIES)[number];

// What every solution returns for one email, and what labels.json holds.
export type Triage = {
  categoria: Category;
  numero_ordine: string | null; // "ORD-" followed by 5 digits, or null if absent
};

const ORDER_NUMBER_FORMAT = /^ORD-\d{5}$/;

// Checks at runtime that a value parsed from JSON has the shape of a Triage.
// The same check guards labels.json and the answers of the language models.
export function isTriage(value: unknown): value is Triage {
  if (typeof value !== "object" || value === null) return false;
  if (!("categoria" in value) || !("numero_ordine" in value)) return false;
  const { categoria, numero_ordine } = value;
  if (!CATEGORIES.some((category) => category === categoria)) return false;
  if (numero_ordine === null) return true; // no order number in the email
  return typeof numero_ordine === "string" && ORDER_NUMBER_FORMAT.test(numero_ordine);
}
