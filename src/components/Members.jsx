import { Check, Clipboard, FileUp, Save, SkipForward, StepBack, StepForward, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  applyMemberImport,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatSigned,
  getMemberGain,
  getMemberGainPerHour,
  getMemberStatus,
  parseMemberImport
} from "../lib/tracker";
import { DarkSelect, EmptyState, SectionCard, StatusPill } from "./Shared";

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Low", label: "Low" },
  { value: "Inactive", label: "Inactive" }
];

const sortOptions = [
  { value: "contribution", label: "Sort by contribution" },
  { value: "gain", label: "Sort by gain" },
  { value: "gainPerHour", label: "Sort by gain/hour" }
];

export function Members({ state, setState, readOnly = false }) {
  const { members, memberQueue, queueIndex, settings } = state;
  const currentUsername = memberQueue[queueIndex] || "";
  const [pasteText, setPasteText] = useState("");
  const [importText, setImportText] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("contribution");
  const [form, setForm] = useState(blankForm(currentUsername));
  const importPreview = useMemo(() => parseMemberImport(importText), [importText]);

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
        if (sortBy === "gainPerHour") return Number(getMemberGainPerHour(b) ?? -Infinity) - Number(getMemberGainPerHour(a) ?? -Infinity);
        return Number(b.contribution || 0) - Number(a.contribution || 0);
      });
  }, [members, search, statusFilter, sortBy, settings.dailyRequirement]);

  function addMemberList() {
    if (readOnly) return;
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

  async function loadImportFile(event) {
    if (readOnly) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setImportText(await file.text());
    event.target.value = "";
  }

  function saveImport() {
    if (readOnly) return;
    if (!importPreview.rows.length) return;
    setState((current) => applyMemberImport(current, importPreview.rows));
    setImportText("");
  }

  function saveCheck(skip = false) {
    if (readOnly) return;
    const username = form.roblox.trim();
    if (!username) return;

    setState((current) => {
      const existing = current.members.find((member) => member.roblox.toLowerCase() === username.toLowerCase());
      const checkedAt = new Date().toISOString();
      const nextMember = {
        discord: form.discord.trim(),
        roblox: username,
        contribution: Number(form.contribution) || 0,
        previousContribution: existing ? Number(existing.contribution) || 0 : 0,
        playtime: form.playtime.trim(),
        notes: skip ? `${form.notes || ""} Skipped`.trim() : form.notes.trim(),
        lastChecked: checkedAt
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
        memberChecks: [
          ...(current.memberChecks || []),
          {
            timestamp: checkedAt,
            roblox: username,
            contribution: nextMember.contribution,
            discord: nextMember.discord,
            playtime: nextMember.playtime,
            notes: nextMember.notes,
            batchId: `manual-${Date.now()}`
          }
        ],
        memberQueue: nextQueue,
        queueIndex: nextIndex
      };
    });
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Member Import"
        eyebrow="Irregular Check Batches"
        action={
          <div className="flex flex-wrap gap-2">
            <label className="btn">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Upload CSV/TSV
              <input className="sr-only" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={loadImportFile} disabled={readOnly} />
            </label>
            <button type="button" className="btn btn-primary" onClick={saveImport} disabled={readOnly || !importPreview.rows.length}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Import
            </button>
          </div>
        }
      >
        {readOnly ? <p className="mb-4 text-sm text-zinc-400">Supabase live data is read-only in this phase.</p> : null}
        <p className="mb-2 text-xs text-slate-500">Required columns: Timestamp, Roblox, Contribution. Optional columns: Discord, Playtime, Notes.</p>
        <textarea className="input min-h-36 resize-y font-mono" value={importText} onChange={(event) => setImportText(event.target.value)} aria-label="Member import TSV or CSV" disabled={readOnly} />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ImportCount label="Valid Rows" value={importPreview.rows.length} />
          <ImportCount label="Skipped Rows" value={importPreview.skipped.length} tone="warn" />
          <ImportCount label="Duplicates" value={importPreview.duplicates.length} tone="steel" />
        </div>

        {importPreview.rows.length ? <ImportPreviewTable rows={importPreview.rows} /> : null}

        {importPreview.skipped.length || importPreview.duplicates.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <ImportIssueList title="Skipped Rows" rows={importPreview.skipped} />
            <ImportIssueList title="Duplicate Rows" rows={importPreview.duplicates} />
          </div>
        ) : null}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Member Queue"
          eyebrow="Manual Checks"
          action={
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => moveQueue(-1)} disabled={readOnly || !memberQueue.length}>
                <StepBack className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <button type="button" className="btn" onClick={() => moveQueue(1)} disabled={readOnly || !memberQueue.length}>
                <StepForward className="h-4 w-4" aria-hidden="true" />
                Next
              </button>
            </div>
          }
        >
          <p className="mb-2 text-xs text-slate-500">Paste one Roblox username per line.</p>
          <textarea className="input min-h-32 resize-y" value={pasteText} onChange={(event) => setPasteText(event.target.value)} aria-label="Roblox username queue" disabled={readOnly} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={addMemberList} disabled={readOnly}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add To Queue
            </button>
            <button type="button" className="btn" onClick={copyUsername} disabled={!currentUsername}>
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              Copy Username
            </button>
            <button type="button" className="btn btn-steel" onClick={() => saveCheck(false)} disabled={readOnly || !form.roblox}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Mark Checked
            </button>
            <button type="button" className="btn" onClick={() => saveCheck(true)} disabled={readOnly || !form.roblox}>
              <SkipForward className="h-4 w-4" aria-hidden="true" />
              Skip
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Current: <span className="font-semibold text-bone">{currentUsername || "No queued member"}</span>
          </p>
        </SectionCard>

        <SectionCard title="Contribution Entry" eyebrow="Manual Record">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Username</span>
              <input className="input" value={form.roblox} onChange={(event) => setForm({ ...form, roblox: event.target.value })} disabled={readOnly} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Discord</span>
              <input className="input" value={form.discord} onChange={(event) => setForm({ ...form, discord: event.target.value })} aria-label="Discord username" disabled={readOnly} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Contribution Points</span>
              <input className="input" type="number" min="0" value={form.contribution} onChange={(event) => setForm({ ...form, contribution: event.target.value })} disabled={readOnly} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild Playtime</span>
              <input className="input" value={form.playtime} onChange={(event) => setForm({ ...form, playtime: event.target.value })} aria-label="Guild playtime" disabled={readOnly} />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Notes</span>
              <textarea className="input min-h-20 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} aria-label="Member notes" disabled={readOnly} />
            </label>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Member Table" eyebrow={`Requirement ${settings.dailyRequirement} Daily`}>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search Discord or Roblox" />
          <DarkSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} ariaLabel="Filter member status" />
          <DarkSelect value={sortBy} onChange={setSortBy} options={sortOptions} ariaLabel="Sort members" />
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
                  <th>Gain / Hour</th>
                  <th>Trend</th>
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
                      <td>{member.discord || "-"}</td>
                      <td className="font-semibold text-bone">{member.roblox}</td>
                      <td>{formatNumber(member.contribution)}</td>
                      <td className={gain === null ? "" : gain >= 0 ? "text-zinc-100" : "text-zinc-500"}>{formatSigned(member.gainSincePrevious)}</td>
                      <td>{formatSigned(getMemberGainPerHour(member))}</td>
                      <td>{gain === null ? "-" : gain > 0 ? "Rising" : gain < 0 ? "Dropped" : "Flat"}</td>
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
          <EmptyState title="No members match" message="Import a check batch, add members to the queue, or adjust the current search and status filter." />
        )}
      </SectionCard>
    </div>
  );
}

