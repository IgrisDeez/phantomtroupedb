import assert from "node:assert/strict";
import { buildDataHealthReport, buildDebugReport } from "../src/lib/diagnostics.js";
import { buildMemberRows, getDailyRequirementProgress, getMemberStatus, getScaledDailyRequirement } from "../src/lib/tracker.js";
import { getDailyRequirementProgressWithTolerance, getMemberStatusWithTolerance } from "../src/lib/memberStatus.js";

const baseMembers = [{ roblox: "Alex_Steel1233", contribution: 0, previousContribution: 0 }];

function buildRowsForInterval(startTimestamp, endTimestamp) {
  return buildMemberRows(baseMembers, [
    { roblox: "Alex_Steel1233", contribution: 8, timestamp: startTimestamp },
    { roblox: "Alex_Steel1233", contribution: 868, timestamp: endTimestamp }
  ]);
}

const shortIntervalRows = buildRowsForInterval(
  "2026-05-01T02:57:00.000Z",
  "2026-05-01T03:01:00.000Z"
);
const exactHourRows = buildRowsForInterval(
  "2026-05-01T02:01:00.000Z",
  "2026-05-01T03:01:00.000Z"
);
const sameContributionRows = buildMemberRows(baseMembers, [
  { roblox: "Alex_Steel1233", contribution: 400, timestamp: "2026-05-01T02:01:00.000Z" },
  { roblox: "Alex_Steel1233", contribution: 400, timestamp: "2026-05-01T03:01:00.000Z" }
]);
const lowerContributionRows = buildMemberRows(baseMembers, [
  { roblox: "Alex_Steel1233", contribution: 860, timestamp: "2026-05-01T02:01:00.000Z" },
  { roblox: "Alex_Steel1233", contribution: 840, timestamp: "2026-05-01T03:01:00.000Z" }
]);
const sixHourNoGain = { contribution: 2500, gainSincePrevious: 0, hoursSincePrevious: 6 };
const sixHourLowGain = { contribution: 2500, gainSincePrevious: 60, hoursSincePrevious: 6 };
const sixHourNearToleranceGain = { contribution: 2500, gainSincePrevious: 85, hoursSincePrevious: 6 };
const sixHourActiveGain = { contribution: 2500, gainSincePrevious: 120, hoursSincePrevious: 6 };
const sixHourErrorGain = { contribution: 2500, gainSincePrevious: -50, hoursSincePrevious: 6 };

assert.equal(shortIntervalRows[0].gainSincePrevious, 860);
assert.equal(Number(shortIntervalRows[0].hoursSincePrevious.toFixed(2)), 0.07);
assert.equal(shortIntervalRows[0].gainPerHour, null);

assert.equal(exactHourRows[0].gainSincePrevious, 860);
assert.equal(exactHourRows[0].hoursSincePrevious, 1);
assert.equal(exactHourRows[0].gainPerHour, 860);
assert.equal(exactHourRows[0].hasErrorCheck, false);

assert.equal(sameContributionRows[0].gainSincePrevious, 0);
assert.equal(sameContributionRows[0].hasErrorCheck, false);

assert.equal(lowerContributionRows[0].gainSincePrevious, -20);
assert.equal(lowerContributionRows[0].hasErrorCheck, true);
assert.equal(lowerContributionRows[0].gainPerHour, null);

assert.equal(getScaledDailyRequirement(sixHourNoGain, 400), 100);
assert.equal(getMemberStatus(sixHourNoGain, 400), "Inactive");
assert.deepEqual(getDailyRequirementProgress(sixHourNoGain, 400), {
  progress: 0,
  requirement: 100,
  remaining: 100,
  status: "Inactive"
});

assert.equal(getScaledDailyRequirement(sixHourLowGain, 400), 100);
assert.equal(getMemberStatus(sixHourLowGain, 400), "Low");
assert.deepEqual(getDailyRequirementProgress(sixHourLowGain, 400), {
  progress: 60,
  requirement: 100,
  remaining: 40,
  status: "Low"
});

assert.equal(getScaledDailyRequirement(sixHourNearToleranceGain, 400), 100);
assert.equal(getMemberStatus(sixHourNearToleranceGain, 400), "Low");
assert.equal(getMemberStatusWithTolerance(sixHourNearToleranceGain, 400), "Active");
assert.deepEqual(getDailyRequirementProgressWithTolerance(sixHourNearToleranceGain, 400), {
  progress: 85,
  requirement: 100,
  remaining: null,
  status: "Active",
  tolerance: 20
});

assert.equal(getScaledDailyRequirement(sixHourActiveGain, 400), 100);
assert.equal(getMemberStatus(sixHourActiveGain, 400), "Active");
assert.equal(getMemberStatusWithTolerance(sixHourActiveGain, 400), "Active");
assert.deepEqual(getDailyRequirementProgress(sixHourActiveGain, 400), {
  progress: 120,
  requirement: 100,
  remaining: 0,
  status: "Active"
});
assert.deepEqual(getDailyRequirementProgressWithTolerance(sixHourActiveGain, 400), {
  progress: 120,
  requirement: 100,
  remaining: null,
  status: "Active",
  tolerance: 20
});

assert.equal(getScaledDailyRequirement(sixHourErrorGain, 400), 100);
assert.equal(getMemberStatus(sixHourErrorGain, 400), "Error Check");
assert.equal(getMemberStatusWithTolerance(sixHourErrorGain, 400), "Error Check");
assert.deepEqual(getDailyRequirementProgress(sixHourErrorGain, 400), {
  progress: 0,
  requirement: 100,
  remaining: 100,
  status: "Error Check"
});
assert.deepEqual(getDailyRequirementProgressWithTolerance(sixHourErrorGain, 400), {
  progress: 0,
  requirement: 100,
  remaining: 100,
  status: "Error Check",
  tolerance: 20
});

const diagnosticState = {
  settings: {
    guildName: "Phantom Troupe",
    guildDisplayName: "Phantom Troupe",
    trackedGuildName: "Phantom Troupe",
    trackedGuildAliases: "PhantomTroupe\nPHANTOM TROUPE",
    guildTimezone: "Asia/Taipei",
    guildId: "",
    memberCap: 150,
    dailyRequirement: 400,
    activeMembers: 0
  },
  snapshots: {
    snapshot1: "1\t02:01\t#5\tPhantom Troupe\t500K",
    snapshot2: "2\t03:01\t#5\tPhantom Troupe\t501K"
  },
  snapshotHistory: [],
  snapshotRawImports: [],
  members: baseMembers,
  memberChecks: [
    { roblox: "Alex_Steel1233", contribution: 8, timestamp: "2026-05-01T02:01:00.000Z" },
    { roblox: "Alex_Steel1233", contribution: 108, timestamp: "2026-05-01T08:01:00.000Z" }
  ],
  memberQueue: [],
  queueIndex: 0,
  upgrades: []
};
const healthReport = buildDataHealthReport(diagnosticState);
const debugReport = buildDebugReport(diagnosticState, { dataSource: "test", role: "visionary" });
assert.equal(healthReport.summary.members, 1);
assert.equal(healthReport.summary.latestSnapshotRows, 1);
assert.equal(debugReport.context.dataSource, "test");
assert.equal(debugReport.calculated.members[0].status, "Active");
assert.equal(debugReport.calculated.members[0].scaledRequirement, 100);

console.log("Regression checks passed.");
