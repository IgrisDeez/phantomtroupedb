import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRobloxLink(enabled = false) {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled || !supabase) {
      setLink(null);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("resolve-roblox-link", {
        body: {}
      });

      if (invokeError) throw invokeError;
      setLink(data || { linked: false, reason: "not_linked" });
    } catch (caughtError) {
      setLink({ linked: false, reason: "lookup_failed" });
      setError(caughtError?.message || "Roblox link lookup failed.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({
    link,
    loading,
    error,
    refresh
  }), [error, link, loading, refresh]);
}
