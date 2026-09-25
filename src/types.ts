// The five departments an email can be routed to.
export const CATEGORIES = ["reso", "garanzia", "stato_ordine", "info_prodotto", "altro"] as const;
export type Category = (typeof CATEGORIES)[number];

// What every solution returns for one email, and what labels.json holds.
export type Triage = {
  categoria: Category;
  numero_ordine: string | null; // "ORD-" followed by 5 digits, or null if absent
};

// What the model returns for solution C, which takes the order number from
// the regular expression and asks the model for the category only.
export type CategoryOnly = { categoria: Category };

const ORDER_NUMBER_FORMAT = /^ORD-\d{5}$/;

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category === value);
}

// The checks below run on values parsed from JSON and say what is wrong with
// them, or return null if nothing is. The messages are in Italian because they
// are sent back to the model when it gets the format wrong.

export function findTriageProblem(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "la risposta non è un oggetto JSON";
  if (!("categoria" in value) || !("numero_ordine" in value)) {
    return "mancano i campi categoria o numero_ordine";
  }
  const { categoria, numero_ordine } = value;
  if (!isCategory(categoria)) return `la categoria "${categoria}" non è fra quelle ammesse`;
  if (numero_ordine === null) return null; // no order number in the email
  if (typeof numero_ordine !== "string" || !ORDER_NUMBER_FORMAT.test(numero_ordine)) {
    return `numero_ordine "${numero_ordine}" non è "ORD-" seguito da 5 cifre, né null`;
  }
  return null;
}

export function findCategoryProblem(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "la risposta non è un oggetto JSON";
  if (!("categoria" in value)) return "manca il campo categoria";
  if (!isCategory(value.categoria)) return `la categoria "${value.categoria}" non è fra quelle ammesse`;
  return null;
}

// The same checks as type guards. labels.json goes through isTriage too.
export function isTriage(value: unknown): value is Triage {
  return findTriageProblem(value) === null;
}

export function isCategoryOnly(value: unknown): value is CategoryOnly {
  return findCategoryProblem(value) === null;
}
