import { useEffect, useMemo, useState } from "react";
import { Contributions } from "./components/Contributions";
import { Layout } from "./components/Layout";
import { Leaders } from "./components/Leaders";
import { Members } from "./components/Members";
import { Overview } from "./components/Overview";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";
import { Snapshots } from "./components/Snapshots";
import { Upgrades } from "./components/Upgrades";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import { useGuildData } from "./hooks/useGuildData";
import { canAccessTab, getAllowedTabs, isOfficer, loadRole, saveRole } from "./lib/auth";
import { buildMemberRows, buildTrackerData } from "./lib/tracker";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [role, setRole] = useState(() => loadRole());
  const { state, setState, loading, error, retry, dataSource, readOnly, saving, mutationError, actions } = useGuildData();
  const useLiveAuth = dataSource === "supabase";
  const liveAuth = useDiscordAuth(useLiveAuth);
  const effectiveRole = useLiveAuth ? liveAuth.role : role;
  const authRoleLoading = useLiveAuth && liveAuth.authLoading;
  const canViewProfile = useLiveAuth && Boolean(liveAuth.session);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!useLiveAuth) {
      saveRole(role);
      if (!canAccessTab(effectiveRole, activeTab)) {
        setActiveTab("overview");
      }
      return;
    }
    if (authRoleLoading) return;
    if (!canAccessTab(effectiveRole, activeTab) && !(activeTab === "profile" && canViewProfile)) {
      setActiveTab("overview");
    }
  }, [activeTab, authRoleLoading, canViewProfile, effectiveRole, role, useLiveAuth]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const tracker = useMemo(() => buildTrackerData(state.snapshots, state.settings), [state.snapshots, state.settings]);
  const membersForDisplay = useMemo(() => buildMemberRows(state.members, state.memberChecks), [state.members, state.memberChecks]);
  const displayState = useMemo(() => ({ ...state, members: membersForDisplay }), [state, membersForDisplay]);
  const visibleTabs = useMemo(() => {
    const allowed = getAllowedTabs(effectiveRole);
    return canViewProfile ? [...allowed, "profile"] : allowed;
  }, [canViewProfile, effectiveRole]);
  const canAccessCurrentTab = canAccessTab(effectiveRole, activeTab) || (activeTab === "profile" && canViewProfile);
  const currentTab = authRoleLoading ? activeTab : canAccessCurrentTab ? activeTab : "overview";
  const officer = isOfficer(effectiveRole);
  const canWriteLive = useLiveAuth && officer;

  async function copyReport(report) {
    await navigator.clipboard.writeText(report);
    setToast("Discord report copied.");
  }

  const pages = {
    overview: <Overview state={displayState} tracker={tracker} onCopyReport={copyReport} />,
    snapshots: <Snapshots state={state} setState={setState} tracker={tracker} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />,
    members: <Members state={displayState} setState={setState} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />,
    leaders: <Leaders state={displayState} tracker={tracker} onCopyReport={copyReport} />,
    upgrades: <Upgrades state={state} setState={setState} canEdit={officer} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />,
    contributions: <Contributions state={displayState} />,
    profile: <Profile state={displayState} auth={liveAuth} role={effectiveRole} />,
    settings: <Settings state={state} setState={setState} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />
  };

  const content = loading ? (
    <div className="panel rounded-lg p-6 text-sm font-semibold text-bone">Loading Supabase data...</div>
  ) : error ? (
    <div className="panel rounded-lg p-6">
      <p className="font-semibold text-bone">Supabase read failed</p>
      <p className="mt-2 text-sm text-zinc-400">{error}</p>
      <button type="button" className="btn btn-primary mt-4" onClick={retry}>Retry</button>
    </div>
  ) : pages[currentTab];

  return (
    <Layout activeTab={currentTab} setActiveTab={setActiveTab} settings={state.settings} role={effectiveRole} setRole={setRole} visibleTabs={visibleTabs} dataSource={dataSource} auth={useLiveAuth ? liveAuth : null}>
      {content}
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-blood/35 bg-cellar px-4 py-3 text-sm font-semibold text-bone shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          {toast}
        </div>
      ) : null}
    </Layout>
  );
}
