import {
  buildMemberRows,
  buildSnapshotHistory,
  buildTrackerData,
  formatSigned,
  getMemberGain,
  getMemberGainPerHour,
  getScaledDailyRequirement,
  normalizeGuild
} from "./tracker";
import { getDailyRequirementProgressWithTolerance, getMemberStatusWithTolerance } from "./memberStatus";

const APP_NAME = "Phantom Troupe Guild Tracker";
const DEBUG_REPORT_VERSION = 1;

export function buildDataHealthReport(state) {
  const settings = state?.settings || {};
  const rawMembers = Array.isArray(state?.members) ? state.members : [];
  const memberChecks = Array.isArray(state?.memberChecks) ? state.memberChecks : [];
  const snapshotHistory = Array.isArray(state?.snapshotHistory) ? state.snapshotHistory : [];
  const upgrades = Array.isArray(state?.upgrades) ? state.upgrades : [];
  const tracker = buildTrackerData(state?.snapshots || {}, settings);
  const members = buildMemberRows(rawMembers, memberChecks);
  const warnings = [];
  const now = Date.now();
  const futureGraceMs = 5 * 60 * 1000;

  function add(severity, area, message, details = {}) {
    warnings.push({ severity, area, message, details });
  }

  const dailyRequirement = Number(settings.dailyRequirement);
  const memberCap = Number(settings.memberCap);

  if (!Number.isFinite(dailyRequirement) || dailyRequirement <= 0) {
    add("error", "settings", "Daily requirement is missing or zero.", { dailyRequirement: settings.dailyRequirement });
  }
  if (!Number.isFinite(memberCap) || memberCap <= 0) {
    add("error", "settings", "Member cap is missing or invalid.", { memberCap: settings.memberCap });
  }
  if (memberCap > 0 && members.length > memberCap) {
    add("warning", "settings", "Imported member count is above member cap.", { members: members.length, memberCap });
  }
  if (!String(settings.trackedGuildName || settings.guildName || "").trim()) {
    add("warning", "settings", "Tracked guild name is blank.");
  }

  if (!tracker.snapshotOneRows.length && !tracker.snapshotTwoRows.length && !snapshotHistory.length) {
    add("warning", "snapshots", "No snapshot data found.");
  }
  if (tracker.snapshotOneRows.length && tracker.snapshotTwoRows.length && tracker.elapsedHours === null) {
    add("error", "snapshots", "Could not calculate elapsed time between Snapshot 1 and Snapshot 2.");
  }
  if (tracker.latestRows.length && !tracker.phantom) {
    add("error", "snapshots", "Tracked guild was not found in the latest snapshot rows.", {
      trackedGuildName: settings.trackedGuildName || settings.guildName || "",
      aliases: settings.trackedGuildAliases || ""
    });
  }

  const trackedHistoryRows = snapshotHistory.filter((row) => isTrackedHistoryRow(row, settings));
  const historyBySnapshot = new Map();
  trackedHistoryRows.forEach((row) => {
    const snapshot = Number(row.snapshot);
    if (!Number.isFinite(snapshot)) return;
    const rows = historyBySnapshot.get(snapshot) || [];
    rows.push(row);
    historyBySnapshot.set(snapshot, rows);
  });
  historyBySnapshot.forEach((rows, snapshot) => {
    if (rows.length > 1) {
      add("warning", "snapshotHistory", "Multiple tracked guild rows exist for one snapshot number.", {
        snapshot,
        rows: rows.map((row) => ({ guild: row.guild, points: row.points, timestamp: row.timestamp }))
      });
    }
  });

  const trackedHistory = buildSnapshotHistory(snapshotHistory, settings);
  trackedHistory.forEach((row) => {
    if (Number(row.pointGain) < 0) {
      add("error", "snapshotHistory", "Tracked guild points decreased between snapshots.", {
        snapshot: row.snapshot,
        previousSnapshot: row.previousSnapshot,
        pointGain: row.pointGain
      });
    }
    if (row.previousSnapshot && row.hoursPassed === null) {
      add("warning", "snapshotHistory", "Could not calculate hours between tracked snapshot rows.", {
        snapshot: row.snapshot,
        previousSnapshot: row.previousSnapshot
      });
    }
  });

  memberChecks.forEach((check, index) => {
    if (!String(check.roblox || "").trim()) {
      add("warning", "memberChecks", "Member check row is missing a Roblox username.", { index });
    }
    const contribution = Number(check.contribution);
    if (!Number.isFinite(contribution) || contribution < 0) {
      add("error", "memberChecks", "Member check has an invalid contribution value.", {
        roblox: check.roblox || "",
        contribution: check.contribution
      });
    }
    const timestampMs = new Date(check.timestamp).getTime();
    if (!Number.isFinite(timestampMs)) {
      add("error", "memberChecks", "Member check has an invalid timestamp.", {
        roblox: check.roblox || "",
        timestamp: check.timestamp || ""
      });
    } else if (timestampMs > now + futureGraceMs) {
      add("warning", "memberChecks", "Member check timestamp is in the future.", {
        roblox: check.roblox || "",
        timestamp: check.timestamp || ""
      });
    }
  });

  members.forEach((member) => {
    const gain = getMemberGain(member);
    const scaledRequirement = getScaledDailyRequirement(member, settings.dailyRequirement);
    const status = getMemberStatusWithTolerance(member, settings.dailyRequirement);

    if (gain !== null && gain < 0) {
      add("error", "members", "Member contribution decreased since previous check.", {
        roblox: member.roblox,
        gain
      });
    }
    if (!member.lastChecked) {
      add("warning", "members", "Member has no saved check timestamp.", { roblox: member.roblox });
    }
    if (member.lastChecked) {
      const lastCheckedMs = new Date(member.lastChecked).getTime();
      if (!Number.isFinite(lastCheckedMs)) {
        add("error", "members", "Member last check timestamp is invalid.", {
          roblox: member.roblox,
          lastChecked: member.lastChecked
        });
      } else if (lastCheckedMs > now + futureGraceMs) {
        add("warning", "members", "Member last check timestamp is in the future.", {
          roblox: member.roblox,
          lastChecked: member.lastChecked
        });
      }
    }
    if (member.checkCount === 1) {
      add("info", "members", "Member has only one check, so gain/hour cannot be fully verified yet.", { roblox: member.roblox });
    }
    if (status !== "Error Check" && gain !== null && gain > 0 && scaledRequirement === null) {
      add("warning", "members", "Member has gain but no interval requirement could be calculated.", {
        roblox: member.roblox,
        gain,
        hoursSincePrevious: member.hoursSincePrevious
      });
    }
  });

  const upgradeIds = new Set();
  upgrades.forEach((upgrade) => {
    if (!upgrade?.id) {
      add("warning", "upgrades", "Upgrade row is missing an id.");
      return;
    }
    if (upgradeIds.has(upgrade.id)) {
      add("warning", "upgrades", "Duplicate upgrade id found.", { id: upgrade.id });
    }
    upgradeIds.add(upgrade.id);
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalWarnings: warnings.length,
      errors: warnings.filter((item) => item.severity === "error").length,
      warnings: warnings.filter((item) => item.severity === "warning").length,
      info: warnings.filter((item) => item.severity === "info").length,
      members: members.length,
      memberChecks: memberChecks.length,
      snapshotHistory: snapshotHistory.length,
      latestSnapshotRows: tracker.latestRows.length
    },
    warnings
  };
}

