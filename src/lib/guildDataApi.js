import { createEmptyState, defaultSettings, defaultUpgrades } from "./storage";
import { supabase } from "./supabaseClient";

const GUILD_ID = "phantom-troupe";

export async function fetchGuildState() {
  if (!supabase) throw new Error("Supabase is not configured.");

  const [settingsResult, snapshotsResult, membersResult, checksResult, upgradesResult] = await Promise.all([
    supabase.from("guild_settings").select("*").eq("id", GUILD_ID).maybeSingle(),
    supabase.from("snapshots").select("*").eq("guild_id", GUILD_ID).order("slot", { ascending: true }),
    supabase.from("members").select("*").eq("guild_id", GUILD_ID).order("normalized_roblox", { ascending: true }),
    supabase.from("member_checks").select("*").eq("guild_id", GUILD_ID).order("checked_at", { ascending: true }),
    supabase.from("upgrades").select("*").eq("guild_id", GUILD_ID)
  ]);

  const error = [settingsResult, snapshotsResult, membersResult, checksResult, upgradesResult].find((result) => result.error)?.error;
  if (error) throw error;

  return mapSupabaseState({
    settings: settingsResult.data,
    snapshots: snapshotsResult.data || [],
    members: membersResult.data || [],
    memberChecks: checksResult.data || [],
    upgrades: upgradesResult.data || []
  });
}

function mapSupabaseState({ settings, snapshots, members, memberChecks, upgrades }) {
  const empty = createEmptyState();
  const snapshotOne = snapshots.find((snapshot) => Number(snapshot.slot) === 1);
  const snapshotTwo = snapshots.find((snapshot) => Number(snapshot.slot) === 2);

  return {
    ...empty,
    settings: {
      ...defaultSettings,
      guildName: settings?.guild_name || defaultSettings.guildName,
      guildDisplayName: settings?.guild_display_name || defaultSettings.guildDisplayName,
      guildId: settings?.guild_id || "",
      memberCap: Number(settings?.member_cap) || defaultSettings.memberCap,
      dailyRequirement: Number(settings?.daily_requirement) || defaultSettings.dailyRequirement,
      activeMembers: Number(settings?.active_members) || 0
    },
    snapshots: {
      snapshot1: snapshotOne?.raw_text || "",
      snapshot2: snapshotTwo?.raw_text || ""
    },
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
