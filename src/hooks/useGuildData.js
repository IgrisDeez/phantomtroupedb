import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchGuildState,
  importMemberChecks,
  migrateBackupToSupabase,
  saveManualMemberCheck,
  saveSnapshots,
  updateGuildSettings,
  updateUpgrade,
  upsertMembersFromNames
} from "../lib/guildDataApi";
import { createEmptyState, loadState, saveState } from "../lib/storage";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const backend = (import.meta.env.VITE_DATA_BACKEND || "").trim().toLowerCase();

export function useGuildData() {
  const useSupabase = isSupabaseConfigured && backend === "supabase";
  const [state, setStateValue] = useState(() => (useSupabase ? createEmptyState() : loadState()));
  const [loading, setLoading] = useState(useSupabase);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const dataSource = useSupabase ? "supabase" : "localStorage";

  const loadSupabaseState = useCallback(async (options = {}) => {
    if (!useSupabase) return;
    if (options.showLoading !== false) setLoading(true);
    setError("");
    try {
      setStateValue(await fetchGuildState());
    } catch (err) {
      setError(err?.message || "Failed to load Supabase data.");
    } finally {
      setLoading(false);
    }
  }, [useSupabase]);

  useEffect(() => {
    loadSupabaseState();
  }, [loadSupabaseState]);

  useEffect(() => {
    if (!useSupabase) saveState(state);
  }, [state, useSupabase]);

  const setState = useCallback((nextState) => {
    if (useSupabase) return;
    setStateValue(nextState);
  }, [useSupabase]);

  const runMutation = useCallback(async (mutation) => {
    if (!useSupabase) return false;
    setSaving(true);
    setMutationError("");
    try {
      await mutation();
      await loadSupabaseState({ showLoading: false });
      return true;
    } catch (err) {
      const message = err?.message || "Supabase write failed.";
      setMutationError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadSupabaseState, useSupabase]);

  const actions = useMemo(() => ({
    updateGuildSettings: (patch) => runMutation(() => updateGuildSettings(patch)),
    updateUpgrade: (id, patch) => runMutation(() => updateUpgrade(id, patch)),
    saveSnapshots: (snapshot1, snapshot2) => runMutation(() => saveSnapshots(snapshot1, snapshot2)),
    importMemberChecks: (rows) => runMutation(() => importMemberChecks(rows)),
    saveManualMemberCheck: (row) => runMutation(() => saveManualMemberCheck(row)),
    upsertMembersFromNames: (names) => runMutation(() => upsertMembersFromNames(names)),
    migrateBackupToSupabase: (backupState) => runMutation(() => migrateBackupToSupabase(backupState))
  }), [runMutation]);

  return useMemo(() => ({
    state,
    setState,
    loading,
    error,
    retry: loadSupabaseState,
    dataSource,
    readOnly: useSupabase,
    saving,
    mutationError,
    clearMutationError: () => setMutationError(""),
    actions
  }), [actions, dataSource, error, loadSupabaseState, loading, mutationError, saving, setState, state, useSupabase]);
}
