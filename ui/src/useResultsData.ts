import { useEffect, useState } from "react";
import type { ResultsData } from "./types/appData.ts";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ResultsData };

/** Loads public/data/results.json once, on mount. */
export function useResultsData(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/results.json`;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json() as Promise<ResultsData>;
      })
      .then((data) => setState({ status: "ready", data }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: "error", message });
      });
  }, []);

  return state;
}
