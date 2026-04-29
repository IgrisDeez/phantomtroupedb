import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGuildState } from "../lib/guildDataApi";
import { createEmptyState, loadState, saveState } from "../lib/storage";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const backend = (import.meta.env.VITE_DATA_BACKEND || "").trim().toLowerCase();

export function useGuildData() {
  const useSupabase = isSupabaseConfigured && backend === "supabase";
  const [state, setStateValue] = useState(() => (useSupabase ? createEmptyState() : loadState()));
  const [loading, setLoading] = useState(useSupabase);
  const [error, setError] = useState("");
  const dataSource = useSupabase ? "supabase" : "localStorage";

  const loadSupabaseState = useCallback(async () => {
    if (!useSupabase) return;
    setLoading(true);
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

  return useMemo(() => ({
    state,
    setState,
    loading,
    error,
    retry: loadSupabaseState,
    dataSource,
    readOnly: useSupabase
  }), [dataSource, error, loadSupabaseState, loading, setState, state, useSupabase]);
}
