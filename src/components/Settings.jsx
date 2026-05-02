import { Download, RotateCcw, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clearActivityLog, exportActivityLog, loadActivityLog, recordActivity } from "../lib/activityLog";
import { buildDataHealthReport, getHealthTone, stringifyDebugReport } from "../lib/diagnostics";
import { clearState, createEmptyState, exportState, importState, loadLastExportedAt, saveLastExportedAt } from "../lib/storage";
import { SectionCard } from "./Shared";

export function Settings({
  state,
  setState,
  readOnly = false,
  canWrite = false,
  canMigrateBackup = false,
  canEditTracking = false,
  actions = null,
  saving = false,
  mutationError = "",
  dataSource = "unknown",
  role = "unknown"
}) {
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [debugText, setDebugText] = useState("");
  const [importError, setImportError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [lastExportedAt, setLastExportedAt] = useState(() => loadLastExportedAt());
  const [draftSettings, setDraftSettings] = useState(state.settings);
  const [migrationText, setMigrationText] = useState("");
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [migrationError, setMigrationError] = useState("");
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState("");
  const [profileLinks, setProfileLinks] = useState([]);
  const [profileLinksError, setProfileLinksError] = useState("");
  const [profileLinkSuccess, setProfileLinkSuccess] = useState("");
  const [profileLinkForm, setProfileLinkForm] = useState({ discordId: "", label: "", robloxUsername: "" });
  const [activityLog, setActivityLog] = useState(() => loadActivityLog());
  const locked = readOnly && !canWrite;
  const healthReport = useMemo(() => buildDataHealthReport(state), [state]);
  const healthTone = getHealthTone(healthReport);

  useEffect(() => {
    setDraftSettings(state.settings);
  }, [state.settings]);

  useEffect(() => {
    if (!readOnly || !canWrite || !actions?.fetchProfileLinks) return undefined;
    let active = true;
    actions.fetchProfileLinks()
      .then((links) => {
        if (active) {
          setProfileLinks(links);
          setProfileLinksError("");
        }
      })
      .catch((error) => {
        if (active) setProfileLinksError(error?.message || "Failed to load profile links.");
      });
    return () => {
      active = false;
    };
  }, [actions, canWrite, readOnly]);

  function logActivity(action, details = {}) {
    setActivityLog(recordActivity(action, { dataSource, role, ...details }));
  }

  function updateSetting(key, value) {
    if (locked) return;
    if (readOnly && canWrite) {
      setDraftSettings((current) => ({ ...current, [key]: value }));
      return;
    }
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
  }

  async function saveSettings() {
    if (locked || !canWrite) return;
    const saved = await actions?.updateGuildSettings(draftSettings);
    if (saved) {
      logActivity("Saved guild settings", {
        guildName: draftSettings.guildName,
        trackedGuildName: draftSettings.trackedGuildName,
        dailyRequirement: draftSettings.dailyRequirement,
        memberCap: draftSettings.memberCap
      });
    }
  }

  async function makeExport() {
    const json = exportState(state);
    setExportText(json);
    await copyToClipboard(json);
    downloadText(`phantom-troupe-backup-${getFileStamp()}.json`, json);
    const timestamp = new Date().toISOString();
    saveLastExportedAt(timestamp);
    setLastExportedAt(timestamp);
    logActivity("Exported backup JSON", getStateCounts(state));
  }

  async function makeDebugExport() {
    const json = stringifyDebugReport(state, { dataSource, role });
    setDebugText(json);
    await copyToClipboard(json);
    downloadText(`phantom-troupe-debug-report-${getFileStamp()}.json`, json);
    logActivity("Exported debug report", {
      ...getStateCounts(state),
      healthErrors: healthReport.summary.errors,
      healthWarnings: healthReport.summary.warnings,
      healthInfo: healthReport.summary.info
    });
  }

  function importJson() {
    if (readOnly) return;
    try {
      const importedState = importState(importText);
      setState(importedState);
      logActivity("Imported local JSON backup", getStateCounts(importedState));
      setImportError("");
      setImportText("");
    } catch {
      setImportError("Import failed. Paste a valid exported JSON file.");
    }
  }

  function clearAll() {
    if (readOnly) return;
    clearState();
    setState(createEmptyState());
    setConfirmClear(false);
    logActivity("Cleared all local data");
  }

  function exportActivity() {
    const json = exportActivityLog();
    downloadText(`phantom-troupe-activity-log-${getFileStamp()}.json`, json);
    setExportText(json);
  }

  function clearActivities() {
    setActivityLog(clearActivityLog());
  }

  function previewMigration() {
    try {
      const parsed = importState(migrationText);
      setMigrationPreview({
        state: parsed,
        counts: getMigrationCounts(parsed)
      });
      setMigrationError("");
      setMigrationConfirmed(false);
      setMigrationSuccess("");
      logActivity("Previewed Supabase migration backup", getStateCounts(parsed));
    } catch {
      setMigrationPreview(null);
      setMigrationError("Preview failed. Paste a valid exported JSON backup.");
      setMigrationConfirmed(false);
      setMigrationSuccess("");
    }
  }

  async function migrateToSupabase() {
    if (!migrationPreview || !migrationConfirmed || !canWrite) return;
    const saved = await actions?.migrateBackupToSupabase(migrationPreview.state);
    if (saved) {
      setMigrationSuccess("Migration completed. Supabase data has been refreshed.");
      setMigrationConfirmed(false);
      logActivity("Migrated backup to Supabase", migrationPreview.counts);
    }
  }

  async function saveProfileLink() {
    if (!canWrite || !profileLinkForm.discordId.trim() || !profileLinkForm.robloxUsername.trim()) return;
    const saved = await actions?.saveProfileLink(profileLinkForm);
    if (saved) {
      setProfileLinkSuccess("Profile link saved.");
      logActivity("Saved profile link", {
        discordId: profileLinkForm.discordId,
        label: profileLinkForm.label,
        robloxUsername: profileLinkForm.robloxUsername
      });
      setProfileLinkForm({ discordId: "", label: "", robloxUsername: "" });
      setProfileLinks(await actions.fetchProfileLinks());
      setProfileLinksError("");
    }
  }

  function editProfileLink(link) {
    setProfileLinkForm({
      discordId: link.discordId,
      label: link.label,
      robloxUsername: link.robloxUsername
    });
    setProfileLinkSuccess("");
  }

  return (
    <div className="grid gap-5">
      <SectionCard title="Guild Settings" eyebrow="Configuration">
        {locked ? <p className="mb-4 text-sm text-zinc-400">Officer access is required to edit live settings.</p> : null}
        {readOnly && canWrite ? <p className="mb-4 text-sm text-zinc-400">Review setting changes, then save them to live data.</p> : null}
        {mutationError ? <p className="mb-4 text-sm text-red-200/80">{mutationError}</p> : null}
        <div className="grid gap-5">
          <div className="rounded-lg border border-blood/20 bg-black/20 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-red-200/55">Guild Identity</p>
            <div className="grid gap-4 lg:grid-cols-4">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild Name</span>
                <input className="input" value={draftSettings.guildName} onChange={(event) => updateSetting("guildName", event.target.value)} disabled={locked || saving} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild Display Name</span>
                <input className="input" value={draftSettings.guildDisplayName} onChange={(event) => updateSetting("guildDisplayName", event.target.value)} disabled={locked || saving} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild ID</span>
                <input className="input" value={draftSettings.guildId} onChange={(event) => updateSetting("guildId", event.target.value)} disabled={locked || saving} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild Timezone</span>
                <div className="input flex min-h-10 items-center text-bone">GMT+8</div>
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">Use GMT+8 screenshot times when importing snapshot history.</p>
          </div>

          {canEditTracking ? (
            <div className="rounded-lg border border-blood/20 bg-black/20 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-red-200/55">Tracking Match</p>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <label className="grid gap-1 self-start">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Tracked Guild Name</span>
                  <input className="input" value={draftSettings.trackedGuildName || ""} onChange={(event) => updateSetting("trackedGuildName", event.target.value)} disabled={locked || saving} />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Tracked Guild Aliases</span>
                  <textarea className="input min-h-28 resize-y" value={draftSettings.trackedGuildAliases || ""} onChange={(event) => updateSetting("trackedGuildAliases", event.target.value)} disabled={locked || saving} />
                  <span className="text-xs leading-relaxed text-zinc-500">One alias per line. These names are used only for snapshot matching.</span>
                </label>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-blood/20 bg-black/20 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-red-200/55">Guild Limits</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Member Cap</span>
                <input className="input" type="number" min="1" value={draftSettings.memberCap} onChange={(event) => updateSetting("memberCap", Number(event.target.value) || 1)} disabled={locked || saving} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Daily Requirement</span>
                <input className="input" type="number" min="0" value={draftSettings.dailyRequirement} onChange={(event) => updateSetting("dailyRequirement", Number(event.target.value) || 0)} disabled={locked || saving} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Active Members</span>
                <input className="input" type="number" min="0" value={draftSettings.activeMembers} onChange={(event) => updateSetting("activeMembers", Number(event.target.value) || 0)} disabled={locked || saving} />
              </label>
            </div>
          </div>
        </div>
        {readOnly && canWrite ? (
          <div className="mt-5 flex justify-end border-t border-blood/20 pt-4">
            <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Data Health" eyebrow={healthTone === "ok" ? "Stable" : healthTone === "error" ? "Needs Review" : "Warnings"}>
        <div className="grid gap-3 sm:grid-cols-4">
          <PreviewStat label="Errors" value={healthReport.summary.errors} />
          <PreviewStat label="Warnings" value={healthReport.summary.warnings} />
          <PreviewStat label="Info" value={healthReport.summary.info} />
          <PreviewStat label="Members" value={healthReport.summary.members} />
        </div>
        <div className="mt-4 rounded-lg border border-blood/20 bg-black/25 p-4">
          <p className="font-semibold text-bone">Health checks</p>
          {healthReport.warnings.length ? (
            <div className="mt-3 max-h-72 overflow-auto text-sm leading-6 text-zinc-300">
              {healthReport.warnings.slice(0, 40).map((warning, index) => (
                <div key={`${warning.area}-${warning.message}-${index}`} className="border-t border-blood/15 py-2 first:border-t-0">
                  <span className={`mr-2 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${getSeverityClass(warning.severity)}`}>{warning.severity}</span>
                  <span className="font-semibold text-bone">{warning.area}</span>
                  <span className="mx-2 text-zinc-500">—</span>
                  <span>{warning.message}</span>
                </div>
              ))}
              {healthReport.warnings.length > 40 ? <p className="mt-2 text-xs text-zinc-500">Showing first 40 issues. Export the debug report for the full list.</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">No obvious data issues detected.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Data Portability" eyebrow="Backup & Debug">
        <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm leading-6 text-zinc-300">
          <p className="font-semibold text-bone">Backup reminder</p>
          <p className="mt-1">Export JSON before clearing browser data, switching devices, importing local data, or testing patches.</p>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-red-200/60">Last exported: {formatExportedAt(lastExportedAt)}</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="btn btn-steel w-full sm:w-auto" onClick={makeExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Backup JSON
          </button>
          <button type="button" className="btn btn-steel w-full sm:w-auto" onClick={makeDebugExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Debug Report
          </button>
          <button type="button" className="btn w-full sm:w-auto" onClick={importJson} disabled={readOnly || !importText.trim()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import JSON
          </button>
          <button type="button" className="btn w-full sm:w-auto" onClick={() => setConfirmClear(true)} disabled={readOnly}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear All Local Data
          </button>
        </div>
        {confirmClear ? (
          <div className="mt-4 rounded-lg border border-blood/35 bg-black/30 p-4">
            <p className="text-sm font-semibold text-red-100">This will clear all guild data stored in this browser.</p>
            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
              <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={clearAll}>Confirm Clear</button>
              <button type="button" className="btn w-full sm:w-auto" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          </div>
        ) : null}
        <label className="mt-4 grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Backup / Activity Export Output</span>
          <textarea className="input min-h-40 resize-y font-mono" value={exportText} onChange={(event) => setExportText(event.target.value)} aria-label="Exported JSON" />
        </label>
        <label className="mt-4 grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Debug Report Output</span>
          <textarea className="input min-h-40 resize-y font-mono" value={debugText} onChange={(event) => setDebugText(event.target.value)} aria-label="Debug report JSON" />
        </label>
        <label className="mt-4 grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Import JSON</span>
          <textarea className="input min-h-40 resize-y font-mono" value={importText} onChange={(event) => setImportText(event.target.value)} aria-label="Import JSON" disabled={readOnly} />
        </label>
        {importError ? <p className="mt-2 text-sm text-zinc-300">{importError}</p> : null}
      </SectionCard>

      <SectionCard title="Admin Activity Log" eyebrow="Local Audit Trail">
        <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm leading-6 text-zinc-300">
          <p className="font-semibold text-bone">Local admin activity</p>
          <p className="mt-1">This records admin actions in this browser only. It does not require a Supabase schema migration.</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="btn btn-steel w-full sm:w-auto" onClick={exportActivity}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Activity Log
          </button>
          <button type="button" className="btn w-full sm:w-auto" onClick={clearActivities} disabled={!activityLog.length}>
            Clear Activity Log
          </button>
        </div>
        <div className="table-wrap mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {activityLog.length ? activityLog.slice(0, 30).map((entry) => (
                <tr key={entry.id}>
                  <td>{formatExportedAt(entry.timestamp)}</td>
                  <td className="font-semibold text-bone">{entry.action}</td>
                  <td className="font-mono text-xs text-zinc-400">{formatDetails(entry.details)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="text-center text-zinc-400">No activity recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {canMigrateBackup ? (
        <SectionCard title="Import Local Backup" eyebrow="Visionary Tool">
          <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm leading-6 text-zinc-300">
            <p className="font-semibold text-bone">Import an exported local backup into live data.</p>
            <p className="mt-1">This merges backup data into the live database. It does not delete existing rows.</p>
          </div>
          <textarea
            className="input min-h-44 resize-y font-mono"
            value={migrationText}
            onChange={(event) => {
              setMigrationText(event.target.value);
              setMigrationPreview(null);
              setMigrationConfirmed(false);
              setMigrationSuccess("");
            }}
            aria-label="Migration JSON backup"
            disabled={saving}
          />
          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button type="button" className="btn w-full sm:w-auto" onClick={previewMigration} disabled={saving || !migrationText.trim()}>
              Preview Migration
            </button>
            <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={migrateToSupabase} disabled={saving || !migrationPreview || !migrationConfirmed}>
              {saving ? "Migrating..." : "Migrate to Supabase"}
            </button>
          </div>

          {migrationError ? <p className="mt-3 text-sm text-red-200/80">{migrationError}</p> : null}
          {mutationError ? <p className="mt-3 text-sm text-red-200/80">{mutationError}</p> : null}
          {migrationSuccess ? <p className="mt-3 text-sm text-red-100">{migrationSuccess}</p> : null}

          {migrationPreview ? (
            <div className="mt-4 rounded-lg border border-blood/25 bg-black/25 p-4">
              <p className="font-semibold text-bone">Preview</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <PreviewStat label="Settings Present" value={migrationPreview.counts.settingsPresent ? "Yes" : "No"} />
                <PreviewStat label="Snapshot Slots" value={migrationPreview.counts.snapshotSlots} />
                <PreviewStat label="Snapshot History" value={migrationPreview.counts.snapshotHistory} />
                <PreviewStat label="Members" value={migrationPreview.counts.members} />
                <PreviewStat label="Member Checks" value={migrationPreview.counts.memberChecks} />
                <PreviewStat label="Upgrades" value={migrationPreview.counts.upgrades} />
              </div>
              <label className="mt-4 flex items-start gap-2 text-sm font-semibold text-slate-200">
                <input type="checkbox" checked={migrationConfirmed} onChange={(event) => setMigrationConfirmed(event.target.checked)} disabled={saving} />
                I understand this will merge/upsert the previewed backup into Supabase.
              </label>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {readOnly && canWrite ? (
        <SectionCard title="Member Links" eyebrow="Access Control">
          <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm leading-6 text-zinc-300">
            <p className="font-semibold text-bone">Manual Discord to Roblox links</p>
            <p className="mt-1">Use stable numeric Discord user IDs. These links only power Profile pages and never grant officer access.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Discord ID</span>
              <input className="input" value={profileLinkForm.discordId} onChange={(event) => setProfileLinkForm((current) => ({ ...current, discordId: event.target.value }))} disabled={saving} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Label / Note</span>
              <input className="input" value={profileLinkForm.label} onChange={(event) => setProfileLinkForm((current) => ({ ...current, label: event.target.value }))} disabled={saving} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Roblox Username</span>
              <input className="input" value={profileLinkForm.robloxUsername} onChange={(event) => setProfileLinkForm((current) => ({ ...current, robloxUsername: event.target.value }))} disabled={saving} />
            </label>
            <button type="button" className="btn btn-primary self-end md:w-auto" onClick={saveProfileLink} disabled={saving || !profileLinkForm.discordId.trim() || !profileLinkForm.robloxUsername.trim()}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? "Saving..." : "Save Link"}
            </button>
          </div>

          {profileLinksError ? <p className="mt-3 text-sm text-red-200/80">{profileLinksError}</p> : null}
          {profileLinkSuccess ? <p className="mt-3 text-sm text-red-100">{profileLinkSuccess}</p> : null}
          {mutationError ? <p className="mt-3 text-sm text-red-200/80">{mutationError}</p> : null}

          <div className="table-wrap mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Discord ID</th>
                  <th>Label</th>
                  <th>Roblox</th>
                  <th>Source</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {profileLinks.length ? profileLinks.map((link) => (
                  <tr key={link.discordId}>
                    <td className="font-mono text-xs">{link.discordId}</td>
                    <td>{link.label || "-"}</td>
                    <td className="font-semibold text-bone">{link.robloxUsername || "-"}</td>
                    <td>{link.source || "manual"}</td>
                    <td>{formatExportedAt(link.updatedAt)}</td>
                    <td>
                      <button type="button" className="btn min-h-8 px-2 py-1 text-xs" onClick={() => editProfileLink(link)} disabled={saving}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="text-center text-zinc-400">No profile links saved yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function formatExportedAt(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function getMigrationCounts(state) {
  return {
    settingsPresent: Boolean(state.settings),
    snapshotSlots: Number(state.snapshots && Object.prototype.hasOwnProperty.call(state.snapshots, "snapshot1")) + Number(state.snapshots && Object.prototype.hasOwnProperty.call(state.snapshots, "snapshot2")),
    snapshotHistory: Array.isArray(state.snapshotHistory) ? state.snapshotHistory.length : 0,
    members: Array.isArray(state.members) ? state.members.length : 0,
    memberChecks: Array.isArray(state.memberChecks) ? state.memberChecks.length : 0,
    upgrades: Array.isArray(state.upgrades) ? state.upgrades.length : 0
  };
}

function getStateCounts(state) {
  return {
    members: Array.isArray(state.members) ? state.members.length : 0,
    memberChecks: Array.isArray(state.memberChecks) ? state.memberChecks.length : 0,
    snapshotHistory: Array.isArray(state.snapshotHistory) ? state.snapshotHistory.length : 0,
    upgrades: Array.isArray(state.upgrades) ? state.upgrades.length : 0
  };
}

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-md border border-blood/20 bg-marrow/35 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-bone">{value}</p>
    </div>
  );
}

function getSeverityClass(severity) {
  if (severity === "error") return "border-red-200/30 bg-red-950/35 text-red-100";
  if (severity === "warning") return "border-blood/35 bg-wine/30 text-red-100";
  return "border-zinc-700/50 bg-black/35 text-zinc-300";
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

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Download still works if clipboard permission is blocked.
  }
}

function formatDetails(details) {
  if (!details || !Object.keys(details).length) return "-";
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${formatDetailValue(value)}`)
    .join(" | ");
}

function formatDetailValue(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
