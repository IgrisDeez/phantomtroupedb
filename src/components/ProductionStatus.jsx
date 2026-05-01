import { CheckCircle2, Cloud, KeyRound, Link2, ShieldAlert, Server } from "lucide-react";
import { isSupabaseConfigured, supabaseConfigStatus } from "../lib/supabaseClient";
import { SectionCard } from "./Shared";

const backend = (import.meta.env.VITE_DATA_BACKEND || "").trim().toLowerCase();
const authRedirectUrl = (import.meta.env.VITE_AUTH_REDIRECT_URL || "").trim();
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const hasAnonKey = Boolean((import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim());

function getRuntimeOrigin() {
  if (typeof window === "undefined") return "Unknown";
  return window.location.origin;
}

function getHostLabel(origin) {
  if (origin.includes("pages.dev")) return "Cloudflare Pages";
  if (origin.includes("workers.dev")) return "Cloudflare Workers";
  if (origin.includes("netlify.app")) return "Netlify";
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return "Local Dev";
  return "Custom Domain";
}

function StatusPill({ good, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${good ? "border-emerald-200/25 bg-emerald-500/10 text-emerald-100" : "border-red-200/25 bg-red-500/10 text-red-100"}`}>
      {good ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </span>
  );
}

function StatusRow({ icon: Icon, label, value, good = true, helper = "" }) {
  return (
    <div className="rounded-lg border border-blood/20 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blood/25 bg-marrow/40 text-red-100">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-bone">{value}</p>
            {helper ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{helper}</p> : null}
          </div>
        </div>
        <StatusPill good={good} label={good ? "Ready" : "Check"} />
      </div>
    </div>
  );
}

export function ProductionStatus() {
  const origin = getRuntimeOrigin();
  const hostLabel = getHostLabel(origin);
  const liveBackend = backend === "supabase";
  const redirectMatchesOrigin = !authRedirectUrl || authRedirectUrl === origin;
  const envReady = isSupabaseConfigured && liveBackend;

  return (
    <SectionCard title="Production Status" eyebrow="Deployment">
      <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm leading-6 text-zinc-300">
        <p className="font-semibold text-bone">Cloudflare Pages baseline</p>
        <p className="mt-1">Use this panel to confirm the live site is using the expected host, backend, and Discord redirect target before publishing new patches.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <StatusRow
          icon={Cloud}
          label="Current Host"
          value={`${hostLabel} · ${origin}`}
          good={!origin.includes("netlify.app")}
          helper="Production should resolve to the Cloudflare Pages URL or a custom domain attached to Pages."
        />
        <StatusRow
          icon={Server}
          label="Data Backend"
          value={liveBackend ? "Supabase live data" : "Local preview mode"}
          good={envReady}
          helper="Requires VITE_DATA_BACKEND=supabase plus valid Supabase URL/key variables."
        />
        <StatusRow
          icon={KeyRound}
          label="Supabase Config"
          value={isSupabaseConfigured ? `Configured · ${supabaseConfigStatus}` : "Missing Supabase environment variables"}
          good={isSupabaseConfigured && Boolean(supabaseUrl) && hasAnonKey}
          helper={supabaseUrl ? `Project URL: ${supabaseUrl}` : "Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."}
        />
        <StatusRow
          icon={Link2}
          label="Auth Redirect"
          value={authRedirectUrl || `${origin} (fallback)`}
          good={redirectMatchesOrigin && !String(authRedirectUrl).includes("netlify")}
          helper="Discord login should return to the active Cloudflare Pages origin, not the old Netlify site."
        />
      </div>
    </SectionCard>
  );
}
