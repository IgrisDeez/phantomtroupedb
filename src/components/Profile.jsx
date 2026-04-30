import { RefreshCcw, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRobloxLink } from "../hooks/useRobloxLink";
import {
  formatNumber,
  formatSigned,
  getDailyRequirementProgress,
  getMemberGain,
  getMemberGainPerHour,
  normalizeGuild
} from "../lib/tracker";
import { EmptyState, SectionCard, StatCard, StatusPill } from "./Shared";

export function Profile({ state, auth, role }) {
  const { link, loading, saving, error, refresh, saveOwnLink } = useRobloxLink(Boolean(auth?.session), auth?.discordId);
  const [editingLink, setEditingLink] = useState(false);
  const [robloxDraft, setRobloxDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const member = useMemo(() => {
    if (!link?.linked || !link.normalizedRoblox) return null;
    return state.members.find((entry) => normalizeGuild(entry.roblox) === link.normalizedRoblox) || null;
  }, [link, state.members]);

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const linkedUsername = link?.linked ? link.robloxUsername : "";

  useEffect(() => {
    setRobloxDraft(linkedUsername);
    setEditingLink(!linkedUsername);
    setSaveMessage("");
  }, [linkedUsername]);

  async function saveProfileLink() {
    const saved = await saveOwnLink({
      userId: auth?.user?.id,
      robloxUsername: robloxDraft,
      label: link?.label || auth?.displayName || ""
    });
    if (saved) {
      setEditingLink(false);
      setSaveMessage("Roblox username saved.");
    }
  }

  if (loading) {
    return (
      <SectionCard title="My Profile" eyebrow="Guild Link">
        <div className="panel-soft rounded-lg p-5 text-sm font-semibold text-bone">Resolving linked Roblox account...</div>
      </SectionCard>
    );
  }

  const unlinked = !link?.linked;
  const dailyProgress = member ? getDailyRequirementProgress(member, state.settings.dailyRequirement) : null;
  const memberGain = member ? getMemberGain(member) : null;
  const lastTrackedText = member?.lastChecked
    ? `Last tracked: ${formatGuildDateTime(member.lastChecked, state.settings.guildTimezone)}`
    : "Last tracked: Not tracked yet";

  return (
    <div className="grid gap-5">
      <SectionCard
        title="My Profile"
        eyebrow="Guild Link"
        action={(
          <button type="button" className="btn w-full bg-marrow/35 sm:w-auto" onClick={refresh}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh Link
          </button>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.6fr]">
          <div className="rounded-lg border border-blood/25 bg-marrow/35 p-5 shadow-[inset_0_1px_0_rgba(248,113,113,0.06)]">
            <div className="flex items-center gap-3">
              {auth?.avatarUrl ? (
                <img src={auth.avatarUrl} alt="" className="h-12 w-12 rounded-lg border border-blood/35 object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-blood/35 bg-black/40">
                  <UserRound className="h-6 w-6 text-red-100/70" aria-hidden="true" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200/55">Discord</p>
                <h3 className="mt-1 text-lg font-bold text-bone">{auth?.displayName || "Discord user"}</h3>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatCard label="Role" value={roleLabel} tone="slate" />
              <StatCard label="Roblox" value={link?.linked ? link.robloxUsername : "-"} tone="steel" />
            </div>

            <div className="mt-5 rounded-lg border border-blood/25 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(248,113,113,0.05)]">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Roblox Username</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {link?.linked ? "Update this if your Roblox username changes." : "Enter your Roblox username to connect your profile."}
                  </p>
                </div>
                {link?.linked && !editingLink ? (
                  <button type="button" className="btn min-h-8 w-full px-2 py-1 text-xs sm:w-auto" onClick={() => setEditingLink(true)}>
                    Edit Username
                  </button>
                ) : null}
              </div>

              {editingLink ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    className="input"
                    value={robloxDraft}
                    onChange={(event) => setRobloxDraft(event.target.value)}
                    placeholder="Roblox username"
                    aria-label="Roblox username"
                    disabled={saving}
                  />
                  <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={saveProfileLink} disabled={saving || !robloxDraft.trim()}>
                    {saving ? "Saving..." : "Save Username"}
                  </button>
                </div>
              ) : null}

              {saveMessage ? <p className="mt-3 text-sm text-red-100">{saveMessage}</p> : null}
            </div>

            {error ? <p className="mt-4 text-sm text-red-200/70">{error}</p> : null}
          </div>

          {unlinked ? (
            <EmptyState
              title="No Roblox account linked"
              message="Link your Roblox username to see your contribution status."
            />
          ) : member ? (
            <div className="rounded-lg border border-blood/25 bg-gradient-to-br from-marrow/50 to-black/25 p-5 shadow-[inset_0_1px_0_rgba(248,113,113,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200/55">My Contribution Summary</p>
                  <p className="mt-3 text-4xl font-extrabold leading-none text-red-50">{formatNumber(member.contribution)}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-300">{lastTrackedText}</p>
                </div>
                <DailyGoalProgress progress={dailyProgress} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-blood/20 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(248,113,113,0.05)]">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Current Contribution</p>
                  <p className="mt-2 text-2xl font-bold text-bone">{formatNumber(member.contribution)}</p>
                </div>
                <div className="rounded-lg border border-blood/20 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(248,113,113,0.05)]">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Since Previous Check</p>
                  <p className="mt-2 text-2xl font-bold text-bone">{formatSigned(memberGain)}</p>
                </div>
              </div>

              <details className="mt-4 rounded-lg border border-blood/20 bg-black/20 p-4 text-sm text-zinc-400">
                <summary className="cursor-pointer select-none font-semibold text-zinc-300">Advanced details</summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ProfileDetail label="Previous Check" value={formatGuildDateTime(member.previousChecked, state.settings.guildTimezone)} />
                  <ProfileDetail label="Gain / Hour" value={formatSigned(getMemberGainPerHour(member))} />
                  <ProfileDetail label="Daily Requirement" value={formatNumber(dailyProgress.requirement)} />
                </div>
              </details>
            </div>
          ) : (
            <EmptyState
              title="No guild contribution data"
              message="Your Roblox account is linked, but no contribution check has been imported for you yet. Ask an officer to include you in the next member check."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function DailyGoalProgress({ progress }) {
  if (!progress) return null;

  const percent = progress.requirement > 0
    ? Math.min(100, Math.max(0, Math.round((progress.progress / progress.requirement) * 100)))
    : 100;
  const complete = progress.remaining <= 0;
  const goalLabel = complete ? "Daily goal complete" : "Daily goal";
  const helperText = complete
    ? "Requirement met for this check"
    : `${formatNumber(progress.remaining)} point${progress.remaining === 1 ? "" : "s"} left today`;

  return (
    <div className="w-full rounded-lg border border-blood/25 bg-gradient-to-br from-wine/35 to-black/30 p-4 shadow-[inset_0_1px_0_rgba(248,113,113,0.08),0_14px_36px_rgba(0,0,0,0.2)] sm:max-w-[18rem]">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex rounded-full border border-blood/25 bg-black/25 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-red-200/65">{goalLabel}</p>
        <StatusPill status={progress.status} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-lg font-extrabold text-red-50">
          {formatNumber(progress.progress)}
          <span className="text-sm font-bold text-zinc-400"> / {formatNumber(progress.requirement)}</span>
        </p>
        <p className="text-xs font-bold text-zinc-400">{percent}%</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-blood/15 bg-black/45">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blood via-garnet to-red-200 shadow-[0_0_18px_rgba(185,28,28,0.38)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-zinc-300">{helperText}</p>
    </div>
  );
}

function ProfileDetail({ label, value }) {
  return (
    <div className="rounded-md border border-blood/15 bg-marrow/25 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/45">{label}</p>
      <p className="mt-1 font-semibold text-zinc-200">{value || "-"}</p>
    </div>
  );
}

function formatGuildDateTime(value, timeZone = "Asia/Taipei") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone || "Asia/Taipei",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
