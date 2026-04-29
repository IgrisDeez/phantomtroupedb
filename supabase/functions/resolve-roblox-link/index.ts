import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const LINK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_CACHE_TTL_MS = 5 * 60 * 1000;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ linked: false, reason: "method_not_allowed" }, 405);
  }

  try {
    const supabaseUrl = readSecret("SUPABASE_URL");
    const anonKey = readSecret("SUPABASE_ANON_KEY");
    const serviceRoleKey = readSecret("SUPABASE_SERVICE_ROLE_KEY");
    const bloxlinkApiKey = readSecret("BLOXLINK_API_KEY");
    const discordGuildId = readSecret("DISCORD_GUILD_ID");
    const authorization = request.headers.get("Authorization") || "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ linked: false, reason: "server_not_configured" }, 200);
    }

    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return json({ linked: false, reason: "not_authenticated" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false }
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ linked: false, reason: "not_authenticated" }, 401);
    }

    const discordId = getDiscordId(userData.user);
    if (!discordId) {
      return json({ linked: false, reason: "discord_identity_missing" }, 200);
    }

    const cached = await getCachedLink(adminClient, discordId);
    if (cached) return json(cached, 200);

    if (!bloxlinkApiKey || !discordGuildId) {
      return json({ linked: false, reason: "bloxlink_not_configured" }, 200);
    }

    const bloxlinkResult = await lookupBloxlink({ bloxlinkApiKey, discordGuildId, discordId });
    if (!bloxlinkResult.linked) {
      await upsertLink(adminClient, {
        discordId,
        supabaseUserId: userData.user.id,
        linkStatus: "not_linked"
      });
      return json({ linked: false, reason: bloxlinkResult.reason || "not_linked" }, 200);
    }

    const robloxUserId = bloxlinkResult.robloxUserId;
    let robloxUsername = bloxlinkResult.robloxUsername;
    if (robloxUserId && !robloxUsername) {
      robloxUsername = await resolveRobloxUsername(robloxUserId);
    }

    if (!robloxUserId || !robloxUsername) {
      await upsertLink(adminClient, {
        discordId,
        supabaseUserId: userData.user.id,
        linkStatus: "error"
      });
      return json({ linked: false, reason: "roblox_username_unavailable" }, 200);
    }

    const saved = await upsertLink(adminClient, {
      discordId,
      supabaseUserId: userData.user.id,
      robloxUserId,
      robloxUsername,
      linkStatus: "linked"
    });

    return json({
      linked: true,
      robloxUserId: saved.roblox_user_id,
      robloxUsername: saved.roblox_username,
      normalizedRoblox: saved.normalized_roblox,
      fetchedAt: saved.fetched_at
    }, 200);
  } catch (error) {
    console.error("resolve-roblox-link failed", error);
    return json({ linked: false, reason: "lookup_failed" }, 200);
  }
});

function readSecret(name: string) {
  return (Deno.env.get(name) || "").trim();
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function getDiscordId(user: { identities?: Array<Record<string, unknown>>; user_metadata?: Record<string, unknown> }) {
  const identity = user.identities?.find((entry) => entry.provider === "discord");
  const data = (identity?.identity_data || {}) as Record<string, unknown>;
  return String(data.sub || data.provider_id || data.id || "").trim();
}

async function getCachedLink(adminClient: ReturnType<typeof createClient>, discordId: string) {
  const { data, error } = await adminClient
    .from("discord_roblox_links")
    .select("roblox_user_id,roblox_username,normalized_roblox,link_status,fetched_at")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error || !data?.fetched_at) return null;

  const fetchedAt = new Date(data.fetched_at).getTime();
  const cacheTtl = data.link_status === "linked" ? LINK_CACHE_TTL_MS : MISS_CACHE_TTL_MS;
  if (!Number.isFinite(fetchedAt) || Date.now() - fetchedAt > cacheTtl) return null;

  if (data.link_status !== "linked") {
    return { linked: false, reason: data.link_status === "not_linked" ? "not_linked" : "lookup_failed" };
  }

  return {
    linked: true,
    robloxUserId: data.roblox_user_id,
    robloxUsername: data.roblox_username,
    normalizedRoblox: data.normalized_roblox,
    fetchedAt: data.fetched_at
  };
}

async function lookupBloxlink({ bloxlinkApiKey, discordGuildId, discordId }: {
  bloxlinkApiKey: string;
  discordGuildId: string;
  discordId: string;
}) {
  const endpoint = `https://api.blox.link/v4/public/guilds/${encodeURIComponent(discordGuildId)}/discord-to-roblox/${encodeURIComponent(discordId)}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: bloxlinkApiKey }
  });

  if (response.status === 404) return { linked: false, reason: "not_linked" };

  let payload: Record<string, unknown> = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.error) {
    const reason = response.status === 429 ? "rate_limited" : "lookup_failed";
    return { linked: false, reason };
  }

  const robloxUserId = findFirstString(payload, [
    "robloxID",
    "robloxId",
    "roblox_id",
    "user_id",
    "userId",
    "id",
    "primaryAccount",
    "roblox.id",
    "roblox.user_id",
    "data.roblox_id",
    "data.id",
    "data.user_id",
    "data.roblox.id"
  ]);
  const robloxUsername = findFirstString(payload, [
    "roblox.name",
    "roblox.username",
    "username",
    "name",
    "data.name",
    "data.username",
    "data.roblox.name",
    "data.roblox.username"
  ]);

  return robloxUserId
    ? { linked: true, robloxUserId, robloxUsername }
    : { linked: false, reason: "not_linked" };
}

async function resolveRobloxUsername(robloxUserId: string) {
  const response = await fetch(`https://users.roblox.com/v1/users/${encodeURIComponent(robloxUserId)}`);
  if (!response.ok) return "";
  const payload = await response.json();
  return String(payload?.name || "").trim();
}

async function upsertLink(adminClient: ReturnType<typeof createClient>, link: {
  discordId: string;
  supabaseUserId: string;
  robloxUserId?: string;
  robloxUsername?: string;
  linkStatus: "linked" | "not_linked" | "error";
}) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from("discord_roblox_links")
    .upsert({
      discord_id: link.discordId,
      supabase_user_id: link.supabaseUserId,
      roblox_user_id: link.robloxUserId || "",
      roblox_username: link.robloxUsername || "",
      normalized_roblox: normalizeName(link.robloxUsername || ""),
      link_status: link.linkStatus,
      source: "bloxlink",
      fetched_at: now,
      updated_at: now
    }, { onConflict: "discord_id" })
    .select("roblox_user_id,roblox_username,normalized_roblox,fetched_at")
    .single();

  if (error) throw error;
  return data;
}

function findFirstString(payload: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = getPath(payload, path);
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function getPath(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, payload);
}

function normalizeName(value: string) {
  return String(value || "").trim().toLowerCase();
}
