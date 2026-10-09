import type { EmailRecord, SolutionSummary } from "../types/appData.ts";

type Props = {
  email: EmailRecord;
  solutions: SolutionSummary[];
  onBack: () => void;
};

export function EmailDetail({ email, solutions, onBack }: Props) {
  return (
    <section aria-labelledby="detail-heading">
      <button type="button" className="emails-back" onClick={onBack}>
        ← Back to list
      </button>
      <h2 id="detail-heading">{email.id}</h2>

      <p className="emails-detail-text">{email.text}</p>

      {email.nota !== "" && (
        <p className="emails-detail-note">
          <strong>Note:</strong> {email.nota}
        </p>
      )}

      <h3>Expected answer</h3>
      <p>
        {email.expected.categoria} / {email.expected.numero_ordine ?? "null"}
      </p>

      <h3>Answer of each solution</h3>
      <table className="emails-detail-table">
        <thead>
          <tr>
            <th scope="col">Solution</th>
            <th scope="col">Category</th>
            <th scope="col">Order number</th>
          </tr>
        </thead>
        <tbody>
          {solutions.map((solution) => {
            const answer = email.answers[solution.id];
            if (answer === undefined) return null;
            if ("invalid" in answer) {
              return (
                <tr key={solution.id}>
                  <th scope="row">{solution.name}</th>
                  <td colSpan={2} className="emails-cell-error">
                    Invalid answer: {answer.invalid}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={solution.id}>
                <th scope="row">{solution.name}</th>
                <td className={answer.categoriaCorrect ? "" : "emails-cell-error"}>{answer.categoria}</td>
                <td className={answer.numeroOrdineCorrect ? "" : "emails-cell-error"}>
                  {answer.numero_ordine ?? "null"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
