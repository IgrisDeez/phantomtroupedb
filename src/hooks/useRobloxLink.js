import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRobloxLink(enabled = false, discordId = "") {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const normalizedDiscordId = String(discordId || "").trim();
    if (!enabled || !supabase || !normalizedDiscordId) {
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
        .eq("discord_id", normalizedDiscordId)
        .limit(1)
        .maybeSingle();

      if (readError) throw readError;
      setLink(data ? mapLink(data) : { linked: false, reason: "not_linked" });
    } catch (caughtError) {
      setLink({ linked: false, reason: "lookup_failed" });
      setError(caughtError?.message || "Profile link lookup failed.");
    } finally {
      setLoading(false);
    }
  }, [discordId, enabled]);

  const saveOwnLink = useCallback(async ({ userId, robloxUsername, label = "" }) => {
    const normalizedDiscordId = String(discordId || "").trim();
    const username = String(robloxUsername || "").trim();
    if (!enabled || !supabase || !normalizedDiscordId || !userId || !username) return false;

    setSaving(true);
    setError("");
    try {
      const now = new Date().toISOString();
      const { error: saveError } = await supabase
        .from("discord_roblox_links")
        .upsert({
          discord_id: normalizedDiscordId,
          supabase_user_id: userId,
          label: String(label || "").trim(),
          roblox_user_id: "",
          roblox_username: username,
          normalized_roblox: normalizeName(username),
          link_status: "linked",
          source: "self_reported",
          fetched_at: now,
          updated_at: now
        }, { onConflict: "discord_id" });

      if (saveError) throw saveError;
      await refresh();
      return true;
    } catch (caughtError) {
      setError(caughtError?.message || "Profile link save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [discordId, enabled, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({
    link,
    loading,
    saving,
    error,
    refresh,
    saveOwnLink
  }), [error, link, loading, refresh, saveOwnLink, saving]);
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

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}
