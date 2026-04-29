import { BarChart3, Crown, Gauge, Gem, ScrollText, Settings, TableProperties, Users } from "lucide-react";
import { ROLES } from "../lib/auth";

const tabs = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "snapshots", label: "Snapshots", icon: ScrollText },
  { id: "members", label: "Members", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "leaders", label: "Leaders", icon: Crown },
  { id: "upgrades", label: "Upgrades", icon: Gem },
  { id: "contributions", label: "Contributions", icon: TableProperties },
  { id: "settings", label: "Settings", icon: Settings }
];

export function Layout({ activeTab, setActiveTab, settings, role, setRole, visibleTabs, children }) {
  const visibleTabSet = new Set(visibleTabs);

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
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Dev Role
              <select className="rounded-md border border-blood/20 bg-black/30 px-2 py-1 text-xs normal-case tracking-normal text-zinc-300 outline-none focus:border-blood/45" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value={ROLES.guest}>Guest</option>
                <option value={ROLES.member}>Member</option>
                <option value={ROLES.officer}>Officer</option>
              </select>
            </label>

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
      </div>
    </div>
  );
}
