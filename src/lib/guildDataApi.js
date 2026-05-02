import { createEmptyState, defaultSettings, defaultUpgrades } from "./storage";
import { supabase } from "./supabaseClient";

const GUILD_ID = "phantom-troupe";

export async function fetchGuildState() {
  if (!supabase) throw new Error("Supabase is not configured.");

  const [settingsResult, snapshotsResult, historyResult, membersResult, checksResult, upgradesResult] = await Promise.all([
    supabase.from("guild_settings").select("*").eq("id", GUILD_ID).maybeSingle(),
    supabase.from("snapshots").select("*").eq("guild_id", GUILD_ID).order("slot", { ascending: true }),
    supabase.from("snapshot_history").select("*").eq("guild_id", GUILD_ID).order("snapshot_number", { ascending: true }).then((result) => {
      if (result.error?.code === "42P01") return { data: [], error: null };
      return result;
    }),
    supabase.from("members").select("*").eq("guild_id", GUILD_ID).order("normalized_roblox", { ascending: true }),
    supabase.from("member_checks").select("*").eq("guild_id", GUILD_ID).order("checked_at", { ascending: true }),
    supabase.from("upgrades").select("*").eq("guild_id", GUILD_ID)
  ]);

  const error = [settingsResult, snapshotsResult, membersResult, checksResult, upgradesResult].find((result) => result.error)?.error;
  if (error) throw error;

  return mapSupabaseState({
    settings: settingsResult.data,
    snapshots: snapshotsResult.data || [],
    snapshotHistory: historyResult.data || [],
    members: membersResult.data || [],
    memberChecks: checksResult.data || [],
    upgrades: upgradesResult.data || []
  });
}

function mapSupabaseState({ settings, snapshots, snapshotHistory, members, memberChecks, upgrades }) {
  const empty = createEmptyState();
  const snapshotOne = snapshots.find((snapshot) => Number(snapshot.slot) === 1);
  const snapshotTwo = snapshots.find((snapshot) => Number(snapshot.slot) === 2);

  return {
    ...empty,
    settings: {
      ...defaultSettings,
      guildName: settings?.guild_name || defaultSettings.guildName,
      guildDisplayName: settings?.guild_display_name || defaultSettings.guildDisplayName,
      trackedGuildName: settings?.tracked_guild_name || settings?.guild_name || defaultSettings.trackedGuildName,
      trackedGuildAliases: settings?.tracked_guild_aliases || defaultSettings.trackedGuildAliases,
      guildTimezone: settings?.guild_timezone || defaultSettings.guildTimezone,
      guildId: settings?.guild_id || "",
      memberCap: Number(settings?.member_cap) || defaultSettings.memberCap,
      dailyRequirement: Number(settings?.daily_requirement) || defaultSettings.dailyRequirement,
      activeMembers: Number(settings?.active_members) || 0
    },
    snapshots: {
      snapshot1: snapshotOne?.raw_text || "",
      snapshot2: snapshotTwo?.raw_text || ""
    },
    snapshotHistory: (snapshotHistory || []).map((row) => ({
      snapshot: Number(row.snapshot_number),
      timestamp: row.timestamp_text || "",
      capturedAt: row.captured_at || "",
      rank: row.rank === null || row.rank === undefined ? null : Number(row.rank),
      guild: row.guild || "",
      points: Number(row.points) || 0,
      rawLine: row.raw_line || ""
    })),
    snapshotRawImports: [],
    members: members.map((member) => ({
      discord: member.discord || "",
      roblox: member.roblox || "",
      contribution: Number(member.contribution) || 0,
      previousContribution: Number(member.previous_contribution) || 0,
      playtime: member.playtime || "",
      notes: member.notes || "",
      lastChecked: member.last_checked || ""
    })),
    memberChecks: memberChecks.map((check) => ({
      timestamp: check.checked_at || "",
      roblox: check.roblox || "",
      contribution: Number(check.contribution) || 0,
      discord: check.discord || "",
      playtime: check.playtime || "",
      notes: check.notes || "",
      batchId: check.batch_id || ""
    })),
    memberQueue: [],
    queueIndex: 0,
    upgrades: mapUpgrades(upgrades)
  };
}

