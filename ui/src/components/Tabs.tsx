import "./Tabs.css";

export type Tab = "results" | "emails";

const TABS: { id: Tab; label: string }[] = [
  { id: "results", label: "Results" },
  { id: "emails", label: "Test emails" },
];

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export function Tabs({ active, onChange }: Props) {
  return (
    <nav aria-label="Sections" className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={tab.id === active ? "true" : undefined}
          className={tab.id === active ? "tabs-button tabs-button-active" : "tabs-button"}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
