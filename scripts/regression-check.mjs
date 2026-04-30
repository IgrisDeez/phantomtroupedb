import assert from "node:assert/strict";
import { buildMemberRows } from "../src/lib/tracker.js";

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

console.log("Regression checks passed.");
