import { useEffect, useMemo, useState } from "react";
import { Contributions } from "./components/Contributions";
import { Layout } from "./components/Layout";
import { Leaders } from "./components/Leaders";
import { Members } from "./components/Members";
import { Overview } from "./components/Overview";
import { ProductionStatus } from "./components/ProductionStatus";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";
import { SnapshotImport } from "./components/SnapshotImport";
import { Snapshots } from "./components/Snapshots";
import { Teams } from "./components/Teams";
import { Upgrades } from "./components/Upgrades";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import { useGuildData } from "./hooks/useGuildData";
import { ROLES, canAccessTab, getAllowedTabs, isStaff, isVisionary, loadRole, saveRole } from "./lib/auth";
import { buildMemberRows, buildTrackerData } from "./lib/tracker";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [role, setRole] = useState(() => loadRole());
  const { state, setState, loading, error, retry, dataSource, readOnly, saving, mutationError, actions } = useGuildData();
  const useLiveAuth = dataSource === "supabase";
  const liveAuth = useDiscordAuth(useLiveAuth);
  const actualRole = useLiveAuth ? liveAuth.role : role;
  const canUseRoleViewer = useLiveAuth && actualRole === ROLES.visionary;
  const [roleViewer, setRoleViewer] = useState("");
  const effectiveRole = canUseRoleViewer && roleViewer ? roleViewer : actualRole;
  const authRoleLoading = useLiveAuth && liveAuth.authLoading;
  const canViewProfile = useLiveAuth && Boolean(liveAuth.session) && effectiveRole !== ROLES.guest;
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!canUseRoleViewer && roleViewer) setRoleViewer("");
  }, [canUseRoleViewer, roleViewer]);

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
  const staff = isStaff(effectiveRole);
  const visionary = isVisionary(effectiveRole);
  const canWriteLive = useLiveAuth && staff;
  const canMigrateBackup = readOnly && visionary;

  async function copyReport(report) {
    await navigator.clipboard.writeText(report);
    setToast("Discord report copied.");
  }

  const pages = {
    overview: <Overview state={displayState} tracker={tracker} onCopyReport={copyReport} canCopyReport={staff} />,
    import: <SnapshotImport state={state} setState={setState} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />,
    snapshots: <Snapshots state={state} setState={setState} tracker={tracker} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />,
    members: <Members state={displayState} setState={setState} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />,
    leaders: <Leaders state={displayState} />,
    upgrades: <Upgrades state={state} setState={setState} canEdit={staff} readOnly={readOnly} canWrite={canWriteLive} actions={actions} saving={saving} mutationError={mutationError} />,
    contributions: <Contributions state={displayState} isStaffView={staff} />,
    teams: <Teams state={displayState} auth={useLiveAuth ? liveAuth : null} />,
    profile: <Profile state={displayState} auth={liveAuth} role={effectiveRole} />,
    settings: (
      <>
        <ProductionStatus />
        <Settings state={state} setState={setState} readOnly={readOnly} canWrite={canWriteLive} canMigrateBackup={canMigrateBackup} canEditTracking={visionary} actions={actions} saving={saving} mutationError={mutationError} />
      </>
    )
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
    <Layout
      activeTab={currentTab}
      setActiveTab={setActiveTab}
      settings={state.settings}
      role={effectiveRole}
      actualRole={actualRole}
      setRole={setRole}
      visibleTabs={visibleTabs}
      dataSource={dataSource}
      auth={useLiveAuth ? liveAuth : null}
      canUseRoleViewer={canUseRoleViewer}
      roleViewerValue={effectiveRole}
      onRoleViewerChange={setRoleViewer}
    >
      {content}
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-blood/35 bg-cellar px-4 py-3 text-sm font-semibold text-bone shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          {toast}
        </div>
      ) : null}
    </Layout>
  );
}
