// The five departments an email can be routed to.
export const CATEGORIES = ["reso", "garanzia", "stato_ordine", "info_prodotto", "altro"] as const;
export type Category = (typeof CATEGORIES)[number];

// What every solution returns for one email, and what labels.json holds.
export type Triage = {
  categoria: Category;
  numero_ordine: string | null; // "ORD-" followed by 5 digits, or null if absent
};
