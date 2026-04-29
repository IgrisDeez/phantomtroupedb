import { EmptyState, SectionCard } from "./Shared";

export function Upgrades({ state, setState, canEdit = false, readOnly = false }) {
  const upgrades = state.upgrades || [];

  function updateUpgrade(id, patch) {
    if (readOnly) return;
    setState((current) => ({
      ...current,
      upgrades: current.upgrades.map((upgrade) => (upgrade.id === id ? { ...upgrade, ...patch } : upgrade))
    }));
  }

  return (
    <SectionCard title="Guild Upgrades" eyebrow="Manual Progress">
      {readOnly ? <p className="mb-4 text-sm text-zinc-400">Supabase live data is read-only in this phase.</p> : null}
      {upgrades.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upgrades.map((upgrade) => {
            const progress = upgrade.maxed ? 100 : Math.min(100, Math.round((Number(upgrade.level || 0) / Number(upgrade.maxLevel || 1)) * 100));
            return (
              <article key={upgrade.id} className="panel-soft rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-bone">{upgrade.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{upgrade.value || "Manual value"}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${upgrade.maxed ? "border-garnet/40 bg-blood/30 text-red-100" : "border-blood/25 bg-marrow/35 text-zinc-400"}`}>
                    {upgrade.maxed ? "Maxed" : `Lv ${upgrade.level}`}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/55">
                  <div className="h-full rounded-full bg-gradient-to-r from-wine via-blood to-red-200" style={{ width: `${progress}%` }} />
                </div>

                {canEdit && !readOnly ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Level</span>
                      <input className="input" type="number" min="0" value={upgrade.level} onChange={(event) => updateUpgrade(upgrade.id, { level: Number(event.target.value) || 0 })} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Max Level</span>
                      <input className="input" type="number" min="1" value={upgrade.maxLevel} onChange={(event) => updateUpgrade(upgrade.id, { maxLevel: Number(event.target.value) || 1 })} />
                    </label>
                    <label className="grid gap-1 sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Value</span>
                      <input className="input" value={upgrade.value} onChange={(event) => updateUpgrade(upgrade.id, { value: event.target.value })} />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <input type="checkbox" checked={upgrade.maxed} onChange={(event) => updateUpgrade(upgrade.id, { maxed: event.target.checked })} />
                      Maxed
                    </label>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ReadOnlyStat label="Level" value={upgrade.level} />
                    <ReadOnlyStat label="Max Level" value={upgrade.maxLevel} />
                    <ReadOnlyStat label="Value" value={upgrade.value || "-"} className="sm:col-span-2" />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No upgrade cards" message="Upgrade categories are stored locally and can be restored by importing saved JSON." />
      )}
    </SectionCard>
  );
}

function ReadOnlyStat({ label, value, className = "" }) {
  return (
    <div className={`rounded-md border border-blood/20 bg-black/25 px-3 py-2 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-bone">{value}</p>
    </div>
  );
}