function mapUpgrades(rows) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const knownIds = new Set(defaultUpgrades.map((upgrade) => upgrade.id));
  const mappedDefaults = defaultUpgrades.map((upgrade) => {
    const row = byId.get(upgrade.id);
    if (!row) return upgrade;
    return {
      id: row.id,
      name: row.name || upgrade.name,
      level: Number(row.level) || 0,
      value: row.value || "",
      maxLevel: Number(row.max_level) || upgrade.maxLevel,
      maxed: Boolean(row.maxed)
    };
  });
  const extraRows = rows
    .filter((row) => !knownIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name || row.id,
      level: Number(row.level) || 0,
      value: row.value || "",
      maxLevel: Number(row.max_level) || 10,
      maxed: Boolean(row.maxed)
    }));

  return [...mappedDefaults, ...extraRows];
}

export async function updateGuildSettings(patch) {
  ensureSupabase();
  const payload = settingsToRow(patch);
  if (!Object.keys(payload).length) return;

  const { error } = await supabase
    .from("guild_settings")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", GUILD_ID);

  if (error) throw error;
}

export async function updateUpgrade(id, patch) {
  ensureSupabase();
  const payload = upgradeToRow(patch);
  if (!id || !Object.keys(payload).length) return;

  const { error } = await supabase
    .from("upgrades")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("guild_id", GUILD_ID);

  if (error) throw error;
}

export async function saveSnapshots(snapshot1, snapshot2) {
  ensureSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("snapshots")
    .upsert([
      { guild_id: GUILD_ID, slot: 1, raw_text: snapshot1 || "", updated_at: now },
      { guild_id: GUILD_ID, slot: 2, raw_text: snapshot2 || "", updated_at: now }
    ], { onConflict: "guild_id,slot" });

  if (error) throw error;
}

export async function saveSnapshotHistory(rows = [], rawText = "") {
  ensureSupabase();
  const now = new Date().toISOString();
  const validRows = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      guild_id: GUILD_ID,
      snapshot_number: Number(row.snapshot),
      timestamp_text: String(row.timestamp || "").trim(),
      captured_at: row.capturedAt || null,
      rank: row.rank === null || row.rank === undefined ? null : Number(row.rank),
      guild: String(row.guild || "").trim(),
      normalized_guild: normalizeName(row.guild),
      points: Number(row.points) || 0,
      raw_line: row.rawLine || "",
      raw_import_text: rawText || "",
      updated_at: now
    }))
    .filter((row) => Number.isFinite(row.snapshot_number) && row.timestamp_text && row.normalized_guild);

  if (!validRows.length) return;

  const { error } = await supabase
    .from("snapshot_history")
    .upsert(validRows, { onConflict: "guild_id,snapshot_number,normalized_guild" });

  if (error) throw error;
}

export async function upsertMembersFromNames(names = []) {
  ensureSupabase();
  const now = new Date().toISOString();
  const rows = uniqueMembers(names)
    .map((roblox) => ({
      guild_id: GUILD_ID,
      roblox,
      normalized_roblox: normalizeName(roblox),
      updated_at: now
    }))
    .filter((row) => row.normalized_roblox);

  if (!rows.length) return;

  const { error } = await supabase
    .from("members")
    .upsert(rows, { onConflict: "guild_id,normalized_roblox" });

  if (error) throw error;
}

export async function importMemberChecks(rows = []) {
  ensureSupabase();
  const batchId = `import-${Date.now()}`;
  await saveMemberChecks(rows.map((row) => ({ ...row, batchId })));
}

export async function saveManualMemberCheck(row) {
  ensureSupabase();
  await saveMemberChecks([{ ...row, batchId: row.batchId || `manual-${Date.now()}` }]);
}

export async function deleteMember(roblox) {
  ensureSupabase();
  const normalizedRoblox = normalizeName(roblox);
  if (!normalizedRoblox) return;

  const { error: checksError } = await supabase
    .from("member_checks")
    .delete()
    .eq("guild_id", GUILD_ID)
    .eq("normalized_roblox", normalizedRoblox);

  if (checksError) throw checksError;

  const { error: memberError } = await supabase
    .from("members")
    .delete()
    .eq("guild_id", GUILD_ID)
    .eq("normalized_roblox", normalizedRoblox);

  if (memberError) throw memberError;
}

export async function migrateBackupToSupabase(state) {
  ensureSupabase();
  const now = new Date().toISOString();

  await updateGuildSettings(state.settings || {});
  await saveSnapshots(state.snapshots?.snapshot1 || "", state.snapshots?.snapshot2 || "");
  await saveSnapshotHistory(state.snapshotHistory || [], "");
  await migrateUpgrades(state.upgrades || [], now);
  await migrateMembers(state.members || [], now);
  await migrateMemberChecks(state.memberChecks || []);
}

