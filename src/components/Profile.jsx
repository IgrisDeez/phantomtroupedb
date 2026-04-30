import { RefreshCcw, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRobloxLink } from "../hooks/useRobloxLink";
import {
  formatDateTime,
  formatNumber,
  formatSigned,
  getMemberGain,
  getMemberGainPerHour,
  getMemberStatus,
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
          <div className="rounded-lg border border-blood/25 bg-marrow/35 p-5">
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

            <div className="mt-5 rounded-lg border border-blood/25 bg-black/25 p-4">
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
              message="Enter your Roblox username on this page to connect your profile."
            />
          ) : member ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label="Contribution" value={formatNumber(member.contribution)} tone="steel" />
              <StatCard label="Gain Since Previous" value={formatSigned(getMemberGain(member))} tone="base" />
              <StatCard label="Gain / Hour" value={formatSigned(getMemberGainPerHour(member))} tone="base" />
              <StatCard label="Last Check" value={formatDateTime(member.lastChecked)} tone="slate" />
              <StatCard label="Previous Check" value={formatDateTime(member.previousChecked)} tone="slate" />
              <div className="rounded-lg border border-blood/25 bg-marrow/45 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Status</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <StatusPill status={getMemberStatus(member, state.settings.dailyRequirement)} />
                  <span className="text-sm font-semibold text-zinc-300">Req {state.settings.dailyRequirement}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No guild contribution data"
              message={`${link.robloxUsername} is linked, but no contribution checks are saved for that Roblox account yet.`}
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
