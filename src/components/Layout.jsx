import { Crown, Gauge, Gem, LogIn, LogOut, ScrollText, Settings, TableProperties, Upload, UserRound, Users } from "lucide-react";
import { ROLES } from "../lib/auth";
import { DarkSelect } from "./Shared";

const tabs = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "import", label: "Import", icon: Upload },
  { id: "snapshots", label: "Snapshots", icon: ScrollText },
  { id: "members", label: "Members", icon: Users },
  { id: "leaders", label: "Leaders", icon: Crown },
  { id: "upgrades", label: "Upgrades", icon: Gem },
  { id: "contributions", label: "Contributions", icon: TableProperties },
  { id: "teams", label: "Teams", icon: Users },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings }
];

const roleOptions = [
  { value: ROLES.guest, label: "Guest" },
  { value: ROLES.member, label: "Member" },
  { value: ROLES.officer, label: "Officer" },
  { value: ROLES.visionary, label: "Visionary" }
];

export function Layout({
  activeTab,
  setActiveTab,
  settings,
  role,
  actualRole = role,
  setRole,
  visibleTabs,
  dataSource = "localStorage",
  auth = null,
  canUseRoleViewer = false,
  roleViewerValue = role,
  onRoleViewerChange = null,
  children
}) {
  const visibleTabSet = new Set(visibleTabs);
  const useLiveAuth = dataSource === "supabase";
  const sourceLabel = dataSource === "supabase" ? "Live Data" : "Local Preview";
  const roleLabel = actualRole.charAt(0).toUpperCase() + actualRole.slice(1);
  const visibleNavTabs = tabs.filter((tab) => visibleTabSet.has(tab.id));
  const rolePillClass = actualRole === ROLES.visionary
    ? "border-red-100/35 bg-gradient-to-r from-blood/45 to-black/35 px-2 py-0.5 uppercase tracking-[0.12em] text-red-50 shadow-[0_0_20px_rgba(185,28,28,0.18)]"
    : "border-blood/40 bg-blood/25 px-2 py-0.5 uppercase tracking-[0.12em] text-red-100";

  return (
    <div className="min-h-screen px-2.5 py-2.5 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="panel mb-5 rounded-lg p-3.5 sm:p-4 lg:mb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-blood/35 bg-black shadow-[0_0_34px_rgba(127,29,29,0.24)] sm:h-14 sm:w-14">
                <img
                  src="/guild-logo.png"
                  alt="Phantom Troupe guild logo"
                  className="h-full w-full object-cover object-center"
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-bold leading-tight text-bone drop-shadow-[0_0_18px_rgba(185,28,28,0.18)] sm:text-3xl">
                  {settings.guildDisplayName || settings.guildName}
                </h1>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2.5 lg:items-end">
              {useLiveAuth ? (
                <div className="flex flex-wrap items-center justify-start gap-2 text-xs font-semibold lg:justify-end">
                  <DataSourcePill label={sourceLabel} />
                  {auth?.session ? (
                    <>
                      <div className="flex max-w-full items-center gap-2 rounded-lg border border-blood/30 bg-marrow/35 px-3 py-2 text-zinc-300">
                        {auth.avatarUrl ? (
                          <img src={auth.avatarUrl} alt="" className="h-6 w-6 rounded-full border border-blood/30 object-cover" />
                        ) : null}
                        <span className="max-w-36 truncate">{auth.displayName}</span>
                        <span className={`rounded-full border ${rolePillClass}`}>
                          {roleLabel}
                        </span>
                      </div>
                      <button type="button" className="btn bg-marrow/35 text-zinc-300" onClick={auth.signOut} disabled={auth.authLoading}>
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Logout
                      </button>
                      {canUseRoleViewer ? (
                        <div className="flex items-center gap-2 rounded-lg border border-blood/25 bg-black/20 px-2 py-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-200/55">View As</span>
                          <DarkSelect
                            value={roleViewerValue}
                            onChange={onRoleViewerChange}
                            options={roleOptions}
                            ariaLabel="Preview dashboard role"
                            className="w-32 normal-case tracking-normal"
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={auth?.signInWithDiscord} disabled={auth?.authLoading}>
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      {auth?.authLoading ? "Checking..." : "Login with Discord"}
                    </button>
                  )}
                  {auth?.authError ? <p className="basis-full text-left text-xs text-red-200/70 lg:text-right">{auth.authError}</p> : null}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-start gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 lg:justify-end">
                  <DataSourcePill label={sourceLabel} />
                  <span>Role Preview</span>
                  <DarkSelect
                    value={role}
                    onChange={setRole}
                    options={roleOptions}
                    ariaLabel="Select dev role"
                    className="w-32 normal-case tracking-normal"
                  />
                </div>
              )}
            </div>
          </div>

          <nav className="mt-3 border-t border-blood/20 pt-3" aria-label="Dashboard tabs">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {visibleNavTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn w-full sm:w-auto ${active ? "border-red-200/45 bg-gradient-to-r from-blood/60 to-wine/45 text-red-50 shadow-[0_0_30px_rgba(127,29,29,0.28)]" : "bg-marrow/35 text-zinc-300"}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mt-6 pb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-red-200/40">
          Phantom DB
        </footer>
      </div>
    </div>
  );
}

function DataSourcePill({ label }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-blood/25 bg-black/25 px-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-red-200/70 shadow-[inset_0_1px_0_rgba(248,113,113,0.08)] sm:min-h-9 sm:px-3 sm:text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-red-200 shadow-[0_0_10px_rgba(248,113,113,0.55)]" aria-hidden="true" />
      {label}
    </span>
  );
}
