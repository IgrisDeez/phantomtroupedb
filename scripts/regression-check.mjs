import assert from "node:assert/strict";
import { buildMemberRows, getDailyRequirementProgress } from "../src/lib/tracker.js";

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

assert.equal(shortIntervalRows[0].gainSincePrevious, 860);
assert.equal(Number(shortIntervalRows[0].hoursSincePrevious.toFixed(2)), 0.07);
assert.equal(shortIntervalRows[0].gainPerHour, null);

assert.equal(exactHourRows[0].gainSincePrevious, 860);
assert.equal(exactHourRows[0].hoursSincePrevious, 1);
assert.equal(exactHourRows[0].gainPerHour, 860);

assert.deepEqual(getDailyRequirementProgress({ gainSincePrevious: 0 }, 400), {
  progress: 0,
  requirement: 400,
  remaining: 400,
  status: "Inactive"
});
assert.deepEqual(getDailyRequirementProgress({ gainSincePrevious: 275 }, 400), {
  progress: 275,
  requirement: 400,
  remaining: 125,
  status: "Low"
});
assert.deepEqual(getDailyRequirementProgress({ gainSincePrevious: 400 }, 400), {
  progress: 400,
  requirement: 400,
  remaining: 0,
  status: "Active"
});
assert.deepEqual(getDailyRequirementProgress({ gainSincePrevious: -25 }, 400), {
  progress: 0,
  requirement: 400,
  remaining: 400,
  status: "Inactive"
});

console.log("Regression checks passed.");
