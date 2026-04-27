import { Clipboard } from "lucide-react";
import { buildDiscordReport, formatNumber, formatSigned, getMemberGain, getMemberStatus } from "../lib/tracker";
import { EmptyState, SectionCard, StatusPill } from "./Shared";

export function Leaders({ state, tracker, onCopyReport }) {
  const { members, settings } = state;
  const topContribution = [...members].sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0)).slice(0, 10);
  const topGain = [...members].sort((a, b) => getMemberGain(b) - getMemberGain(a)).slice(0, 10);
  const lowMembers = members.filter((member) => getMemberStatus(member, settings.dailyRequirement) !== "Active");

  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <button type="button" className="btn btn-gold" onClick={() => onCopyReport(buildDiscordReport({ settings, tracker, members }))}>
          <Clipboard className="h-4 w-4" aria-hidden="true" />
          Copy Discord Report
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <LeaderTable title="Top 10 By Contribution" rows={topContribution} settings={settings} mode="contribution" />
        <LeaderTable title="Top 10 By Gain" rows={topGain} settings={settings} mode="gain" />
      </div>

      <SectionCard title="Low / No Contribution" eyebrow="Attention List">
        {lowMembers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Discord</th>
                  <th>Roblox</th>
                  <th>Contribution</th>
                  <th>Gain</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {lowMembers.map((member) => (
                  <tr key={member.roblox}>
                    <td>{member.discord || "—"}</td>
                    <td className="font-semibold text-white">{member.roblox}</td>
                    <td>{formatNumber(member.contribution)}</td>
                    <td>{formatSigned(getMemberGain(member))}</td>
                    <td><StatusPill status={getMemberStatus(member, settings.dailyRequirement)} /></td>
                    <td>{member.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No low contribution members" message="Everyone currently meets the configured daily requirement." />
        )}
      </SectionCard>
    </div>
  );
}

function LeaderTable({ title, rows, settings, mode }) {
  return (
    <SectionCard title={title} eyebrow="Leaders">
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Roblox</th>
                <th>Discord</th>
                <th>{mode === "gain" ? "Gain" : "Contribution"}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member, index) => (
                <tr key={member.roblox}>
                  <td>{index + 1}</td>
                  <td className="font-semibold text-white">{member.roblox}</td>
                  <td>{member.discord || "—"}</td>
                  <td>{mode === "gain" ? formatSigned(getMemberGain(member)) : formatNumber(member.contribution)}</td>
                  <td><StatusPill status={getMemberStatus(member, settings.dailyRequirement)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No leader data yet" message="Add member contribution checks to populate this leaderboard." />
      )}
    </SectionCard>
  );
}
