// The shape of public/data/results.json, written by `npm run import`.
// Kept separate from the experiment's own types in ../../../src/types.ts.

import type { Category } from "../../../src/types.ts";

export type SolutionSummary = {
  id: string;
  name: string;
  description: string;
  category: string;
  orderNumber: string;
  bothRight: string;
  avgTime: string;
  costPer1000: string;
};

/** One solution's answer for one email, as it appears in the detail view. */
export type Answer =
  | {
      categoria: Category;
      numero_ordine: string | null;
      categoriaCorrect: boolean;
      numeroOrdineCorrect: boolean;
    }
  | { invalid: string; categoriaCorrect: false; numeroOrdineCorrect: false };

export type EmailRecord = {
  id: string;
  text: string;
  expected: { categoria: Category; numero_ordine: string | null };
  nota: string;
  answers: Record<string, Answer>;
  hasError: boolean;
};

export type ResultsData = {
  runDate: string;
  localModel: string;
  cloudModel: string;
  solutions: SolutionSummary[];
  emails: EmailRecord[];
};
