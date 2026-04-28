const DASH = "-";

export function parsePoints(value) {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim().replace(/,/g, "");
  const match = raw.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/i);
  if (!match) return Number(raw) || 0;

  const number = Number(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  const multiplier = suffix === "k" ? 1000 : suffix === "m" ? 1000000 : suffix === "b" ? 1000000000 : 1;
  return Math.round(number * multiplier);
}

export function parseSnapshotInput(input, fallbackSnapshot) {
  if (!input?.trim()) return [];

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^snapshot\s+/i.test(line) && !/^snapshot\t/i.test(line))
    .map((line) => parseSnapshotRow(line, fallbackSnapshot))
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank);
}

function parseSnapshotRow(line, fallbackSnapshot) {
  const tabParts = line.split("\t").map((part) => part.trim()).filter(Boolean);
  const parts = tabParts.length >= 5 ? tabParts : line.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 4) return null;

  let snapshot = fallbackSnapshot;
  let timestamp;
  let rank;
  let guild;
  let points;

  if (parts.length >= 5 && Number.isFinite(Number(parts[0]))) {
    snapshot = Number(parts[0]);
    timestamp = parts[1];
    rank = Number(parts[2]);
    guild = parts.slice(3, -1).join(" ");
    points = parsePoints(parts[parts.length - 1]);
  } else {
    timestamp = parts[0];
    rank = Number(parts[1]);
    guild = parts.slice(2, -1).join(" ");
    points = parsePoints(parts[parts.length - 1]);
  }

  if (!timestamp || !Number.isFinite(rank) || !guild) return null;

  return { snapshot, timestamp, rank, guild, points };
}

