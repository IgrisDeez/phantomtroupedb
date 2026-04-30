import { Clipboard, Save } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildSnapshotHistory,
  compareSnapshotRows,
  formatDurationHours,
  formatNumber,
  formatSigned,
  parseSnapshotHistoryTsv
} from "../lib/tracker";
import { DarkSelect, EmptyState, SectionCard, StatCard } from "./Shared";

export function SnapshotImport({ state, setState, readOnly = false, canWrite = false, actions = null, saving = false, mutationError = "" }) {
  const [input, setInput] = useState("");
  const [importDate, setImportDate] = useState(() => getTodayInTimezone(state.settings.guildTimezone));
  const [preview, setPreview] = useState(null);
  const [selectedFrom, setSelectedFrom] = useState("");
  const [selectedTo, setSelectedTo] = useState("");
  const locked = readOnly && !canWrite;
  const historyRows = useMemo(() => buildSnapshotHistory(state.snapshotHistory || [], state.settings), [state.snapshotHistory, state.settings]);
  const snapshotOptions = historyRows.map((row) => ({ value: String(row.snapshot), label: `Snapshot ${row.snapshot} - ${formatGmtTime(row.timestamp)}` }));
  const defaultComparison = historyRows.length >= 2 ? compareSnapshotRows(historyRows[historyRows.length - 2], historyRows[historyRows.length - 1]) : null;
  const manualComparison = selectedFrom && selectedTo
    ? compareSnapshotRows(
      historyRows.find((row) => String(row.snapshot) === selectedFrom),
      historyRows.find((row) => String(row.snapshot) === selectedTo)
    )
    : null;
  const comparison = manualComparison || defaultComparison;

  function previewImport() {
    const parsed = parseSnapshotHistoryTsv(input, state.settings, { importDate });
    const existingSnapshots = new Set((state.snapshotHistory || []).map((row) => Number(row.snapshot)));
    const pastedSnapshots = new Set(parsed.rows.map((row) => Number(row.snapshot)));
    const existingWarnings = [...pastedSnapshots]
      .filter((snapshot) => existingSnapshots.has(snapshot))
      .map((snapshot) => `Snapshot ${snapshot} already exists and will be updated.`);
    setPreview({
      ...parsed,
      warnings: [...parsed.warnings, ...existingWarnings]
    });
  }

  async function saveImport() {
    if (locked || !preview?.rows.length) return;
    if (readOnly && canWrite) {
      await actions?.saveSnapshotHistory(preview.rows, input);
      return;
    }

    setState((current) => {
      const nextRows = [...(current.snapshotHistory || [])];
      preview.rows.forEach((row) => {
        const index = nextRows.findIndex((existing) =>
          Number(existing.snapshot) === Number(row.snapshot) &&
          String(existing.guild || "").trim().toLowerCase() === String(row.guild || "").trim().toLowerCase()
        );
        if (index >= 0) nextRows[index] = row;
        else nextRows.push(row);
      });

      return {
        ...current,
        snapshotHistory: nextRows,
        snapshotRawImports: [
          ...(current.snapshotRawImports || []),
          { importedAt: new Date().toISOString(), rawText: input }
        ]
      };
    });
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="TSV Screenshot Import"
        eyebrow="Officer Import"
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={previewImport} disabled={!input.trim() || saving}>
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              Preview Import
            </button>
            <button type="button" className="btn btn-primary" onClick={saveImport} disabled={locked || saving || !preview?.rows.length}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? "Saving..." : "Save Import"}
            </button>
          </div>
        }
      >
        {locked ? <p className="mb-4 text-sm text-zinc-400">Only officers can import live snapshot history.</p> : null}
        {readOnly && canWrite ? <p className="mb-4 text-sm text-zinc-400">Paste screenshot TSV, preview it, then save to live data.</p> : null}
        {mutationError ? <p className="mb-4 text-sm text-red-200/80">{mutationError}</p> : null}
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-slate-200">Paste TSV</span>
          <span className="text-xs text-slate-500">Required columns: snapshot, time, rank, guild, points. Paste screenshot times in GMT+8.</span>
          <div className="mb-1 grid gap-3 sm:grid-cols-[14rem_1fr]">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Import Date</span>
              <input
                className="input"
                type="date"
                value={importDate}
                onChange={(event) => setImportDate(event.target.value)}
                disabled={locked || saving}
              />
            </label>
            <div className="rounded-lg border border-blood/20 bg-black/25 px-3 py-2 text-sm text-zinc-400">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Guild Timezone</p>
              <p className="mt-1 font-semibold text-bone">GMT+8</p>
            </div>
          </div>
          <label className="grid gap-1">
            <span className="sr-only">Paste TSV rows</span>
            <textarea
              className="input min-h-48 resize-y font-mono"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={locked || saving}
              placeholder={"snapshot\ttime\trank\tguild\tpoints\n2\t1:22 PM\t6\tPhantom Troupe\t518100"}
            />
          </label>
        </div>
      </SectionCard>

      {preview ? (
        <SectionCard title="Import Preview" eyebrow="Validation">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Valid Rows" value={preview.rows.length} />
            <StatCard label="Skipped Rows" value={preview.skipped.length} tone="slate" />
            <StatCard label="Warnings" value={preview.warnings.length} tone="steel" />
          </div>
          {preview.warnings.length ? (
            <div className="mt-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm text-zinc-300">
              {preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}
          {preview.skipped.length ? (
            <div className="mt-4 rounded-lg border border-blood/25 bg-black/25 p-4 text-sm text-zinc-300">
              {preview.skipped.map((row) => <p key={`${row.line}-${row.reason}`}>Line {row.line}: {row.reason}</p>)}
            </div>
          ) : null}
          <RowsTable rows={preview.rows} />
        </SectionCard>
      ) : null}

      <SectionCard title="Snapshot Comparison" eyebrow="Phantom Troupe">
        {historyRows.length >= 2 ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DarkSelect value={selectedFrom || snapshotOptions.at(-2)?.value || ""} onChange={setSelectedFrom} options={snapshotOptions} ariaLabel="Select comparison start snapshot" />
              <DarkSelect value={selectedTo || snapshotOptions.at(-1)?.value || ""} onChange={setSelectedTo} options={snapshotOptions} ariaLabel="Select comparison end snapshot" />
            </div>
            {comparison ? <ComparisonCard comparison={comparison} /> : null}
          </div>
        ) : (
          <EmptyState title="No comparison yet" message="Save at least two Phantom Troupe snapshot rows to compare rank, points, and hourly pace." />
        )}
      </SectionCard>

      <SectionCard title="Snapshot History" eyebrow="Tracked Guild">
        {historyRows.length ? <HistoryTable rows={historyRows} /> : <EmptyState title="No tracked snapshot history" message="Paste TSV rows that include Phantom Troupe to build history." />}
      </SectionCard>
    </div>
  );
}

