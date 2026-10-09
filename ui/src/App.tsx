import { useState } from "react";
import { useResultsData } from "./useResultsData.ts";
import { Tabs, type Tab } from "./components/Tabs.tsx";
import { ResultsTable } from "./components/ResultsTable.tsx";
import { EmailsTab } from "./components/EmailsTab.tsx";
import { TryIt } from "./components/TryIt.tsx";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState<Tab>("results");
  const resultsData = useResultsData();

  return (
    <>
      <header className="app-header">
        <h1>email-triage</h1>
        <p>
          A front end for{" "}
          <a href="https://github.com/redei-ma/email-triage" target="_blank" rel="noreferrer">
            email-triage
          </a>
          , an experiment comparing rules and language models for routing customer emails.
        </p>
        <Tabs active={tab} onChange={setTab} />
      </header>
      <main>
        {tab === "try-it" ? (
          <TryIt />
        ) : resultsData.status === "loading" ? (
          <p>Loading results…</p>
        ) : resultsData.status === "error" ? (
          <p className="app-error" role="alert">
            Could not load the results data: {resultsData.message}
          </p>
        ) : tab === "results" ? (
          <ResultsTable data={resultsData.data} />
        ) : (
          <EmailsTab emails={resultsData.data.emails} solutions={resultsData.data.solutions} />
        )}
      </main>
    </>
  );
}