function ImportCount({ label, value, tone = "default" }) {
  const toneClass = tone === "warn" ? "text-zinc-300" : tone === "steel" ? "text-red-200" : "text-bone";
  return (
    <div className="panel-soft rounded-lg p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ImportPreviewTable({ rows }) {
  return (
    <div className="table-wrap mt-4">
      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Roblox</th>
            <th>Contribution</th>
            <th>Discord</th>
            <th>Playtime</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((row) => (
            <tr key={`${row.roblox}-${row.timestamp}`}>
              <td>{formatDateTime(row.timestamp)}</td>
              <td className="font-semibold text-bone">{row.roblox}</td>
              <td>{formatNumber(row.contribution)}</td>
              <td>{row.discord || "-"}</td>
              <td>{row.playtime || "-"}</td>
              <td>{row.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportIssueList({ title, rows }) {
  if (!rows.length) {
    return (
      <div className="panel-soft rounded-lg p-4">
        <p className="font-semibold text-bone">{title}</p>
        <p className="mt-1 text-sm text-slate-400">None</p>
      </div>
    );
  }

  return (
    <div className="panel-soft rounded-lg p-4">
      <p className="font-semibold text-bone">{title}</p>
      <div className="mt-3 max-h-44 overflow-auto text-sm text-slate-300">
        {rows.map((row, index) => (
          <p key={`${row.line || row.roblox}-${index}`} className="border-t border-blood/20 py-2 first:border-t-0">
            {row.line ? `Line ${row.line}: ` : ""}{row.roblox ? `${row.roblox}: ` : ""}{row.reason}
          </p>
        ))}
      </div>
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