export function calculateElapsedHours(snapshotOneRows, snapshotTwoRows) {
  if (!snapshotOneRows.length || !snapshotTwoRows.length) return null;

  const first = parseClock(snapshotOneRows[0].timestamp);
  const second = parseClock(snapshotTwoRows[0].timestamp);
  if (first === null || second === null) return null;

  let minutes = second - first;
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

function parseClock(timestamp) {
  const match = String(timestamp).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function buildTrackerData(snapshots, settings) {
  const snapshotOneRows = parseSnapshotInput(snapshots.snapshot1, 1);
  const snapshotTwoRows = parseSnapshotInput(snapshots.snapshot2, 2);
  const hasSnapshotTwo = snapshotTwoRows.length > 0;
  const latestRows = hasSnapshotTwo ? snapshotTwoRows : snapshotOneRows;
  const elapsedHours = calculateElapsedHours(snapshotOneRows, snapshotTwoRows);
  const previousByGuild = new Map(snapshotOneRows.map((row) => [normalizeGuild(row.guild), row]));
  const memberCap = Number(settings.memberCap) || 150;

  const latestRanking = latestRows.map((row, index) => {
    const above = index > 0 ? latestRows[index - 1] : null;
    const previous = previousByGuild.get(normalizeGuild(row.guild));
    const totalGain = hasSnapshotTwo && previous ? row.points - previous.points : null;
    const gainPerHour = totalGain !== null && elapsedHours ? totalGain / elapsedHours : null;
    const perMemberHour = gainPerHour !== null ? gainPerHour / memberCap : null;

    return {
      ...row,
      gap: above ? above.points - row.points : 0,
      totalGain,
      gainPerHour,
      perMemberHour,
      isTrackedGuild: isTrackedGuild(row.guild, settings.guildName)
    };
  });

  const phantom = latestRanking.find((row) => row.isTrackedGuild) || null;
  const phantomSummary = buildPhantomSummary(latestRanking, phantom);

  return {
    snapshotOneRows,
    snapshotTwoRows,
    latestRows,
    latestRanking,
    elapsedHours,
    phantom,
    phantomSummary
  };
}

function buildPhantomSummary(rows, phantom) {
  const targets = [5, 4, 3, 2, 1];
  if (!phantom) return targets.map((rank) => ({ rank, gap: null }));

  return targets.map((rank) => {
    const target = rows.find((row) => row.rank === rank);
    const gap = target ? Math.max(0, target.points - phantom.points) : null;
    return { rank, gap };
  });
}

export function normalizeGuild(name) {
  return String(name || "").trim().toLowerCase();
}

export function isTrackedGuild(guild, trackedGuild) {
  return normalizeGuild(guild) === normalizeGuild(trackedGuild);
}

export function getMemberStatus(member, requirement) {
  const contribution = Number(member.contribution) || 0;
  const dailyRequirement = Number(requirement) || 50;
  if (contribution >= dailyRequirement) return "Active";
  if (contribution > 0) return "Low";
  return "Inactive";
}

export function getMemberGain(member) {
  if (member.gainSincePrevious !== undefined && member.gainSincePrevious !== null) {
    return Number(member.gainSincePrevious) || 0;
  }
  if (member.checkCount > 0) return null;
  return (Number(member.contribution) || 0) - (Number(member.previousContribution) || 0);
}

export function getMemberGainPerHour(member) {
  if (member.gainPerHour === null || member.gainPerHour === undefined || Number.isNaN(member.gainPerHour)) return null;
  return Number(member.gainPerHour);
}

export function buildMemberRows(members = [], memberChecks = []) {
  const byName = new Map();

  members.forEach((member) => {
    if (!member.roblox) return;
    byName.set(normalizeGuild(member.roblox), {
      ...member,
      previousChecked: "",
      hoursSincePrevious: null,
      gainSincePrevious: getMemberGain(member),
      gainPerHour: null,
      checkCount: 0
    });
  });

  const checksByName = new Map();
  memberChecks.forEach((check) => {
    if (!check.roblox || !check.timestamp) return;
    const key = normalizeGuild(check.roblox);
    if (!checksByName.has(key)) checksByName.set(key, []);
    checksByName.get(key).push(check);
  });

  checksByName.forEach((checks, key) => {
    const sorted = [...checks].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const existing = byName.get(key) || {};
    const gain = previous ? Number(latest.contribution || 0) - Number(previous.contribution || 0) : null;
    const hours = previous ? diffHours(previous.timestamp, latest.timestamp) : null;

    byName.set(key, {
      ...existing,
      discord: latest.discord || existing.discord || "",
      roblox: latest.roblox,
      contribution: Number(latest.contribution) || 0,
      previousContribution: previous ? Number(previous.contribution) || 0 : existing.previousContribution || 0,
      playtime: latest.playtime || existing.playtime || "",
      notes: latest.notes || existing.notes || "",
      lastChecked: latest.timestamp,
      previousChecked: previous?.timestamp || "",
      hoursSincePrevious: hours,
      gainSincePrevious: gain,
      gainPerHour: gain !== null && hours ? gain / hours : null,
      checkCount: sorted.length
    });
  });

  return [...byName.values()];
}

export function parseMemberImport(input) {
  const lines = String(input || "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { rows: [], skipped: [], duplicates: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);
  const indexes = {
    timestamp: headers.indexOf("timestamp"),
    roblox: headers.indexOf("roblox"),
    contribution: headers.indexOf("contribution"),
    discord: headers.indexOf("discord"),
    playtime: headers.indexOf("playtime"),
    notes: headers.indexOf("notes")
  };

  if (indexes.timestamp < 0 || indexes.roblox < 0 || indexes.contribution < 0) {
    return {
      rows: [],
      skipped: [{ line: 1, raw: lines[0], reason: "Missing required headers: Timestamp, Roblox, Contribution" }],
      duplicates: []
    };
  }

  const rowMap = new Map();
  const skipped = [];
  const duplicates = [];

  lines.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const parts = splitDelimitedLine(line, delimiter);
    const timestamp = parseMemberTimestamp(parts[indexes.timestamp]);
    const roblox = parts[indexes.roblox]?.trim() || "";
    const contributionCell = parts[indexes.contribution]?.trim() || "";
    const contribution = parsePoints(contributionCell);

    if (!roblox) {
      skipped.push({ line: lineNumber, raw: line, reason: "Missing Roblox username" });
      return;
    }
    if (!timestamp) {
      skipped.push({ line: lineNumber, raw: line, reason: "Invalid timestamp" });
      return;
    }
    if (!contributionCell || !Number.isFinite(contribution)) {
      skipped.push({ line: lineNumber, raw: line, reason: "Invalid contribution" });
      return;
    }

    const key = `${normalizeGuild(roblox)}|${timestamp}`;
    if (rowMap.has(key)) {
      duplicates.push({ line: lineNumber, roblox, timestamp, reason: "Duplicate member and timestamp; last row will be used" });
    }

    rowMap.set(key, {
      timestamp,
      roblox,
      contribution,
      discord: indexes.discord >= 0 ? parts[indexes.discord]?.trim() || "" : "",
      playtime: indexes.playtime >= 0 ? parts[indexes.playtime]?.trim() || "" : "",
      notes: indexes.notes >= 0 ? parts[indexes.notes]?.trim() || "" : ""
    });
  });

  return {
    rows: [...rowMap.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp) || a.roblox.localeCompare(b.roblox)),
    skipped,
    duplicates
  };
}

