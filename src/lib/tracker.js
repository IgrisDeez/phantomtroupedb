const DASH = "—";

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

  return {
    snapshot,
    timestamp,
    rank,
    guild,
    points
  };
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
  if (!phantom) {
    return targets.map((rank) => ({ rank, gap: null }));
  }

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
  return (Number(member.contribution) || 0) - (Number(member.previousContribution) || 0);
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