export function buildDebugReport(state, context = {}) {
  const settings = state?.settings || {};
  const tracker = buildTrackerData(state?.snapshots || {}, settings);
  const members = buildMemberRows(state?.members || [], state?.memberChecks || []);
  const health = buildDataHealthReport(state);

  return {
    exportedAt: new Date().toISOString(),
    app: APP_NAME,
    version: DEBUG_REPORT_VERSION,
    context: {
      dataSource: context.dataSource || "unknown",
      role: context.role || "unknown"
    },
    settings,
    counts: {
      rawMembers: Array.isArray(state?.members) ? state.members.length : 0,
      displayMembers: members.length,
      memberChecks: Array.isArray(state?.memberChecks) ? state.memberChecks.length : 0,
      snapshotHistory: Array.isArray(state?.snapshotHistory) ? state.snapshotHistory.length : 0,
      upgrades: Array.isArray(state?.upgrades) ? state.upgrades.length : 0
    },
    raw: {
      snapshots: state?.snapshots || {},
      snapshotHistory: state?.snapshotHistory || [],
      members: state?.members || [],
      memberChecks: state?.memberChecks || [],
      upgrades: state?.upgrades || []
    },
    calculated: {
      tracker: {
        elapsedHours: tracker.elapsedHours,
        phantom: tracker.phantom,
        phantomSummary: tracker.phantomSummary,
        latestRanking: tracker.latestRanking,
        snapshotOneRows: tracker.snapshotOneRows,
        snapshotTwoRows: tracker.snapshotTwoRows
      },
      members: members.map((member) => {
        const gain = getMemberGain(member);
        const progress = getDailyRequirementProgressWithTolerance(member, settings.dailyRequirement);
        return {
          roblox: member.roblox,
          discord: member.discord || "",
          contribution: Number(member.contribution) || 0,
          previousContribution: Number(member.previousContribution) || 0,
          gain,
          gainFormatted: formatSigned(gain),
          gainPerHour: getMemberGainPerHour(member),
          hoursSincePrevious: member.hoursSincePrevious ?? null,
          lastChecked: member.lastChecked || "",
          previousChecked: member.previousChecked || "",
          scaledRequirement: getScaledDailyRequirement(member, settings.dailyRequirement),
          status: getMemberStatusWithTolerance(member, settings.dailyRequirement),
          progress
        };
      })
    },
    health
  };
}

export function stringifyDebugReport(state, context = {}) {
  return JSON.stringify(buildDebugReport(state, context), null, 2);
}

export function getHealthTone(health) {
  if (!health?.summary) return "warning";
  if (health.summary.errors > 0) return "error";
  if (health.summary.warnings > 0) return "warning";
  return "ok";
}

function isTrackedHistoryRow(row, settings) {
  const normalizedGuild = normalizeGuild(row?.guild);
  if (!normalizedGuild) return false;
  const aliases = [
    settings?.trackedGuildName,
    settings?.guildName,
    settings?.guildDisplayName,
    ...(String(settings?.trackedGuildAliases || "")
      .split(/\r?\n|,/)
      .map((alias) => alias.trim())
      .filter(Boolean))
  ];
  return aliases.some((alias) => normalizeGuild(alias) === normalizedGuild);
}
