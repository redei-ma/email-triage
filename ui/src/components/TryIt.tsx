import { useMemo, useState } from "react";
import { classifyWithRules } from "../../../src/rules.ts";
import "./TryIt.css";

export function TryIt() {
  const [text, setText] = useState("");
  const result = useMemo(() => (text.trim() === "" ? null : classifyWithRules(text)), [text]);

  return (
    <section aria-labelledby="try-it-heading">
      <h2 id="try-it-heading">Try it</h2>
      <p>
        Paste an email in Italian below. It is classified in your browser by solution A (keyword rules and a
        regular expression), imported directly from the experiment's <code>src/rules.ts</code>.
      </p>
      <p>
        <strong>Only solution A runs here.</strong> The local and cloud models (B1, B2, C1, C2) need a server to
        run and are not part of this UI.
      </p>
      <div className="tryit-field">
        <label htmlFor="tryit-input">Email text</label>
        <textarea
          id="tryit-input"
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Buongiorno, vorrei restituire gli occhiali dell'ordine ORD-12345..."
        />
      </div>
      <div className="tryit-result" aria-live="polite">
        {result === null ? (
          <p className="tryit-result-empty">Paste an email above to see solution A's answer.</p>
        ) : (
          <p>
            <strong>Category:</strong> {result.categoria}
            <br />
            <strong>Order number:</strong> {result.numero_ordine ?? "null"}
          </p>
        )}
      </div>
    </section>
  );
}