export function applyMemberImport(state, rows) {
  const batchId = `import-${Date.now()}`;
  const newChecks = rows.map((row) => ({ ...row, batchId }));
  const existingNames = new Set(state.members.map((member) => normalizeGuild(member.roblox)));
  const queueNames = new Set(state.memberQueue.map((name) => normalizeGuild(name)));
  const nextMembers = [...state.members];
  const nextQueue = [...state.memberQueue];

  rows.forEach((row) => {
    const key = normalizeGuild(row.roblox);
    if (!existingNames.has(key)) {
      nextMembers.push({
        discord: row.discord || "",
        roblox: row.roblox,
        contribution: 0,
        previousContribution: 0,
        playtime: "",
        notes: "",
        lastChecked: ""
      });
      existingNames.add(key);
    }
    if (!queueNames.has(key)) {
      nextQueue.push(row.roblox);
      queueNames.add(key);
    }
  });

  return {
    ...state,
    members: nextMembers,
    memberChecks: [...(state.memberChecks || []), ...newChecks],
    memberQueue: nextQueue
  };
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return Math.round(Number(value)).toLocaleString();
}

export function formatSigned(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  const rounded = Math.round(Number(value));
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString()}`;
}

export function formatDecimal(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

export function formatDateTime(value) {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleString();
}

export function buildDiscordReport({ settings, tracker, members }) {
  const phantom = tracker.phantom;
  const activeCount = members.filter((member) => getMemberStatus(member, settings.dailyRequirement) === "Active").length;
  const lowMembers = members.filter((member) => getMemberStatus(member, settings.dailyRequirement) !== "Active");
  const topMembers = [...members]
    .sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0))
    .slice(0, 5)
    .map((member, index) => `${index + 1}. ${member.roblox}: ${formatNumber(member.contribution)}`);

  return [
    `Phantom Troupe Guild Report`,
    `Guild: ${settings.guildDisplayName || settings.guildName}`,
    `Rank: ${phantom ? `#${phantom.rank}` : DASH}`,
    `Points: ${phantom ? formatNumber(phantom.points) : DASH}`,
    `Gap to next: ${phantom ? formatNumber(phantom.gap) : DASH}`,
    `Gain/hour: ${phantom ? formatSigned(phantom.gainPerHour) : DASH}`,
    `Active members: ${activeCount}/${settings.memberCap}`,
    `Daily requirement: ${settings.dailyRequirement}`,
    ``,
    `Top contribution:`,
    topMembers.length ? topMembers.join("\n") : DASH,
    ``,
    `Low or inactive: ${lowMembers.length}`
  ].join("\n");
}

function detectDelimiter(headerLine) {
  return headerLine.includes("\t") ? "\t" : ",";
}

function normalizeHeader(header) {
  return String(header || "").trim().toLowerCase().replace(/\s+/g, "");
}

function splitDelimitedLine(line, delimiter) {
  if (delimiter === "\t") return line.split("\t");
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseMemberTimestamp(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function diffHours(start, end) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return (endMs - startMs) / 3600000;
}
