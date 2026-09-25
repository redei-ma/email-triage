// The five departments an email can be routed to.
export const CATEGORIES = ["reso", "garanzia", "stato_ordine", "info_prodotto", "altro"] as const;
export type Category = (typeof CATEGORIES)[number];

// What every solution returns for one email, and what labels.json holds.
export type Triage = {
  categoria: Category;
  numero_ordine: string | null; // "ORD-" followed by 5 digits, or null if absent
};

const ORDER_NUMBER_FORMAT = /^ORD-\d{5}$/;

// Checks at runtime that a value parsed from JSON has the shape of a Triage,
// and says what is wrong with it, or null if nothing is. The messages are in
// Italian because they are sent back to the model when it gets the format wrong.
export function findTriageProblem(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "la risposta non è un oggetto JSON";
  if (!("categoria" in value) || !("numero_ordine" in value)) {
    return "mancano i campi categoria o numero_ordine";
  }
  const { categoria, numero_ordine } = value;
  if (!CATEGORIES.some((category) => category === categoria)) {
    return `la categoria "${categoria}" non è fra quelle ammesse`;
  }
  if (numero_ordine === null) return null; // no order number in the email
  if (typeof numero_ordine !== "string" || !ORDER_NUMBER_FORMAT.test(numero_ordine)) {
    return `numero_ordine "${numero_ordine}" non è "ORD-" seguito da 5 cifre, né null`;
  }
  return null;
}

// The same check as a type guard: labels.json and the answers of the language
// models both go through it.
export function isTriage(value: unknown): value is Triage {
  return findTriageProblem(value) === null;
}
