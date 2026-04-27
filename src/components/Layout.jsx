import { BarChart3, Crown, Gauge, Gem, ScrollText, Settings, Shield, Users } from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "snapshots", label: "Snapshots", icon: ScrollText },
  { id: "members", label: "Members", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "leaders", label: "Leaders", icon: Crown },
  { id: "upgrades", label: "Upgrades", icon: Gem },
  { id: "settings", label: "Settings", icon: Settings }
];

export function Layout({ activeTab, setActiveTab, settings, children }) {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-5 rounded-lg border border-white/10 bg-black/25 p-5 shadow-glow backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-relic/35 bg-relic/10 text-ember shadow-gold">
              <Shield className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-relic">Sailor Piece Command Center</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
                {settings.guildDisplayName || settings.guildName}
              </h1>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Dashboard tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn shrink-0 ${active ? "btn-primary" : "bg-white/[0.035]"}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
