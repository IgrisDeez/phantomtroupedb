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
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings }
];

const roleOptions = [
  { value: ROLES.guest, label: "Guest" },
  { value: ROLES.member, label: "Member" },
  { value: ROLES.officer, label: "Officer" },
  { value: ROLES.visionary, label: "Visionary" }
];

export function Layout({ activeTab, setActiveTab, settings, role, setRole, visibleTabs, dataSource = "localStorage", auth = null, children }) {
  const visibleTabSet = new Set(visibleTabs);
  const useLiveAuth = dataSource === "supabase";
  const sourceLabel = dataSource === "supabase" ? "Live Data" : "Local Test Data";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const rolePillClass = role === ROLES.visionary
    ? "border-red-100/35 bg-gradient-to-r from-blood/45 to-black/35 px-2 py-0.5 uppercase tracking-[0.12em] text-red-50 shadow-[0_0_20px_rgba(185,28,28,0.18)]"
    : "border-blood/40 bg-blood/25 px-2 py-0.5 uppercase tracking-[0.12em] text-red-100";

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-5 rounded-lg border border-blood/25 bg-cellar/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.62)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-blood/35 bg-black shadow-[0_0_34px_rgba(127,29,29,0.24)]">
              <img
                src="/guild-logo.png"
                alt="Phantom Troupe guild logo"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div>
              <h1 className="mt-1 font-display text-3xl font-bold text-bone sm:text-4xl">
                {settings.guildDisplayName || settings.guildName}
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            {useLiveAuth ? (
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold">
                {auth?.session ? (
                  <>
                    <div className="flex items-center gap-2 rounded-lg border border-blood/30 bg-marrow/35 px-3 py-2 text-zinc-300">
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
                  </>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={auth?.signInWithDiscord} disabled={auth?.authLoading}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    {auth?.authLoading ? "Checking..." : "Login with Discord"}
                  </button>
                )}
                {auth?.authError ? <p className="basis-full text-right text-xs text-red-200/70">{auth.authError}</p> : null}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                <span>Preview Role</span>
                <DarkSelect
                  value={role}
                  onChange={setRole}
                  options={roleOptions}
                  ariaLabel="Select dev role"
                  className="w-32 normal-case tracking-normal"
                />
              </div>
            )}
            <p className="text-right text-xs font-semibold uppercase tracking-[0.12em] text-red-200/55">{sourceLabel}</p>

            <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Dashboard tabs">
              {tabs.filter((tab) => visibleTabSet.has(tab.id)).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn shrink-0 ${active ? "border-garnet/55 bg-blood/45 text-red-50 shadow-[0_0_30px_rgba(127,29,29,0.28)]" : "bg-marrow/35 text-zinc-300"}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-6 pb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-red-200/40">
          West
        </footer>
      </div>
    </div>
  );
}
