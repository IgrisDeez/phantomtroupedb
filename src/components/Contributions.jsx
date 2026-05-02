import { useMemo, useState } from "react";
import {
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatSigned,
  getMemberGain,
  getMemberGainPerHour,
  getScaledDailyRequirement
} from "../lib/tracker";
import { getMemberStatusWithTolerance } from "../lib/memberStatus";
import { DarkSelect, EmptyState, SectionCard, StatusPill } from "./Shared";

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Low", label: "Low" },
  { value: "Inactive", label: "Inactive" },
  { value: "Error Check", label: "Error Check" }
];

export function Contributions({ state, isStaffView = false }) {
  const { members, settings } = state;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredMembers = useMemo(() => {
    return [...members]
      .filter((member) => {
        const status = getMemberStatusWithTolerance(member, settings.dailyRequirement);
        const query = search.trim().toLowerCase();
        const matchesSearch = !query || member.roblox.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0));
  }, [members, search, statusFilter, settings.dailyRequirement]);
  const latestCheck = useMemo(() => getLatestDate(filteredMembers.map((member) => member.lastChecked)), [filteredMembers]);
  const previousCheck = useMemo(() => getLatestDate(filteredMembers.map((member) => member.previousChecked)), [filteredMembers]);

  return (
    <SectionCard title="Contributions" eyebrow={isStaffView ? "Read Only" : "Member Status"}>
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
        isStaffView ? (
          <StaffContributionTable members={filteredMembers} settings={settings} />
        ) : (
          <MemberContributionView members={filteredMembers} settings={settings} latestCheck={latestCheck} previousCheck={previousCheck} />
        )
      ) : (
        <EmptyState title="No contribution rows" message="No contribution data matches the current search and status filter." />
      )}
    </SectionCard>
  );
}

function StaffContributionTable({ members, settings }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Roblox</th>
            <th>Contribution</th>
            <th>Gain Since Previous</th>
            <th>Gain / Hour</th>
            <th>Status</th>
            <th>Last Check</th>
            <th>Previous Check</th>
            <th>Hours Since Previous</th>
            <th>Interval Requirement</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const gain = getMemberGain(member);
            const status = getMemberStatusWithTolerance(member, settings.dailyRequirement);
            return (
              <tr key={member.roblox}>
                <td className="font-semibold text-bone">{member.roblox}</td>
                <td>{formatNumber(member.contribution)}</td>
                <td className={gain === null ? "" : gain >= 0 ? "text-zinc-100" : "text-zinc-500"}>{formatSigned(member.gainSincePrevious)}</td>
                <td>{formatSigned(getMemberGainPerHour(member))}</td>
                <td><StatusPill status={status} /></td>
                <td>{formatDateTime(member.lastChecked)}</td>
                <td>{formatDateTime(member.previousChecked)}</td>
                <td>{formatDecimal(member.hoursSincePrevious, 2)}</td>
                <td>{formatNumber(getScaledDailyRequirement(member, settings.dailyRequirement))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MemberContributionView({ members, settings, latestCheck, previousCheck }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <TimingCard label="Latest Check" value={formatDateTime(latestCheck)} />
        <TimingCard label="Previous Check" value={formatDateTime(previousCheck)} />
        <TimingCard label="Daily Goal" value={`${formatNumber(settings.dailyRequirement)} points`} />
      </div>

      <div className="grid gap-3 lg:hidden">
        {members.map((member) => {
          const gain = getMemberGain(member);
          const status = getMemberStatusWithTolerance(member, settings.dailyRequirement);
          return (
            <article key={member.roblox} className="rounded-lg border border-blood/20 bg-gradient-to-br from-marrow/35 to-black/25 p-4 shadow-[inset_0_1px_0_rgba(248,113,113,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-bone">{member.roblox}</h3>
                  <p className="mt-1 text-sm text-zinc-400">Last checked: {formatDateTime(member.lastChecked)}</p>
                </div>
                <StatusPill status={status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <CompactStat label="Contribution" value={formatNumber(member.contribution)} />
                <CompactStat label="Since Previous" value={formatSigned(gain)} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="table-wrap hidden lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Roblox</th>
              <th>Contribution</th>
              <th>Status</th>
              <th>Last Checked</th>
              <th>Since Previous Check</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const gain = getMemberGain(member);
              const status = getMemberStatusWithTolerance(member, settings.dailyRequirement);
              return (
                <tr key={member.roblox}>
                  <td className="font-semibold text-bone">{member.roblox}</td>
                  <td>{formatNumber(member.contribution)}</td>
                  <td><StatusPill status={status} /></td>
                  <td>{formatDateTime(member.lastChecked)}</td>
                  <td className={gain === null ? "" : gain >= 0 ? "text-zinc-100" : "text-zinc-500"}>{formatSigned(gain)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimingCard({ label, value }) {
  return (
    <div className="rounded-lg border border-blood/20 bg-gradient-to-br from-marrow/35 to-black/25 p-3 shadow-[inset_0_1px_0_rgba(248,113,113,0.06)]">
      <p className="inline-flex rounded-full border border-blood/20 bg-black/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-red-200/60">{label}</p>
      <p className="mt-2 text-sm font-semibold text-bone">{value}</p>
    </div>
  );
}

function CompactStat({ label, value }) {
  return (
    <div className="rounded-md border border-blood/15 bg-marrow/25 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/45">{label}</p>
      <p className="mt-1 font-semibold text-bone">{value}</p>
    </div>
  );
}

function getLatestDate(values) {
  const latest = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : "";
}
