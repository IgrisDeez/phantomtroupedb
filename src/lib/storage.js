export const STORAGE_KEY = "phantom-troupe-guild-tracker:v2";

export const defaultSettings = {
  guildName: "Phantom Troupe",
  guildDisplayName: "Phantom Troupe",
  guildId: "",
  memberCap: 150,
  dailyRequirement: 50,
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
    members: Array.isArray(data.members) ? data.members : [],
    memberChecks: Array.isArray(data.memberChecks) ? data.memberChecks : [],
    memberQueue: Array.isArray(data.memberQueue) ? data.memberQueue : [],
    queueIndex: Number.isFinite(data.queueIndex) ? data.queueIndex : 0,
    upgrades: Array.isArray(data.upgrades) ? data.upgrades : defaultUpgrades
  };
}
