import { Clipboard, ShieldCheck } from "lucide-react";
import { buildDiscordReport, formatNumber, formatSigned, getMemberGain, getMemberStatus } from "../lib/tracker";
import { EmptyState, SectionCard, StatCard, StatusPill } from "./Shared";

function countsAsActiveMember(member, dailyRequirement) {
  const status = getMemberStatus(member, dailyRequirement);
  return status === "Active" || status === "Low";
}

export function Overview({ state, tracker, onCopyReport, canCopyReport = false }) {
  const { settings, members } = state;
  const phantom = tracker.phantom;
  const memberCap = Number(settings.memberCap) || 150;
  const activeCount = members.filter((member) => countsAsActiveMember(member, settings.dailyRequirement)).length;
  const topMembers = [...members].sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0)).slice(0, 10);

  return (
    <div className="grid gap-5">
      <section className="panel relative overflow-hidden rounded-lg px-4 pb-4 pt-4 shadow-[0_24px_90px_rgba(0,0,0,0.66)] sm:px-6 sm:pb-6">
        <div className="pointer-events-none absolute -right-12 -top-24 hidden h-80 w-[34rem] opacity-35 lg:block">
          <img src="/guild-logo.png" alt="" className="h-full w-full object-contain object-right-top" />
        </div>
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Guild Operations</p>
          {canCopyReport ? (
            <button type="button" className="btn btn-steel w-full sm:w-auto" onClick={() => onCopyReport(buildDiscordReport({ settings, tracker, members }))}>
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              Copy Discord Report
            </button>
          ) : null}
        </div>

        <div className="relative mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Current Rank" value={phantom ? `#${phantom.rank}` : "-"} tone="steel" />
          <StatCard label="Current Points" value={phantom ? formatNumber(phantom.points) : "-"} />
          <StatCard label="Members" value={`${members.length} / ${memberCap}`} />
          <StatCard label="Active Members" value={`${settings.activeMembers || activeCount || "-"}`} />
          <StatCard label="Guild ID" value={settings.guildId || "Not set"} />
          <StatCard label="Gap To Next" value={phantom ? formatNumber(phantom.gap) : "-"} />
          <StatCard label="Gain / Hour" value={phantom ? formatSigned(phantom.gainPerHour) : "-"} />
          <StatCard label="Per Member / Hour" value={phantom ? formatSigned(phantom.perMemberHour) : "-"} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Daily Requirement" eyebrow="Member Standard">
          <div className="relative overflow-hidden rounded-lg border border-garnet/35 bg-gradient-to-br from-blood/30 via-wine/30 to-black/35 p-5 shadow-[inset_0_1px_0_rgba(185,28,28,0.12)]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-garnet/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-200/20 bg-black/35 text-red-100">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200/60">Daily Member Points</p>
                <p className="mt-1 text-2xl font-extrabold text-red-50">{settings.dailyRequirement || 50}</p>
              </div>
              <p className="ml-auto hidden text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400 sm:block">Daily Requirement</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Summary" eyebrow="Rankings">
          {phantom ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Rank" value={`#${phantom.rank}`} tone="steel" />
              <StatCard label="Points" value={formatNumber(phantom.points)} />
              {tracker.phantomSummary.filter((item) => Number(item.gap) > 0).map((item) => (
                <StatCard key={item.rank} label={`Gap To #${item.rank}`} value={formatNumber(item.gap)} />
              ))}
            </div>
          ) : (
            <EmptyState title="No guild ranking yet" message="Paste leaderboard rows on the Snapshots tab to populate rank, gap, and pace metrics." />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Top 10 Contribution Preview" eyebrow="Member Leaderboard">
        {topMembers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roblox</th>
                  <th>Contribution</th>
                  <th>Gain</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((member) => (
                  <tr key={member.roblox}>
                    <td className="font-semibold text-bone">{member.roblox}</td>
                    <td>{formatNumber(member.contribution)}</td>
                    <td className={getMemberGain(member) === null ? "" : getMemberGain(member) >= 0 ? "text-zinc-100" : "text-zinc-500"}>{formatSigned(getMemberGain(member))}</td>
                    <td><StatusPill status={getMemberStatus(member, settings.dailyRequirement)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No member checks yet" message="Add members and record contribution checks to populate this board." />
        )}
      </SectionCard>
    </div>
  );
}
