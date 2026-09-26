/** The five departments an email can be routed to. */
export const CATEGORIES = ["reso", "garanzia", "stato_ordine", "info_prodotto", "altro"] as const;
export type Category = (typeof CATEGORIES)[number];

/** What every solution returns for one email, and what labels.json holds. */
export type Triage = {
  categoria: Category;
  /** "ORD-" followed by 5 digits, or null if absent. */
  numero_ordine: string | null;
};

/**
 * What the model returns for solution C, which takes the order number from
 * the regular expression and asks the model for the category only.
 */
export type CategoryOnly = { categoria: Category };

const ORDER_NUMBER_FORMAT = /^ORD-\d{5}$/;

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category === value);
}

/**
 * Checks a value parsed from JSON against the shape of a Triage.
 *
 * @returns what is wrong with the value, or null if it is a valid Triage. The
 * message is in Italian because it is sent back to the model when its answer
 * is invalid.
 */
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

/**
 * The same check for solution C, whose answer carries the category only.
 *
 * @returns what is wrong with the value, in Italian, or null if nothing is.
 */
export function findCategoryProblem(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "la risposta non è un oggetto JSON";
  if (!("categoria" in value)) return "manca il campo categoria";
  if (!isCategory(value.categoria)) return `la categoria "${value.categoria}" non è fra quelle ammesse`;
  return null;
}

/** findTriageProblem as a type guard. labels.json goes through it too. */
export function isTriage(value: unknown): value is Triage {
  return findTriageProblem(value) === null;
}

export function isCategoryOnly(value: unknown): value is CategoryOnly {
  return findCategoryProblem(value) === null;
}
