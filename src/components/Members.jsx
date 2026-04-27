import { Check, Clipboard, SkipForward, StepBack, StepForward, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatNumber, formatSigned, getMemberGain, getMemberStatus } from "../lib/tracker";
import { EmptyState, SectionCard, StatusPill } from "./Shared";

export function Members({ state, setState }) {
  const { members, memberQueue, queueIndex, settings } = state;
  const currentUsername = memberQueue[queueIndex] || "";
  const [pasteText, setPasteText] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("contribution");
  const [form, setForm] = useState(blankForm(currentUsername));

  useEffect(() => {
    const existing = members.find((member) => member.roblox === currentUsername);
    setForm({
      discord: existing?.discord || "",
      roblox: currentUsername,
      contribution: existing?.contribution ?? 0,
      playtime: existing?.playtime || "",
      notes: existing?.notes || ""
    });
  }, [currentUsername, members]);

  const filteredMembers = useMemo(() => {
    return [...members]
      .filter((member) => {
        const status = getMemberStatus(member, settings.dailyRequirement);
        const query = search.toLowerCase();
        const matchesSearch = !query || member.roblox.toLowerCase().includes(query) || (member.discord || "").toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "gain") return getMemberGain(b) - getMemberGain(a);
        return Number(b.contribution || 0) - Number(a.contribution || 0);
      });
  }, [members, search, statusFilter, sortBy, settings.dailyRequirement]);

  function addMemberList() {
    const names = pasteText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!names.length) return;

    setState((current) => {
      const existingNames = new Set(current.members.map((member) => member.roblox.toLowerCase()));
      const queueNames = new Set(current.memberQueue.map((name) => name.toLowerCase()));
      const newMembers = names
        .filter((name) => !existingNames.has(name.toLowerCase()))
        .map((name) => ({
          discord: "",
          roblox: name,
          contribution: 0,
          previousContribution: 0,
          playtime: "",
          notes: "",
          lastChecked: ""
        }));
      const newQueue = names.filter((name) => !queueNames.has(name.toLowerCase()));

      return {
        ...current,
        members: [...current.members, ...newMembers],
        memberQueue: [...current.memberQueue, ...newQueue]
      };
    });
    setPasteText("");
  }

  function moveQueue(direction) {
    setState((current) => {
      if (!current.memberQueue.length) return current;
      const max = current.memberQueue.length - 1;
      const nextIndex = Math.min(max, Math.max(0, current.queueIndex + direction));
      return { ...current, queueIndex: nextIndex };
    });
  }

  async function copyUsername() {
    if (currentUsername) await navigator.clipboard.writeText(currentUsername);
  }

  function saveCheck(skip = false) {
    const username = form.roblox.trim();
    if (!username) return;

    setState((current) => {
      const existing = current.members.find((member) => member.roblox.toLowerCase() === username.toLowerCase());
      const nextMember = {
        discord: form.discord.trim(),
        roblox: username,
        contribution: Number(form.contribution) || 0,
        previousContribution: existing ? Number(existing.contribution) || 0 : 0,
        playtime: form.playtime.trim(),
        notes: skip ? `${form.notes || ""} Skipped`.trim() : form.notes.trim(),
        lastChecked: new Date().toISOString()
      };
      const nextMembers = existing
        ? current.members.map((member) => (member.roblox.toLowerCase() === username.toLowerCase() ? nextMember : member))
        : [...current.members, nextMember];
      const hasQueueName = current.memberQueue.some((name) => name.toLowerCase() === username.toLowerCase());
      const nextQueue = hasQueueName ? current.memberQueue : [...current.memberQueue, username];
      const nextIndex = Math.min(nextQueue.length - 1, current.queueIndex + 1);

      return {
        ...current,
        members: nextMembers,
        memberQueue: nextQueue,
        queueIndex: nextIndex
      };
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Member Queue"
          eyebrow="Manual Checks"
          action={
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => moveQueue(-1)} disabled={!memberQueue.length}>
                <StepBack className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <button type="button" className="btn" onClick={() => moveQueue(1)} disabled={!memberQueue.length}>
                <StepForward className="h-4 w-4" aria-hidden="true" />
                Next
              </button>
            </div>
          }
        >
          <textarea className="input min-h-32 resize-y" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste one Roblox username per line" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={addMemberList}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add To Queue
            </button>
            <button type="button" className="btn" onClick={copyUsername} disabled={!currentUsername}>
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              Copy Username
            </button>
            <button type="button" className="btn btn-gold" onClick={() => saveCheck(false)} disabled={!form.roblox}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Mark Checked
            </button>
            <button type="button" className="btn" onClick={() => saveCheck(true)} disabled={!form.roblox}>
              <SkipForward className="h-4 w-4" aria-hidden="true" />
              Skip
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Current: <span className="font-semibold text-white">{currentUsername || "No queued member"}</span>
          </p>
        </SectionCard>

        <SectionCard title="Contribution Entry" eyebrow="Manual Record">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Username</span>
              <input className="input" value={form.roblox} onChange={(event) => setForm({ ...form, roblox: event.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Discord</span>
              <input className="input" value={form.discord} onChange={(event) => setForm({ ...form, discord: event.target.value })} placeholder="Optional" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Contribution Points</span>
              <input className="input" type="number" min="0" value={form.contribution} onChange={(event) => setForm({ ...form, contribution: event.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild Playtime</span>
              <input className="input" value={form.playtime} onChange={(event) => setForm({ ...form, playtime: event.target.value })} placeholder="Optional" />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Notes</span>
              <textarea className="input min-h-20 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional" />
            </label>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Member Table" eyebrow="Requirement 50 Daily">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Discord or Roblox" />
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>All</option>
            <option>Active</option>
            <option>Low</option>
            <option>Inactive</option>
          </select>
          <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="contribution">Sort by contribution</option>
            <option value="gain">Sort by gain</option>
          </select>
        </div>

        {filteredMembers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Discord</th>
                  <th>Roblox</th>
                  <th>Contribution</th>
                  <th>Gain Since Previous</th>
                  <th>Trend</th>
                  <th>Status</th>
                  <th>Last Checked</th>
                  <th>Requirement</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const gain = getMemberGain(member);
                  const status = getMemberStatus(member, settings.dailyRequirement);
                  return (
                    <tr key={member.roblox}>
                      <td>{member.discord || "—"}</td>
                      <td className="font-semibold text-white">{member.roblox}</td>
                      <td>{formatNumber(member.contribution)}</td>
                      <td className={gain >= 0 ? "text-emerald-200" : "text-rose-200"}>{formatSigned(gain)}</td>
                      <td>{gain > 0 ? "Rising" : gain < 0 ? "Dropped" : "Flat"}</td>
                      <td><StatusPill status={status} /></td>
                      <td>{member.lastChecked ? new Date(member.lastChecked).toLocaleString() : "—"}</td>
                      <td>{settings.dailyRequirement}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No members match" message="Paste member names into the queue or adjust the current search and status filter." />
        )}
      </SectionCard>
    </div>
  );
}

function blankForm(username) {
  return {
    discord: "",
    roblox: username || "",
    contribution: 0,
    playtime: "",
    notes: ""
  };
}
