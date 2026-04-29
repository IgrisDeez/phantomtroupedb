import { useMemo, useState } from "react";
import {
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatSigned,
  getMemberGain,
  getMemberGainPerHour,
  getMemberStatus
} from "../lib/tracker";
import { DarkSelect, EmptyState, SectionCard, StatusPill } from "./Shared";

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Low", label: "Low" },
  { value: "Inactive", label: "Inactive" }
];

export function Contributions({ state }) {
  const { members, settings } = state;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const hasDiscord = members.some((member) => member.discord);

  const filteredMembers = useMemo(() => {
    return [...members]
      .filter((member) => {
        const status = getMemberStatus(member, settings.dailyRequirement);
        const query = search.trim().toLowerCase();
        const matchesSearch = !query || member.roblox.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0));
  }, [members, search, statusFilter, settings.dailyRequirement]);

  return (
    <SectionCard title="Contributions" eyebrow="Read Only">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search Roblox username"
          placeholder="Search Roblox username"
        />
        <DarkSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} ariaLabel="Filter contribution status" />
      </div>

      {filteredMembers.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roblox</th>
                {hasDiscord ? <th>Discord</th> : null}
                <th>Contribution</th>
                <th>Gain Since Previous</th>
                <th>Gain / Hour</th>
                <th>Status</th>
                <th>Last Check</th>
                <th>Previous Check</th>
                <th>Hours Since Previous</th>
                <th>Requirement</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const gain = getMemberGain(member);
                const status = getMemberStatus(member, settings.dailyRequirement);
                return (
                  <tr key={member.roblox}>
                    <td className="font-semibold text-bone">{member.roblox}</td>
                    {hasDiscord ? <td>{member.discord || "-"}</td> : null}
                    <td>{formatNumber(member.contribution)}</td>
                    <td className={gain === null ? "" : gain >= 0 ? "text-zinc-100" : "text-zinc-500"}>{formatSigned(member.gainSincePrevious)}</td>
                    <td>{formatSigned(getMemberGainPerHour(member))}</td>
                    <td><StatusPill status={status} /></td>
                    <td>{formatDateTime(member.lastChecked)}</td>
                    <td>{formatDateTime(member.previousChecked)}</td>
                    <td>{formatDecimal(member.hoursSincePrevious, 2)}</td>
                    <td>{settings.dailyRequirement}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No contribution rows" message="No member contribution data matches the current search and status filter." />
      )}
    </SectionCard>
  );
}
