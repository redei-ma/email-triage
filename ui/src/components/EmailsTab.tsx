import { useMemo, useState } from "react";
import type { EmailRecord, SolutionSummary } from "../types/appData.ts";
import type { Category } from "../../../src/types.ts";
import { EmailFilters } from "./EmailFilters.tsx";
import { EmailList } from "./EmailList.tsx";
import { EmailDetail } from "./EmailDetail.tsx";
import "./EmailsTab.css";

type Props = {
  emails: EmailRecord[];
  solutions: SolutionSummary[];
};

export function EmailsTab({ emails, solutions }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      emails.filter(
        (email) =>
          (categoryFilter === "all" || email.expected.categoria === categoryFilter) &&
          (!onlyErrors || email.hasError),
      ),
    [emails, categoryFilter, onlyErrors],
  );

  // The detail replaces the list: start it from the top, not from where the list was scrolled.
  function openEmail(id: string) {
    setSelectedId(id);
    window.scrollTo(0, 0);
  }

  const selected = selectedId === null ? null : (emails.find((email) => email.id === selectedId) ?? null);

  if (selected !== null) {
    return <EmailDetail email={selected} solutions={solutions} onBack={() => setSelectedId(null)} />;
  }

  return (
    <section aria-labelledby="emails-heading">
      <h2 id="emails-heading">Test emails</h2>
      <p>
        The 25 held-out test emails, with the category and order number from{" "}
        <code>data/test/labels.json</code>.
      </p>
      <EmailFilters
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        onlyErrors={onlyErrors}
        onOnlyErrorsChange={setOnlyErrors}
      />
      <p className="emails-count">
        Showing {filtered.length} of {emails.length} emails.
      </p>
      <EmailList emails={filtered} onSelect={openEmail} />
    </section>
  );
}
