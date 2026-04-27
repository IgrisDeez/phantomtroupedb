export const STORAGE_KEY = "phantom-troupe-guild-tracker:v1";

export const demoSnapshotOne = `1\t18:57\t1\tunveil\t369700
1\t18:57\t2\tglory\t344200
1\t18:57\t3\tmystic\t329900
1\t18:57\t4\takatsuki\t318.4K
1\t18:57\t5\tPhantom Troupe\t302100
1\t18:57\t6\teclipse\t291300
1\t18:57\t7\tcrimson\t280950
1\t18:57\t8\tvalhalla\t274400
1\t18:57\t9\tnightfall\t269.8K
1\t18:57\t10\tseraph\t258600`;

export const demoSnapshotTwo = `2\t21:27\t1\tunveil\t383500
2\t21:27\t2\tglory\t360200
2\t21:27\t3\tmystic\t346100
2\t21:27\t4\takatsuki\t332400
2\t21:27\t5\tPhantom Troupe\t318900
2\t21:27\t6\teclipse\t304.6K
2\t21:27\t7\tcrimson\t294750
2\t21:27\t8\tvalhalla\t287900
2\t21:27\t9\tnightfall\t281100
2\t21:27\t10\tseraph\t270250`;

const now = new Date().toISOString();

export const defaultSettings = {
  guildName: "Phantom Troupe",
  guildDisplayName: "Phantom Troupe",
  guildId: "Guild ID pending",
  memberCap: 150,
  dailyRequirement: 300,
  totalBounty: "TBD",
  activeMembers: 150
};

export const defaultUpgrades = [
  { id: "capacity", name: "Member Capacity", level: 10, value: "150 Slots", maxLevel: 10, maxed: true },
  { id: "damage", name: "Damage %", level: 5, value: "+15%", maxLevel: 5, maxed: true },
  { id: "critDamage", name: "Crit Damage", level: 5, value: "+5%", maxLevel: 5, maxed: true },
  { id: "critChance", name: "Crit Chance", level: 5, value: "+2.4%", maxLevel: 5, maxed: true },
  { id: "hp", name: "HP %", level: 5, value: "+15%", maxLevel: 5, maxed: false },
  { id: "luck", name: "Luck", level: 5, value: "+10%", maxLevel: 5, maxed: true }
];

export const demoMembers = [
  { discord: "Kuroro", roblox: "PhantomCaptain", contribution: 420, previousContribution: 330, playtime: "6h 20m", notes: "Raid lead", lastChecked: now },
  { discord: "Machi", roblox: "SilkNeedle", contribution: 315, previousContribution: 270, playtime: "4h 10m", notes: "", lastChecked: now },
  { discord: "Feitan", roblox: "PainPacker", contribution: 292, previousContribution: 210, playtime: "5h 00m", notes: "", lastChecked: now },
  { discord: "Shalnark", roblox: "SignalHunter", contribution: 188, previousContribution: 160, playtime: "3h 35m", notes: "", lastChecked: now },
  { discord: "Nobunaga", roblox: "BladeCircle", contribution: 151, previousContribution: 115, playtime: "2h 48m", notes: "", lastChecked: now },
  { discord: "Pakunoda", roblox: "MemoryShot", contribution: 96, previousContribution: 80, playtime: "2h 05m", notes: "", lastChecked: now },
  { discord: "Franklin", roblox: "DoubleVolley", contribution: 75, previousContribution: 62, playtime: "1h 58m", notes: "", lastChecked: now },
  { discord: "Kortopi", roblox: "CopyVault", contribution: 48, previousContribution: 44, playtime: "1h 15m", notes: "Below daily req", lastChecked: now },
  { discord: "Bonolenov", roblox: "WarDance", contribution: 12, previousContribution: 0, playtime: "25m", notes: "", lastChecked: now },
  { discord: "", roblox: "SilentRecruit", contribution: 0, previousContribution: 0, playtime: "", notes: "Needs check", lastChecked: now }
];

export function createDemoState() {
  return {
    settings: defaultSettings,
    snapshots: {
      snapshot1: demoSnapshotOne,
      snapshot2: demoSnapshotTwo
    },
    members: demoMembers,
    memberQueue: demoMembers.map((member) => member.roblox),
    queueIndex: 0,
    upgrades: defaultUpgrades
  };
}

export function createEmptyState() {
  return {
    settings: defaultSettings,
    snapshots: {
      snapshot1: "",
      snapshot2: ""
    },
    members: [],
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
    memberQueue: Array.isArray(data.memberQueue) ? data.memberQueue : [],
    queueIndex: Number.isFinite(data.queueIndex) ? data.queueIndex : 0,
    upgrades: Array.isArray(data.upgrades) ? data.upgrades : defaultUpgrades
  };
}
