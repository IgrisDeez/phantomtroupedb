export const STORAGE_KEY = "phantom-troupe-guild-tracker:v2";
export const LAST_EXPORTED_KEY = "phantom-troupe-guild-tracker:last-exported-at";
export const TEAM_CAP = 7;
export const TEAM_STORAGE_PREFIX = "phantom-troupe-guild-tracker:teams:";

export const defaultSettings = {
  guildName: "Phantom Troupe",
  guildDisplayName: "Phantom Troupe",
  trackedGuildName: "Phantom Troupe",
  trackedGuildAliases: "PhantomTroupe\nPhantom troupe\nPHANTOM TROUPE",
  guildTimezone: "Asia/Taipei",
  guildId: "",
  memberCap: 150,
  dailyRequirement: 400,
  activeMembers: 0
};

export const defaultUpgrades = [
  { id: "capacity", name: "Member Capacity", level: 0, value: "", maxLevel: 10, maxed: false },
  { id: "damage", name: "Damage %", level: 0, value: "", maxLevel: 10, maxed: false },
  { id: "critDamage", name: "Crit Damage", level: 0, value: "", maxLevel: 10, maxed: false },
  { id: "critChance", name: "Crit Chance", level: 0, value: "", maxLevel: 10, maxed: false },
  { id: "hp", name: "HP %", level: 0, value: "", maxLevel: 10, maxed: false },
  { id: "luck", name: "Luck", level: 0, value: "", maxLevel: 10, maxed: false }
];

export function createEmptyState() {
  return {
    settings: defaultSettings,
    snapshots: {
      snapshot1: "",
      snapshot2: ""
    },
    snapshotHistory: [],
    snapshotRawImports: [],
    members: [],
    memberChecks: [],
    memberQueue: [],
    queueIndex: 0,
    upgrades: defaultUpgrades
  };
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return createEmptyState();
    }

    const parsed = JSON.parse(saved);
    return {
      ...createEmptyState(),
      ...parsed,
      settings: {
        ...defaultSettings,
        ...(parsed.settings || {})
      },
      snapshots: {
        snapshot1: parsed.snapshots?.snapshot1 || "",
        snapshot2: parsed.snapshots?.snapshot2 || ""
      },
      snapshotHistory: Array.isArray(parsed.snapshotHistory) ? parsed.snapshotHistory : [],
      snapshotRawImports: Array.isArray(parsed.snapshotRawImports) ? parsed.snapshotRawImports : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      memberChecks: Array.isArray(parsed.memberChecks) ? parsed.memberChecks : [],
      memberQueue: Array.isArray(parsed.memberQueue) ? parsed.memberQueue : [],
      queueIndex: Number.isFinite(parsed.queueIndex) ? parsed.queueIndex : 0,
      upgrades: Array.isArray(parsed.upgrades) ? parsed.upgrades : defaultUpgrades
    };
  } catch {
    return createEmptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportState(state) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Phantom Troupe Guild Tracker",
      version: 1,
      data: state
    },
    null,
    2
  );
}

export function loadLastExportedAt() {
  try {
    return localStorage.getItem(LAST_EXPORTED_KEY) || "";
  } catch {
    return "";
  }
}

export function saveLastExportedAt(timestamp) {
  localStorage.setItem(LAST_EXPORTED_KEY, timestamp);
}

export function loadTeamSelection(discordId) {
  const key = getTeamStorageKey(discordId);
  if (!key) return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return normalizeTeamSelection(parsed);
  } catch {
    return [];
  }
}

export function saveTeamSelection(discordId, members) {
  const key = getTeamStorageKey(discordId);
  if (!key) return [];

  const nextSelection = normalizeTeamSelection(members);
  localStorage.setItem(key, JSON.stringify(nextSelection));
  return nextSelection;
}

function getTeamStorageKey(discordId) {
  const normalizedDiscordId = String(discordId || "").trim();
  return normalizedDiscordId ? `${TEAM_STORAGE_PREFIX}${normalizedDiscordId}` : "";
}

function normalizeTeamSelection(members) {
  const seen = new Set();
  return (Array.isArray(members) ? members : [])
    .map((member) => String(member || "").trim().toLowerCase())
    .filter((member) => {
      if (!member || seen.has(member)) return false;
      seen.add(member);
      return true;
    })
    .slice(0, TEAM_CAP);
}

export function importState(json) {
  const parsed = JSON.parse(json);
  const data = parsed.data || parsed;
  return {
    ...createEmptyState(),
    ...data,
    settings: {
      ...defaultSettings,
      ...(data.settings || {})
    },
    snapshots: {
      snapshot1: data.snapshots?.snapshot1 || "",
      snapshot2: data.snapshots?.snapshot2 || ""
    },
    snapshotHistory: Array.isArray(data.snapshotHistory) ? data.snapshotHistory : [],
    snapshotRawImports: Array.isArray(data.snapshotRawImports) ? data.snapshotRawImports : [],
    members: Array.isArray(data.members) ? data.members : [],
    memberChecks: Array.isArray(data.memberChecks) ? data.memberChecks : [],
    memberQueue: Array.isArray(data.memberQueue) ? data.memberQueue : [],
    queueIndex: Number.isFinite(data.queueIndex) ? data.queueIndex : 0,
    upgrades: Array.isArray(data.upgrades) ? data.upgrades : defaultUpgrades
  };
}
