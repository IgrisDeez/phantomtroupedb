import { ScrollText } from "lucide-react";

export function SectionCard({ title, eyebrow, action, children, className = "" }) {
  return (
    <section className={`panel rounded-lg p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-relic">{eyebrow}</p> : null}
          <h2 className="mt-1 font-display text-xl font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, tone = "purple" }) {
  const tones = {
    purple: "border-phantom/30 bg-phantom/10 text-white",
    gold: "border-relic/30 bg-relic/10 text-ember",
    slate: "border-white/10 bg-white/[0.04] text-white"
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.purple}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-inherit">{value}</p>
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/20 p-6 text-center">
      <ScrollText className="h-8 w-8 text-phantom" aria-hidden="true" />
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-xl text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function StatusPill({ status }) {
  const classes = {
    Active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    Low: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    Inactive: "border-rose-400/30 bg-rose-400/10 text-rose-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classes[status] || classes.Inactive}`}>
      {status}
    </span>
  );
}
