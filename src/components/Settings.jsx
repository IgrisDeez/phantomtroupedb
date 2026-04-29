import { Download, RotateCcw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { clearState, createEmptyState, exportState, importState, loadLastExportedAt, saveLastExportedAt } from "../lib/storage";
import { SectionCard } from "./Shared";

export function Settings({ state, setState, readOnly = false, canWrite = false, actions = null, saving = false, mutationError = "" }) {
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
  const locked = readOnly && !canWrite;

  useEffect(() => {
    setDraftSettings(state.settings);
  }, [state.settings]);

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

  return (
    <div className="grid gap-5">
      <SectionCard title="Guild Settings" eyebrow="Local Preferences">
        {locked ? <p className="mb-4 text-sm text-zinc-400">Supabase live data can only be edited by allowlisted officers.</p> : null}
        {readOnly && canWrite ? <p className="mb-4 text-sm text-zinc-400">Edit settings, then use Save Settings to update Supabase.</p> : null}
        {mutationError ? <p className="mb-4 text-sm text-red-200/80">{mutationError}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
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
        {readOnly && canWrite ? (
          <button type="button" className="btn btn-primary mt-4" onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        ) : null}
      </SectionCard>

      <SectionCard title="Data Portability" eyebrow="Local Storage">
        <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm text-zinc-300">
          <p className="font-semibold text-bone">Backup reminder</p>
          <p className="mt-1">Data is stored only on this browser until the live database migration. Export JSON before clearing browser data or switching devices.</p>
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

      {readOnly && canWrite ? (
        <SectionCard title="Local Backup Migration" eyebrow="Officer Tool">
          <div className="mb-4 rounded-lg border border-blood/25 bg-marrow/35 p-4 text-sm text-zinc-300">
            <p className="font-semibold text-bone">Merge a local backup into Supabase</p>
            <p className="mt-1">This upserts backup data into the live database. It does not delete existing Supabase rows.</p>
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
