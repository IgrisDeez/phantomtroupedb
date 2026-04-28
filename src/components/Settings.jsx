import { Download, RotateCcw, Upload } from "lucide-react";
import { useState } from "react";
import { clearState, createEmptyState, exportState, importState } from "../lib/storage";
import { SectionCard } from "./Shared";

export function Settings({ state, setState }) {
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [importError, setImportError] = useState("");

  function updateSetting(key, value) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
  }

  async function makeExport() {
    const json = exportState(state);
    setExportText(json);
    await navigator.clipboard.writeText(json);
  }

  function importJson() {
    try {
      setState(importState(importText));
      setImportError("");
      setImportText("");
    } catch (error) {
      setImportError("Import failed. Paste a valid exported JSON file.");
    }
  }

  function clearAll() {
    clearState();
    setState(createEmptyState());
  }

  return (
    <div className="grid gap-5">
      <SectionCard title="Guild Settings" eyebrow="Local Preferences">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild Name</span>
            <input className="input" value={state.settings.guildName} onChange={(event) => updateSetting("guildName", event.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild Display Name</span>
            <input className="input" value={state.settings.guildDisplayName} onChange={(event) => updateSetting("guildDisplayName", event.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Guild ID</span>
            <input className="input" value={state.settings.guildId} onChange={(event) => updateSetting("guildId", event.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Member Cap</span>
            <input className="input" type="number" min="1" value={state.settings.memberCap} onChange={(event) => updateSetting("memberCap", Number(event.target.value) || 1)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Daily Requirement</span>
            <input className="input" type="number" min="0" value={state.settings.dailyRequirement} onChange={(event) => updateSetting("dailyRequirement", Number(event.target.value) || 0)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Active Members</span>
            <input className="input" type="number" min="0" value={state.settings.activeMembers} onChange={(event) => updateSetting("activeMembers", Number(event.target.value) || 0)} />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Data Portability" eyebrow="Local Storage">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-steel" onClick={makeExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </button>
          <button type="button" className="btn" onClick={importJson} disabled={!importText.trim()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import JSON
          </button>
          <button type="button" className="btn" onClick={clearAll}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear All Local Data
          </button>
        </div>
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
        />
        {importError ? <p className="mt-2 text-sm text-zinc-300">{importError}</p> : null}
      </SectionCard>
    </div>
  );
}
