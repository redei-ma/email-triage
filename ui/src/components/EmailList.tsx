import type { EmailRecord } from "../types/appData.ts";

type Props = {
  emails: EmailRecord[];
  onSelect: (id: string) => void;
};

export function EmailList({ emails, onSelect }: Props) {
  if (emails.length === 0) return <p>No email matches these filters.</p>;

  return (
    <ul className="emails-list">
      {emails.map((email) => (
        <li key={email.id}>
          <button type="button" className="emails-list-item" onClick={() => onSelect(email.id)}>
            <span className="emails-list-id">{email.id}</span>
            <span className="emails-list-category">{email.expected.categoria}</span>
            <span className="emails-list-order">{email.expected.numero_ordine ?? "no order number"}</span>
            {email.hasError && <span className="emails-list-error-badge">error</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
