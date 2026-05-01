import { getMemberGain } from "./tracker";

export function getScaledDailyRequirement(member, requirement) {
  const dailyRequirement = Number(requirement) || 400;
  const hours = Number(member?.hoursSincePrevious);

  if (!Number.isFinite(hours) || hours <= 0) {
    return dailyRequirement;
  }

  return Math.max(1, Math.round(dailyRequirement * (hours / 24)));
}

export function getDailyMemberStatus(member, requirement) {
  const gain = getMemberGain(member);

  if (gain !== null && gain < 0) return "Error Check";
  if (gain === null || gain === undefined) return "Inactive";

  const progress = Math.max(0, Number(gain) || 0);
  const requiredGain = getScaledDailyRequirement(member, requirement);

  if (progress >= requiredGain) return "Active";
  if (progress > 0) return "Low";
  return "Inactive";
}

export function getDailyMemberProgress(member, requirement) {
  const gain = getMemberGain(member);
  const progress = Math.max(0, Number(gain) || 0);
  const requiredGain = getScaledDailyRequirement(member, requirement);
  const remaining = Math.max(0, requiredGain - progress);

  return {
    progress,
    requirement: requiredGain,
    remaining,
    status: getDailyMemberStatus(member, requirement)
  };
}
