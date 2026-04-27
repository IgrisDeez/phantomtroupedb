import { useEffect, useMemo, useState } from "react";
import { Analytics } from "./components/Analytics";
import { Layout } from "./components/Layout";
import { Leaders } from "./components/Leaders";
import { Members } from "./components/Members";
import { Overview } from "./components/Overview";
import { Settings } from "./components/Settings";
import { Snapshots } from "./components/Snapshots";
import { Upgrades } from "./components/Upgrades";
import { loadState, saveState } from "./lib/storage";
import { buildTrackerData } from "./lib/tracker";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [state, setState] = useState(() => loadState());
  const [toast, setToast] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const tracker = useMemo(() => buildTrackerData(state.snapshots, state.settings), [state.snapshots, state.settings]);

  async function copyReport(report) {
    await navigator.clipboard.writeText(report);
    setToast("Discord report copied.");
  }

  const pages = {
    overview: <Overview state={state} tracker={tracker} onCopyReport={copyReport} />,
    snapshots: <Snapshots state={state} setState={setState} tracker={tracker} />,
    members: <Members state={state} setState={setState} />,
    analytics: <Analytics tracker={tracker} />,
    leaders: <Leaders state={state} tracker={tracker} onCopyReport={copyReport} />,
    upgrades: <Upgrades state={state} setState={setState} />,
    settings: <Settings state={state} setState={setState} />
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} settings={state.settings}>
      {pages[activeTab]}
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-relic/35 bg-night px-4 py-3 text-sm font-semibold text-ember shadow-gold">
          {toast}
        </div>
      ) : null}
    </Layout>
  );
}
