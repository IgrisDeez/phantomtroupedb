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
      const { data, error: readError } = await supabase
        .from("discord_roblox_links")
        .select("discord_id,label,roblox_user_id,roblox_username,normalized_roblox,source,updated_at")
        .limit(1)
        .maybeSingle();

      if (readError) throw readError;
      setLink(data ? mapLink(data) : { linked: false, reason: "not_linked" });
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

function mapLink(row) {
  return {
    linked: true,
    discordId: row.discord_id || "",
    label: row.label || "",
    robloxUserId: row.roblox_user_id || "",
    robloxUsername: row.roblox_username || "",
    normalizedRoblox: row.normalized_roblox || "",
    source: row.source || "",
    updatedAt: row.updated_at || ""
  };
}
