import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Triage } from "./types.ts";

// One entry of labels.json: the expected answer plus a note on why.
type Label = Triage & { id: string; nota: string };

export type Email = {
  id: string;
  text: string; // subject line and body, as written in the .txt file
  expected: Triage;
};

// Reads <dir>/labels.json and, for each label, the email in <dir>/<id>.txt.
export function loadDataset(dir: string): Email[] {
  const labels = JSON.parse(readFileSync(join(dir, "labels.json"), "utf8")) as Label[];
  return labels.map((label) => ({
    id: label.id,
    text: readFileSync(join(dir, `${label.id}.txt`), "utf8").trim(),
    expected: { categoria: label.categoria, numero_ordine: label.numero_ordine },
  }));
}
