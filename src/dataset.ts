import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isTriage, type Triage } from "./types.ts";

// One entry of labels.json. Other fields, such as the "nota" that explains
// the label, are for people and are ignored here.
type Label = Triage & { id: string };

function isLabel(value: unknown): value is Label {
  return isTriage(value) && "id" in value && typeof value.id === "string";
}

export type Email = {
  id: string;
  text: string; // subject line and body, as written in the .txt file
  expected: Triage;
};

// Reads <dir>/labels.json and, for each label, the email in <dir>/<id>.txt.
// A malformed label stops the program: the labels are what every solution is
// measured against, so a typo there would silently skew every score.
export function loadDataset(dir: string): Email[] {
  const file = join(dir, "labels.json");
  const labels: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(labels)) throw new Error(`${file}: expected an array of labels`);

  return labels.map((label: unknown, index: number) => {
    if (!isLabel(label)) throw new Error(`${file}: entry ${index} is not a valid label`);
    return {
      id: label.id,
      text: readFileSync(join(dir, `${label.id}.txt`), "utf8").trim(),
      expected: { categoria: label.categoria, numero_ordine: label.numero_ordine },
    };
  });
}
