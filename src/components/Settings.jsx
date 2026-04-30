import { Download, RotateCcw, Save, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { clearState, createEmptyState, exportState, importState, loadLastExportedAt, saveLastExportedAt } from "../lib/storage";
import { SectionCard } from "./Shared";

export function Settings({ state, setState, readOnly = false, canWrite = false, canMigrateBackup = false, canEditTracking = false, actions = null, saving = false, mutationError = "" }) {
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
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
  const locked = readOnly && !canWrite;

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
    await actions?.updateGuildSettings(draftSettings);
  }

  async function makeExport() {
    const json = exportState(state);
    setExportText(json);
    await navigator.clipboard.writeText(json);
    const timestamp = new Date().toISOString();
    saveLastExportedAt(timestamp);
    setLastExportedAt(timestamp);
  }

  function importJson() {
    if (readOnly) return;
    try {
      setState(importState(importText));
      setImportError("");
      setImportText("");
    } catch (error) {
      setImportError("Import failed. Paste a valid exported JSON file.");
    }
  }

  function clearAll() {
    if (readOnly) return;
    clearState();
    setState(createEmptyState());
    setConfirmClear(false);
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
    }
  }

  async function saveProfileLink() {
    if (!canWrite || !profileLinkForm.discordId.trim() || !profileLinkForm.robloxUsername.trim()) return;
    const saved = await actions?.saveProfileLink(profileLinkForm);
    if (saved) {
      setProfileLinkSuccess("Profile link saved.");
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
        {locked ? <p className="mb-4 text-sm text-zinc-400">Only officers can edit live data.</p> : null}
        {readOnly && canWrite ? <p className="mb-4 text-sm text-zinc-400">Edit settings, then use Save Settings to update live data.</p> : null}
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
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">Staff should convert screenshot times to GMT+8 before importing.</p>
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

      <SectionCard title="Data Portability" eyebrow="Local Storage">
        <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm text-zinc-300">
          <p className="font-semibold text-bone">Backup reminder</p>
            <p className="mt-1">Export JSON before clearing browser data, switching devices, or importing local test data into live data.</p>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-red-200/60">Last exported: {formatExportedAt(lastExportedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-steel" onClick={makeExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </button>
          <button type="button" className="btn" onClick={importJson} disabled={readOnly || !importText.trim()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import JSON
          </button>
          <button type="button" className="btn" onClick={() => setConfirmClear(true)} disabled={readOnly}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear All Local Data
          </button>
        </div>
        {confirmClear ? (
          <div className="mt-4 rounded-lg border border-blood/35 bg-black/30 p-4">
            <p className="text-sm font-semibold text-red-100">This will clear all guild data stored in this browser.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={clearAll}>Confirm Clear</button>
              <button type="button" className="btn" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          </div>
        ) : null}
        <textarea
          className="input mt-4 min-h-44 resize-y font-mono"
          value={exportText}
          onChange={(event) => setExportText(event.target.value)}
          aria-label="Exported JSON"
        />
        <textarea
          className="input mt-4 min-h-44 resize-y font-mono"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          aria-label="Import JSON"
          disabled={readOnly}
        />
        {importError ? <p className="mt-2 text-sm text-zinc-300">{importError}</p> : null}
      </SectionCard>

      {canMigrateBackup ? (
        <SectionCard title="Import Local Backup" eyebrow="Visionary Tool">
          <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm text-zinc-300">
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
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={previewMigration} disabled={saving || !migrationText.trim()}>
              Preview Migration
            </button>
            <button type="button" className="btn btn-primary" onClick={migrateToSupabase} disabled={saving || !migrationPreview || !migrationConfirmed}>
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
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <input type="checkbox" checked={migrationConfirmed} onChange={(event) => setMigrationConfirmed(event.target.checked)} disabled={saving} />
                I understand this will merge/upsert the previewed backup into Supabase.
              </label>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {readOnly && canWrite ? (
        <SectionCard title="Member Links" eyebrow="Access Control">
          <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm text-zinc-300">
            <p className="font-semibold text-bone">Manual Discord to Roblox links</p>
            <p className="mt-1">Use stable numeric Discord user IDs. These links only power Profile pages and never grant officer access.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Discord ID</span>
              <input
                className="input"
                value={profileLinkForm.discordId}
                onChange={(event) => setProfileLinkForm((current) => ({ ...current, discordId: event.target.value }))}
                disabled={saving}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Label / Note</span>
              <input
                className="input"
                value={profileLinkForm.label}
                onChange={(event) => setProfileLinkForm((current) => ({ ...current, label: event.target.value }))}
                disabled={saving}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Roblox Username</span>
              <input
                className="input"
                value={profileLinkForm.robloxUsername}
                onChange={(event) => setProfileLinkForm((current) => ({ ...current, robloxUsername: event.target.value }))}
                disabled={saving}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary self-end"
              onClick={saveProfileLink}
              disabled={saving || !profileLinkForm.discordId.trim() || !profileLinkForm.robloxUsername.trim()}
            >
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

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-md border border-blood/20 bg-marrow/35 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-bone">{value}</p>
    </div>
  );
}