function RowsTable({ rows }) {
  return (
    <div className="table-wrap mt-4">
      <table className="data-table">
        <thead>
          <tr>
            <th>Snapshot</th>
            <th>Time GMT+8</th>
            <th>Rank</th>
            <th>Guild</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={`${row.snapshot}-${row.guild}`} className={row.isTrackedGuild ? "bg-blood/30 text-red-50 shadow-[inset_3px_0_0_rgba(185,28,28,0.9)]" : ""}>
              <td>{row.snapshot}</td>
              <td>{formatGmtTime(row.timestamp)}</td>
              <td>{formatRank(row.rank)}</td>
              <td className="font-semibold">{row.guild}</td>
              <td>{formatNumber(row.points)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan="5" className="text-center text-zinc-400">No valid rows parsed.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function getTodayInTimezone(timeZone = "Asia/Taipei") {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function ComparisonCard({ comparison }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-lg border border-blood/25 bg-marrow/35 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Snapshot {comparison.from.snapshot} - {formatGmtTime(comparison.from.timestamp)}</p>
        <p className="mt-3 text-sm text-zinc-300">Phantom Troupe rank: <span className="font-semibold text-bone">{formatRank(comparison.from.rank)}</span></p>
        <p className="mt-1 text-sm text-zinc-300">Phantom Troupe points: <span className="font-semibold text-bone">{formatNumber(comparison.from.points)}</span></p>
      </div>
      <div className="rounded-lg border border-blood/25 bg-marrow/35 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Snapshot {comparison.to.snapshot} - {formatGmtTime(comparison.to.timestamp)}</p>
        <p className="mt-3 text-sm text-zinc-300">Phantom Troupe rank: <span className="font-semibold text-bone">{formatRank(comparison.to.rank)}</span></p>
        <p className="mt-1 text-sm text-zinc-300">Phantom Troupe points: <span className="font-semibold text-bone">{formatNumber(comparison.to.points)}</span></p>
      </div>
      <div className="rounded-lg border border-blood/25 bg-wine/35 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/55">Change</p>
        <p className="mt-3 text-sm text-zinc-300">Rank movement: <span className="font-semibold text-bone">{formatSigned(comparison.rankMovement)}</span></p>
        <p className="mt-1 text-sm text-zinc-300">Point gain: <span className="font-semibold text-bone">{formatSigned(comparison.pointGain)}</span></p>
        <p className="mt-1 text-sm text-zinc-300">Time passed: <span className="font-semibold text-bone">{formatDurationHours(comparison.hoursPassed)}</span></p>
        <p className="mt-1 text-sm text-zinc-300">Gain rate: <span className="font-semibold text-bone">{formatSigned(comparison.pointsPerHour)} pts/hr</span></p>
      </div>
    </div>
  );
}

function HistoryTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Snapshot</th>
            <th>Time GMT+8</th>
            <th>Phantom Rank</th>
            <th>Phantom Points</th>
            <th>Point Gain</th>
            <th>Rank Movement</th>
            <th>Points / Hour</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.snapshot}-${row.guild}`}>
              <td>{row.snapshot}</td>
              <td>{formatGmtTime(row.timestamp)}</td>
              <td>{formatRank(row.rank)}</td>
              <td>{formatNumber(row.points)}</td>
              <td>{formatSigned(row.pointGain)}</td>
              <td>{formatSigned(row.rankMovement)}</td>
              <td>{formatSigned(row.pointsPerHour)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatRank(rank) {
  return rank === null || rank === undefined ? "N/A" : `#${rank}`;
}

function formatGmtTime(value) {
  if (!value) return "-";
  return String(value).includes("GMT+8") ? String(value) : `${value} GMT+8`;
}
