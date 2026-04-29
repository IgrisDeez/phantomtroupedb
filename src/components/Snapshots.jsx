import { Clipboard, Eraser, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { buildTrackerData, formatDecimal, formatNumber, formatSigned } from "../lib/tracker";
import { EmptyState, SectionCard } from "./Shared";

export function Snapshots({ state, setState, tracker, readOnly = false }) {
  const [snapshot1, setSnapshot1] = useState(state.snapshots.snapshot1);
  const [snapshot2, setSnapshot2] = useState(state.snapshots.snapshot2);

  useEffect(() => {
    setSnapshot1(state.snapshots.snapshot1);
    setSnapshot2(state.snapshots.snapshot2);
  }, [state.snapshots.snapshot1, state.snapshots.snapshot2]);

  const previewTracker = buildTrackerData({ snapshot1, snapshot2 }, state.settings);

  function saveSnapshots(nextSnapshot1 = snapshot1, nextSnapshot2 = snapshot2) {
    if (readOnly) return;
    setState((current) => ({
      ...current,
      snapshots: {
        snapshot1: nextSnapshot1,
        snapshot2: nextSnapshot2
      }
    }));
  }

  function clearData() {
    if (readOnly) return;
    setSnapshot1("");
    setSnapshot2("");
    saveSnapshots("", "");
  }

  async function copySheetsFormat() {
    const rows = previewTracker.latestRanking.map((row) =>
      [
        row.snapshot,
        row.timestamp,
        row.rank,
        row.guild,
        row.points,
        row.gap,
        row.totalGain ?? "",
        row.gainPerHour ?? "",
        row.perMemberHour ?? ""
      ].join("\t")
    );

    await navigator.clipboard.writeText(
      ["Snapshot\tTimestamp\tRank\tGuild\tPoints\tGap\tTotal Gain\tGain Per Hour\tPer Member / Hour", ...rows].join("\n")
    );
  }

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Snapshot Inputs"
        eyebrow="Manual Paste"
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={clearData} disabled={readOnly}>
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear Data
            </button>
            <button type="button" className="btn btn-primary" onClick={() => saveSnapshots()} disabled={readOnly}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Snapshots
            </button>
            <button type="button" className="btn" onClick={copySheetsFormat} disabled={!previewTracker.latestRanking.length}>
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              Copy Google Sheets Format
            </button>
          </div>
        }
      >
        {readOnly ? <p className="mb-4 text-sm text-zinc-400">Supabase live data is read-only in this phase.</p> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">Snapshot 1 input</span>
            <span className="text-xs text-slate-500">Format: snapshot, time, rank, guild, points. Use tabs between columns.</span>
            <textarea
              className="input min-h-56 resize-y font-mono"
              value={snapshot1}
              onChange={(event) => setSnapshot1(event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">Snapshot 2 input</span>
            <span className="text-xs text-slate-500">Use the newer leaderboard here. Leave blank until the next reading is ready.</span>
            <textarea
              className="input min-h-56 resize-y font-mono"
              value={snapshot2}
              onChange={(event) => setSnapshot2(event.target.value)}
              disabled={readOnly}
            />
          </label>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <ParsedTable title="Parsed Snapshot 1" rows={previewTracker.snapshotOneRows} />
        <ParsedTable title="Parsed Snapshot 2" rows={previewTracker.snapshotTwoRows} />
      </div>

      <SectionCard title="Latest Ranking" eyebrow="Calculated">
        {tracker.latestRanking.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Snapshot</th>
                  <th>Timestamp</th>
                  <th>Rank</th>
                  <th>Guild</th>
                  <th>Points</th>
                  <th>Gap</th>
                  <th>Total Gain</th>
                  <th>Gain Per Hour</th>
                  <th>Per Member / Hour</th>
                </tr>
              </thead>
              <tbody>
                {tracker.latestRanking.map((row) => (
                  <tr key={`${row.snapshot}-${row.rank}-${row.guild}`} className={row.isTrackedGuild ? "bg-blood/30 text-red-50 shadow-[inset_3px_0_0_rgba(185,28,28,0.9)]" : ""}>
                    <td>{row.snapshot}</td>
                    <td>{row.timestamp}</td>
                    <td>#{row.rank}</td>
                    <td className="font-semibold">{row.guild}</td>
                    <td>{formatNumber(row.points)}</td>
                    <td>{formatNumber(row.gap)}</td>
                    <td className={row.totalGain > 0 ? "text-zinc-100" : ""}>{formatSigned(row.totalGain)}</td>
                    <td className={row.gainPerHour > 0 ? "text-zinc-100" : ""}>{formatSigned(row.gainPerHour)}</td>
                    <td>{formatDecimal(row.perMemberHour, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No rankings loaded" message="Paste Snapshot 1 to begin tracking. Add Snapshot 2 later to calculate gain, pace, and member-hour rates." />
        )}
      </SectionCard>
    </div>
  );
}

function ParsedTable({ title, rows }) {
  return (
    <SectionCard title={title}>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Snapshot</th>
                <th>Timestamp</th>
                <th>Rank</th>
                <th>Guild</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.snapshot}-${row.rank}-${row.guild}`}>
                  <td>{row.snapshot}</td>
                  <td>{row.timestamp}</td>
                  <td>#{row.rank}</td>
                  <td className="font-semibold text-bone">{row.guild}</td>
                  <td>{formatNumber(row.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={`${title} is empty`} message="Paste tab-separated leaderboard rows to preview parsed data here." />
      )}
    </SectionCard>
  );
}
