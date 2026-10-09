import type { ResultsData } from "../types/appData.ts";
import "./ResultsTable.css";

type Props = {
  data: ResultsData;
};

export function ResultsTable({ data }: Props) {
  return (
    <section className="results" aria-labelledby="results-heading">
      <h2 id="results-heading">Results</h2>
      <p>
        25 held-out test emails, first of three runs (<code>results/test-1.md</code>), on {data.runDate}. Local model: <code>{data.localModel}</code>. Cloud model:{" "}
        <code>{data.cloudModel}</code>.
      </p>
      <div className="results-table-wrapper">
        <table>
          <caption className="sr-only">
            Category, order number, both-fields and cost results for each solution
          </caption>
          <thead>
            <tr>
              <th scope="col">Solution</th>
              <th scope="col">Category</th>
              <th scope="col">Order number</th>
              <th scope="col">Both right</th>
              <th scope="col">Avg. time / email</th>
              <th scope="col">Est. cost / 1,000 emails</th>
            </tr>
          </thead>
          <tbody>
            {data.solutions.map((solution) => (
              <tr key={solution.id}>
                <th scope="row">
                  <div className="results-solution-name">{solution.name}</div>
                  <div className="results-solution-description">{solution.description}</div>
                </th>
                <td>{solution.category}</td>
                <td>{solution.orderNumber}</td>
                <td>{solution.bothRight}</td>
                <td>{solution.avgTime}</td>
                <td>{solution.costPer1000}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
