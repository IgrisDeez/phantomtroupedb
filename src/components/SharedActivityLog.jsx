import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionCard } from "./Shared";

export function SharedActivityLog({ actions = null, canWrite = false, dataSource = "unknown" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");

  const enabled = dataSource === "supabase" && canWrite && Boolean(actions?.fetchAdminActivityLog);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    loadRows(active);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, actions]);

  async function loadRows(active = true) {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const result = await actions.fetchAdminActivityLog(100);
      if (!active) return;
      setRows(result?.rows || []);
      setUnavailable(Boolean(result?.unavailable));
    } catch (err) {
      if (!active) return;
      setError(err?.message || "Failed to load shared activity log.");
    } finally {
      if (active) setLoading(false);
    }
  }

  function exportRows() {
    const json = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        app: "Phantom Troupe Guild Tracker",
        version: 1,
        source: "supabase",
        sharedActivityLog: rows
      },
      null,
      2
    );
    downloadText(`phantom-troupe-shared-activity-log-${getFileStamp()}.json`, json);
  }

  if (dataSource !== "supabase") return null;

  return (
    <SectionCard title="Shared Activity Log" eyebrow={unavailable ? "SQL Needed" : "Supabase Audit Trail"}>
      <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm leading-6 text-zinc-300">
        <p className="font-semibold text-bone">Shared admin activity</p>
        {unavailable ? (
          <p className="mt-1">Run <span className="font-mono text-red-100">supabase/admin_activity_log.sql</span> in Supabase SQL Editor to enable shared logging.</p>
        ) : (
          <p className="mt-1">This reads recent admin actions from Supabase, so officers can audit changes across devices.</p>
        )}
      </div>

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <button type="button" className="btn btn-steel w-full sm:w-auto" onClick={() => loadRows(true)} disabled={!enabled || loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {loading ? "Refreshing..." : "Refresh Shared Log"}
        </button>
        <button type="button" className="btn w-full sm:w-auto" onClick={exportRows} disabled={!rows.length}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Shared Log
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-200/80">{error}</p> : null}

      <div className="table-wrap mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Role</th>
              <th>Discord ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.timestamp)}</td>
                <td className="font-semibold text-bone">{entry.action || "-"}</td>
                <td>{entry.actorRole || "-"}</td>
                <td className="font-mono text-xs">{entry.actorDiscordId || "-"}</td>
                <td className="font-mono text-xs text-zinc-400">{formatDetails(entry.details)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="text-center text-zinc-400">
                  {unavailable ? "Shared log table is not enabled yet." : loading ? "Loading shared activity..." : "No shared activity recorded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatDetails(details) {
  if (!details || typeof details !== "object" || !Object.keys(details).length) return "-";
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${formatDetailValue(value)}`)
    .join(" | ");
}

function formatDetailValue(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getFileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
