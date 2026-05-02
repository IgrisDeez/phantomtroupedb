import {
  formatNumber,
  formatSigned,
  getMemberGain,
  getMemberGainPerHour,
  getScaledDailyRequirement
} from "./tracker.js";

const ACTIVE_TOLERANCE_POINTS = 20;

export function getMemberStatusWithTolerance(member, requirement) {
  const gain = getMemberGain(member);
  const expectedGain = getScaledDailyRequirement(member, requirement);

  if (gain !== null && gain < 0) return "Error Check";
  if (gain === null || expectedGain === null) return "Inactive";
  if (gain >= expectedGain) return "Active";
  if (gain > 0 && gain + ACTIVE_TOLERANCE_POINTS >= expectedGain) return "Active";
  if (gain > 0) return "Low";
  return "Inactive";
}

export function getDailyRequirementProgressWithTolerance(member, requirement) {
  const gain = getMemberGain(member);
  const scaledRequirement = getScaledDailyRequirement(member, requirement);
  const progress = Math.max(0, Number(gain) || 0);
  const status = getMemberStatusWithTolerance(member, requirement);
  const remaining = scaledRequirement === null || status === "Active" ? null : Math.max(0, scaledRequirement - progress);

  return {
    progress,
    requirement: scaledRequirement,
    remaining,
    status,
    tolerance: ACTIVE_TOLERANCE_POINTS
  };
}

export function countsAsActiveMember(member, requirement) {
  const status = getMemberStatusWithTolerance(member, requirement);
  return status === "Active" || status === "Low";
}

export function buildDiscordReportWithTolerance({ settings, tracker, members }) {
  const phantom = tracker.phantom;
  const activeCount = members.filter((member) => countsAsActiveMember(member, settings.dailyRequirement)).length;
  const lowMembers = members.filter((member) => getMemberStatusWithTolerance(member, settings.dailyRequirement) !== "Active");
  const topMembers = [...members]
    .sort((a, b) => Number(b.contribution || 0) - Number(a.contribution || 0))
    .slice(0, 5)
    .map((member, index) => `${index + 1}. ${member.roblox}: ${formatNumber(member.contribution)}`);

  return [
    `Phantom Troupe Guild Report`,
    `Guild: ${settings.guildDisplayName || settings.guildName}`,
    `Rank: ${phantom ? `#${phantom.rank}` : "-"}`,
    `Points: ${phantom ? formatNumber(phantom.points) : "-"}`,
    `Gap to next: ${phantom ? formatNumber(phantom.gap) : "-"}`,
    `Gain/hour: ${phantom ? formatSigned(phantom.gainPerHour) : "-"}`,
    `Active members: ${activeCount}/${settings.memberCap}`,
    `Daily requirement: ${settings.dailyRequirement}`,
    ``,
    `Top contribution:`,
    topMembers.length ? topMembers.join("\n") : "-",
    ``,
    `Low or inactive: ${lowMembers.length}`
  ].join("\n");
}

export {
  getMemberGain,
  getMemberGainPerHour,
  getScaledDailyRequirement
};
