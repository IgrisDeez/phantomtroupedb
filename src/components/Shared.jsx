import { ScrollText } from "lucide-react";

export function SectionCard({ title, eyebrow, action, children, className = "" }) {
  return (
    <section className={`panel rounded-lg p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{eyebrow}</p> : null}
          <h2 className="mt-1 font-display text-xl font-semibold text-bone">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, tone = "base" }) {
  const tones = {
    base: "border-blood/25 bg-marrow/45 text-bone",
    steel: "border-garnet/35 bg-wine/45 text-red-50",
    slate: "border-blood/20 bg-black/35 text-zinc-100"
  };

  return (
    <div className={`rounded-lg border p-4 shadow-[inset_0_1px_0_rgba(185,28,28,0.08)] ${tones[tone] || tones.base}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">{label}</p>
      <p className="mt-2 text-2xl font-bold text-inherit">{value}</p>
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-blood/30 bg-marrow/35 p-6 text-center">
      <ScrollText className="h-8 w-8 text-red-200/60" aria-hidden="true" />
      <h3 className="mt-3 font-semibold text-bone">{title}</h3>
      <p className="mt-1 max-w-xl text-sm text-zinc-400">{message}</p>
    </div>
  );
}

export function StatusPill({ status }) {
  const classes = {
    Active: "border-garnet/40 bg-blood/30 text-red-100",
    Low: "border-blood/35 bg-wine/25 text-red-200",
    Inactive: "border-zinc-700/50 bg-black/30 text-zinc-500"
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classes[status] || classes.Inactive}`}>
      {status}
    </span>
  );
}
