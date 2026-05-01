import { Clipboard, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TEAM_CAP, loadTeamSelection, saveTeamSelection } from "../lib/storage";
import {
  formatDateTime,
  formatNumber,
  formatSigned,
  getMemberGain,
  getMemberStatus,
  normalizeGuild
} from "../lib/tracker";
import { EmptyState, SectionCard, StatCard, StatusPill } from "./Shared";

export function Teams({ state, auth }) {
  const { members, settings } = state;
  const discordId = auth?.discordId || "";
  const signedIn = Boolean(auth?.session && discordId);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState([]);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    setSelection(signedIn ? loadTeamSelection(discordId) : []);
  }, [discordId, signedIn]);

  useEffect(() => {
    if (!copyMessage) return undefined;
    const timeout = window.setTimeout(() => setCopyMessage(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  const membersByName = useMemo(() => {
    return new Map(members.map((member) => [normalizeGuild(member.roblox), member]));
  }, [members]);

  const selectedRows = useMemo(() => {
    return selection.map((name) => ({
      name,
      member: membersByName.get(name) || null
    }));
  }, [membersByName, selection]);

  const availableMembers = useMemo(() => {
    const selected = new Set(selection);
    const query = search.trim().toLowerCase();
    return [...members]
      .filter((member) => {
        const key = normalizeGuild(member.roblox);
        if (!key || selected.has(key)) return false;
        return !query || member.roblox.toLowerCase().includes(query);
      })
      .sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0))
      .slice(0, 20);
  }, [members, search, selection]);

  const summary = useMemo(() => buildTeamSummary(selectedRows, settings.dailyRequirement), [selectedRows, settings.dailyRequirement]);
  const atCap = selection.length >= TEAM_CAP;

  function persist(nextSelection) {
    const saved = saveTeamSelection(discordId, nextSelection);
    setSelection(saved);
  }

  function addMember(member) {
    if (!signedIn || atCap) return;
    const key = normalizeGuild(member.roblox);
    if (!key || selection.includes(key)) return;
    persist([...selection, key]);
  }

  function removeMember(key) {
    persist(selection.filter((name) => name !== key));
  }

  function clearTeam() {
    if (!selection.length) return;
    const confirmed = window.confirm("Clear your saved local team for this Discord account?");
    if (confirmed) persist([]);
  }

  async function copyTeam() {
    if (!selectedRows.length) return;
    const text = selectedRows.map((row, index) => formatTeamCopyLine(row, index, settings.dailyRequirement)).join("\n");
    await navigator.clipboard.writeText(text);
    setCopyMessage("Team copied.");
  }

  if (!signedIn) {
    return (
      <SectionCard title="Teams" eyebrow="Saved Squad">
        <EmptyState
          title="Login required"
          message="Log in with Discord to save a local team for this browser."
        />
      </SectionCard>
    );
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Teams"
        eyebrow="Saved Squad"
        action={(
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <span className="inline-flex items-center justify-center rounded-full border border-blood/25 bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200/70">
              {selection.length} / {TEAM_CAP} selected
            </span>
            <button type="button" className="btn w-full bg-marrow/35 sm:w-auto" onClick={copyTeam} disabled={!selection.length}>
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              Copy Team
            </button>
            <button type="button" className="btn w-full bg-marrow/35 sm:w-auto" onClick={clearTeam} disabled={!selection.length}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear Team
            </button>
          </div>
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Team Size" value={`${selection.length} / ${TEAM_CAP}`} tone="steel" />
          <StatCard label="Total Contribution" value={formatNumber(summary.totalContribution)} />
          <StatCard label="Team Gain" value={formatSigned(summary.totalGain)} />
          <StatCard label="Active Members" value={`${summary.activeCount} / ${summary.validCount}`} />
          <StatCard label="Latest Check" value={formatDateTime(summary.latestCheck)} tone="slate" />
        </div>

        {copyMessage ? <p className="mt-4 text-sm font-semibold text-red-100">{copyMessage}</p> : null}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Your Team" eyebrow="Selected Players">
          {selectedRows.length ? (
            <div className="grid gap-3">
              {selectedRows.map(({ name, member }) => (
                <TeamMemberCard
                  key={name}
                  name={name}
                  member={member}
                  requirement={settings.dailyRequirement}
                  onRemove={() => removeMember(name)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No team saved yet" message={`Search imported guild members and add up to ${TEAM_CAP} players to your local team.`} />
          )}
        </SectionCard>

        <SectionCard title="Add Players" eyebrow="Member Search">
          <div className="grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-zinc-300">{selection.length} of {TEAM_CAP} players selected</p>
              {atCap ? <p className="text-sm font-semibold text-red-100">Team is full at {TEAM_CAP} players.</p> : null}
            </div>
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Roblox username"
              aria-label="Search Roblox username"
            />

            {!members.length ? (
              <EmptyState title="No imported members" message="An officer needs to import member check data before teams can be built." />
            ) : availableMembers.length ? (
              <div className="grid gap-2">
                {availableMembers.map((member) => (
                  <button
                    key={member.roblox}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-blood/20 bg-black/25 p-3 text-left transition hover:border-blood/45 hover:bg-wine/25 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => addMember(member)}
                    disabled={atCap}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-bone">{member.roblox}</span>
                      <span className="mt-1 block text-xs text-zinc-400">{formatNumber(member.contribution)} contribution</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blood/25 bg-marrow/40 px-2.5 py-1 text-xs font-bold text-red-100">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No available players" message={search ? "No imported members match that search. Teams can only use imported guild members." : "Every available imported member is already on your team."} />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function TeamMemberCard({ name, member, requirement, onRemove }) {
  if (!member) {
    return (
      <article className="rounded-lg border border-blood/20 bg-black/25 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-bone">{name}</h3>
            <p className="mt-1 text-sm text-zinc-400">No current check data</p>
          </div>
          <RemoveButton onRemove={onRemove} />
        </div>
      </article>
    );
  }

  const gain = getMemberGain(member);
  const status = getMemberStatus(member, requirement);

  return (
    <article className="rounded-lg border border-blood/20 bg-gradient-to-br from-marrow/35 to-black/25 p-4 shadow-[inset_0_1px_0_rgba(248,113,113,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-bone">{member.roblox}</h3>
            <StatusPill status={status} />
          </div>
          <p className="mt-1 text-sm text-zinc-400">Last checked: {formatDateTime(member.lastChecked)}</p>
        </div>
        <RemoveButton onRemove={onRemove} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <CompactStat label="Contribution" value={formatNumber(member.contribution)} />
        <CompactStat label="Gain" value={formatSigned(gain)} />
        <CompactStat label="Previous" value={formatDateTime(member.previousChecked)} />
      </div>
    </article>
  );
}

function CompactStat({ label, value }) {
  return (
    <div className="rounded-md border border-blood/15 bg-black/25 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/45">{label}</p>
      <p className="mt-1 font-semibold text-bone">{value}</p>
    </div>
  );
}

function RemoveButton({ onRemove }) {
  return (
    <button type="button" className="btn min-h-8 px-2 py-1 text-xs" onClick={onRemove}>
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      Remove
    </button>
  );
}

function buildTeamSummary(rows, requirement) {
  const validMembers = rows.map((row) => row.member).filter(Boolean);
  const gains = validMembers.map((member) => getMemberGain(member)).filter((gain) => gain !== null);
  const latestCheck = validMembers
    .map((member) => new Date(member.lastChecked).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];

  return {
    validCount: validMembers.length,
    totalContribution: validMembers.reduce((total, member) => total + (Number(member.contribution) || 0), 0),
    totalGain: gains.length ? gains.reduce((total, gain) => total + gain, 0) : null,
    activeCount: validMembers.filter((member) => getMemberStatus(member, requirement) === "Active").length,
    latestCheck: latestCheck ? new Date(latestCheck).toISOString() : ""
  };
}

function formatTeamCopyLine(row, index, requirement) {
  if (!row.member) {
    return `${index + 1}. ${row.name} - No current check data`;
  }

  const member = row.member;
  return [
    `${index + 1}. ${member.roblox}`,
    `${formatNumber(member.contribution)} pts`,
    getMemberStatus(member, requirement),
    `Gain ${formatSigned(getMemberGain(member))}`
  ].join(" - ");
}
