import { Clipboard, ShieldCheck } from "lucide-react";
import { buildDiscordReport, formatNumber, formatSigned, getMemberGain, getMemberStatus } from "../lib/tracker";
import { EmptyState, SectionCard, StatCard, StatusPill } from "./Shared";

export function Overview({ state, tracker, onCopyReport }) {
  const { settings, members } = state;
  const phantom = tracker.phantom;
  const activeCount = members.filter((member) => getMemberStatus(member, settings.dailyRequirement) === "Active").length;
  const topMembers = [...members].sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0)).slice(0, 10);

  return (
    <div className="grid gap-5">
      <section className="panel rounded-lg p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-relic">Guild Operations</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">{settings.guildDisplayName || settings.guildName}</h2>
            <p className="mt-3 text-sm text-slate-400">{settings.guildId || "Guild ID not set"}</p>
          </div>
          <button type="button" className="btn btn-gold w-full sm:w-auto" onClick={() => onCopyReport(buildDiscordReport({ settings, tracker, members }))}>
            <Clipboard className="h-4 w-4" aria-hidden="true" />
            Copy Discord Report
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Current Points" value={phantom ? formatNumber(phantom.points) : "-"} />
          <StatCard label="Current Rank" value={phantom ? `#${phantom.rank}` : "-"} tone="gold" />
          <StatCard label="Members" value={`${settings.memberCap || 150} / ${settings.memberCap || 150}`} />
          <StatCard label="Active Members" value={`${settings.activeMembers || activeCount || "-"}`} />
          <StatCard label="Gap To Next" value={phantom ? formatNumber(phantom.gap) : "-"} />
          <StatCard label="Gain Per Hour" value={phantom ? formatSigned(phantom.gainPerHour) : "-"} />
          <StatCard label="Per Member / Hour" value={phantom ? formatSigned(phantom.perMemberHour) : "-"} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Daily Requirement" eyebrow="Member Standard">
          <div className="flex items-center gap-3 rounded-lg border border-relic/25 bg-relic/10 p-4 text-ember">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            <p className="text-lg font-bold">{settings.dailyRequirement || 50} Guild point daily</p>
          </div>
        </SectionCard>

        <SectionCard title="Phantom Summary" eyebrow="Rank Pressure">
          {phantom ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Phantom Points" value={formatNumber(phantom.points)} />
              <StatCard label="Phantom Rank" value={`#${phantom.rank}`} tone="gold" />
              {tracker.phantomSummary.map((item) => (
                <StatCard key={item.rank} label={`Gap To #${item.rank}`} value={formatNumber(item.gap)} />
              ))}
            </div>
          ) : (
            <EmptyState title="No guild ranking yet" message="Paste leaderboard rows on the Snapshots tab to populate rank pressure and gap metrics." />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Top 10 Contribution Preview" eyebrow="Members">
        {topMembers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roblox</th>
                  <th>Discord</th>
                  <th>Contribution</th>
                  <th>Gain</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((member) => (
                  <tr key={member.roblox}>
                    <td className="font-semibold text-white">{member.roblox}</td>
                    <td className="text-slate-300">{member.discord || "-"}</td>
                    <td>{formatNumber(member.contribution)}</td>
                    <td className={getMemberGain(member) === null ? "" : getMemberGain(member) >= 0 ? "text-emerald-200" : "text-rose-200"}>{formatSigned(getMemberGain(member))}</td>
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