export async function fetchProfileLinks() {
  ensureSupabase();
  const { data, error } = await supabase
    .from("discord_roblox_links")
    .select("discord_id,label,roblox_user_id,roblox_username,normalized_roblox,source,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapProfileLink);
}

export async function saveProfileLink(link) {
  ensureSupabase();
  const discordId = String(link.discordId || "").replace(/\s+/g, "");
  const robloxUsername = String(link.robloxUsername || "").trim();
  if (!discordId || !robloxUsername) {
    throw new Error("Discord ID and Roblox username are required.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("discord_roblox_links")
    .upsert({
      discord_id: discordId,
      label: String(link.label || "").trim(),
      roblox_user_id: String(link.robloxUserId || "").trim(),
      roblox_username: robloxUsername,
      normalized_roblox: normalizeName(robloxUsername),
      link_status: "linked",
      source: "manual",
      fetched_at: now,
      updated_at: now
    }, { onConflict: "discord_id" });

  if (error) throw error;
}

export async function recordAdminActivity(action, details = {}, actorRole = "") {
  ensureSupabase();
  if (!action) return { saved: false, unavailable: false };

  const { error } = await supabase
    .from("admin_activity_log")
    .insert({
      guild_id: GUILD_ID,
      actor_role: String(actorRole || ""),
      action: String(action).trim(),
      details: sanitizeJsonObject(details)
    });

  if (isMissingTableError(error)) return { saved: false, unavailable: true };
  if (error) return { saved: false, unavailable: false, error: error.message || "Failed to record activity." };
  return { saved: true, unavailable: false };
}

export async function fetchAdminActivityLog(limit = 100) {
  ensureSupabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select("id,actor_user_id,actor_discord_id,actor_role,action,details,created_at")
    .eq("guild_id", GUILD_ID)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (isMissingTableError(error)) return { rows: [], unavailable: true };
  if (error) throw error;
  return {
    rows: (data || []).map(mapAdminActivity),
    unavailable: false
  };
}

async function saveMemberChecks(rows) {
  const validRows = rows
    .map((row) => memberCheckToRow(row))
    .filter((row) => row.normalized_roblox && row.checked_at);

  if (!validRows.length) return;

  const names = [...new Set(validRows.map((row) => row.normalized_roblox))];
  const existingMembers = await fetchMembersByNormalizedNames(names);
  const latestMembers = buildLatestMemberRows(validRows, existingMembers);

  const { error: checksError } = await supabase
    .from("member_checks")
    .upsert(validRows, { onConflict: "guild_id,normalized_roblox,checked_at" });

  if (checksError) throw checksError;

  if (latestMembers.length) {
    const { error: membersError } = await supabase
      .from("members")
      .upsert(latestMembers, { onConflict: "guild_id,normalized_roblox" });

    if (membersError) throw membersError;
  }
}

async function migrateUpgrades(upgrades, timestamp) {
  const rows = upgrades
    .map((upgrade) => ({
      id: upgrade.id,
      guild_id: GUILD_ID,
      name: upgrade.name || upgrade.id,
      ...upgradeToRow(upgrade),
      updated_at: timestamp
    }))
    .filter((row) => row.id);

  if (!rows.length) return;

  const { error } = await supabase
    .from("upgrades")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
}

async function migrateMembers(members, timestamp) {
  const rows = members
    .map((member) => memberToRow(member, timestamp))
    .filter((row) => row.normalized_roblox);

  if (!rows.length) return;

  const { error } = await supabase
    .from("members")
    .upsert(rows, { onConflict: "guild_id,normalized_roblox" });

  if (error) throw error;
}

async function migrateMemberChecks(memberChecks) {
  const batchId = `migration-${Date.now()}`;
  await saveMemberChecks(memberChecks.map((check) => ({ ...check, batchId: check.batchId || batchId })));
}

async function fetchMembersByNormalizedNames(names) {
  if (!names.length) return new Map();
  const { data, error } = await supabase
    .from("members")
    .select("normalized_roblox,contribution,previous_contribution,last_checked")
    .eq("guild_id", GUILD_ID)
    .in("normalized_roblox", names);

  if (error) throw error;
  return new Map((data || []).map((member) => [member.normalized_roblox, member]));
}

function buildLatestMemberRows(checkRows, existingMembers) {
  const grouped = new Map();
  checkRows.forEach((row) => {
    if (!grouped.has(row.normalized_roblox)) grouped.set(row.normalized_roblox, []);
    grouped.get(row.normalized_roblox).push(row);
  });

  return [...grouped.entries()].flatMap(([normalized, rows]) => {
    const sorted = [...rows].sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));
    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const existing = existingMembers.get(normalized);
    const existingLast = existing?.last_checked ? new Date(existing.last_checked).getTime() : null;
    const latestTime = new Date(latest.checked_at).getTime();

    if (existingLast && latestTime < existingLast) return [];

    const previousContribution = previous
      ? Number(previous.contribution) || 0
      : existingLast && latestTime > existingLast
        ? Number(existing.contribution) || 0
        : Number(existing?.previous_contribution) || 0;

    return [{
      guild_id: GUILD_ID,
      roblox: latest.roblox,
      normalized_roblox: latest.normalized_roblox,
      discord: latest.discord || "",
      playtime: latest.playtime || "",
      notes: latest.notes || "",
      contribution: Number(latest.contribution) || 0,
      previous_contribution: previousContribution,
      last_checked: latest.checked_at,
      updated_at: new Date().toISOString()
    }];
  });
}

function settingsToRow(patch) {
  const row = {};
  if (patch.guildName !== undefined) row.guild_name = patch.guildName;
  if (patch.guildDisplayName !== undefined) row.guild_display_name = patch.guildDisplayName;
  if (patch.trackedGuildName !== undefined) row.tracked_guild_name = patch.trackedGuildName;
  if (patch.trackedGuildAliases !== undefined) row.tracked_guild_aliases = patch.trackedGuildAliases;
  if (patch.guildTimezone !== undefined) row.guild_timezone = patch.guildTimezone;
  if (patch.guildId !== undefined) row.guild_id = patch.guildId;
  if (patch.memberCap !== undefined) row.member_cap = Number(patch.memberCap) || defaultSettings.memberCap;
  if (patch.dailyRequirement !== undefined) row.daily_requirement = Number(patch.dailyRequirement) || 0;
  if (patch.activeMembers !== undefined) row.active_members = Number(patch.activeMembers) || 0;
  return row;
}

function upgradeToRow(patch) {
  const row = {};
  if (patch.level !== undefined) row.level = Number(patch.level) || 0;
  if (patch.value !== undefined) row.value = patch.value;
  if (patch.maxLevel !== undefined) row.max_level = Number(patch.maxLevel) || 1;
  if (patch.maxed !== undefined) row.maxed = Boolean(patch.maxed);
  return row;
}

function memberCheckToRow(row) {
  const roblox = String(row.roblox || "").trim();
  return {
    guild_id: GUILD_ID,
    roblox,
    normalized_roblox: normalizeName(roblox),
    discord: String(row.discord || "").trim(),
    playtime: String(row.playtime || "").trim(),
    notes: String(row.notes || "").trim(),
    contribution: Number(row.contribution) || 0,
    checked_at: row.timestamp,
    batch_id: row.batchId || `manual-${Date.now()}`
  };
}

function memberToRow(member, timestamp) {
  const roblox = String(member.roblox || "").trim();
  return {
    guild_id: GUILD_ID,
    roblox,
    normalized_roblox: normalizeName(roblox),
    discord: String(member.discord || "").trim(),
    playtime: String(member.playtime || "").trim(),
    notes: String(member.notes || "").trim(),
    contribution: Number(member.contribution) || 0,
    previous_contribution: Number(member.previousContribution) || 0,
    last_checked: member.lastChecked || null,
    updated_at: timestamp
  };
}

function uniqueMembers(names) {
  const seen = new Set();
  return names
    .map((name) => String(name || "").trim())
    .filter((name) => {
      const normalized = normalizeName(name);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function mapProfileLink(row) {
  return {
    discordId: row.discord_id || "",
    label: row.label || "",
    robloxUserId: row.roblox_user_id || "",
    robloxUsername: row.roblox_username || "",
    normalizedRoblox: row.normalized_roblox || "",
    source: row.source || "",
    updatedAt: row.updated_at || ""
  };
}

function mapAdminActivity(row) {
  return {
    id: row.id || "",
    timestamp: row.created_at || "",
    action: row.action || "",
    actorUserId: row.actor_user_id || "",
    actorDiscordId: row.actor_discord_id || "",
    actorRole: row.actor_role || "",
    details: row.details && typeof row.details === "object" ? row.details : {}
  };
}

function sanitizeJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function isMissingTableError(error) {
  return error?.code === "42P01" || /admin_activity_log/i.test(error?.message || "") && /does not exist|schema cache/i.test(error?.message || "");
}

function ensureSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.");
}
