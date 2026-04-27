import { Clipboard, Database, Eraser, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { demoSnapshotOne, demoSnapshotTwo } from "../lib/storage";
import { buildTrackerData, formatDecimal, formatNumber, formatSigned } from "../lib/tracker";
import { EmptyState, SectionCard } from "./Shared";

export function Snapshots({ state, setState, tracker }) {
  const [snapshot1, setSnapshot1] = useState(state.snapshots.snapshot1);
  const [snapshot2, setSnapshot2] = useState(state.snapshots.snapshot2);

  useEffect(() => {
    setSnapshot1(state.snapshots.snapshot1);
    setSnapshot2(state.snapshots.snapshot2);
  }, [state.snapshots.snapshot1, state.snapshots.snapshot2]);

  const previewTracker = buildTrackerData({ snapshot1, snapshot2 }, state.settings);

  function saveSnapshots(nextSnapshot1 = snapshot1, nextSnapshot2 = snapshot2) {
    setState((current) => ({
      ...current,
      snapshots: {
        snapshot1: nextSnapshot1,
        snapshot2: nextSnapshot2
      }
    }));
  }

  function loadExampleData() {
    setSnapshot1(demoSnapshotOne);
    setSnapshot2(demoSnapshotTwo);
    saveSnapshots(demoSnapshotOne, demoSnapshotTwo);
  }

  function clearData() {
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
            <button type="button" className="btn btn-gold" onClick={loadExampleData}>
              <Database className="h-4 w-4" aria-hidden="true" />
              Load Example Data
            </button>
            <button type="button" className="btn" onClick={clearData}>
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear Data
            </button>
            <button type="button" className="btn btn-primary" onClick={() => saveSnapshots()}>
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
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">Snapshot 1 input</span>
            <textarea
              className="input min-h-56 resize-y font-mono"
              value={snapshot1}
              onChange={(event) => setSnapshot1(event.target.value)}
              placeholder={"1\t18:57\t1\tunveil\t369700"}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">Snapshot 2 input</span>
            <textarea
              className="input min-h-56 resize-y font-mono"
              value={snapshot2}
              onChange={(event) => setSnapshot2(event.target.value)}
              placeholder={"2\t21:27\t1\tunveil\t383500"}
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
                  <tr key={`${row.snapshot}-${row.rank}-${row.guild}`} className={row.isTrackedGuild ? "bg-phantom/15 text-white" : ""}>
                    <td>{row.snapshot}</td>
                    <td>{row.timestamp}</td>
                    <td>#{row.rank}</td>
                    <td className="font-semibold">{row.guild}</td>
                    <td>{formatNumber(row.points)}</td>
                    <td>{formatNumber(row.gap)}</td>
                    <td className={row.totalGain > 0 ? "text-emerald-200" : ""}>{formatSigned(row.totalGain)}</td>
                    <td className={row.gainPerHour > 0 ? "text-emerald-200" : ""}>{formatSigned(row.gainPerHour)}</td>
                    <td>{formatDecimal(row.perMemberHour, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No rankings loaded" message="Paste Snapshot 1, Snapshot 2, or load example data to calculate the latest ranking table." />
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
                  <td className="font-semibold text-white">{row.guild}</td>
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
