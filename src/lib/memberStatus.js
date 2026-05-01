import { getMemberGain } from "./tracker";

export function getDailyMemberStatus(member, requirement) {
  const dailyRequirement = Number(requirement) || 400;
  const gain = getMemberGain(member);
  const progress = Math.max(0, Number(gain) || 0);

  if (progress >= dailyRequirement) return "Active";
  if (progress > 0) return "Low";
  return "Inactive";
}

export function getDailyMemberProgress(member, requirement) {
  const dailyRequirement = Number(requirement) || 400;
  const gain = getMemberGain(member);
  const progress = Math.max(0, Number(gain) || 0);
  const remaining = Math.max(0, dailyRequirement - progress);

  return {
    progress,
    requirement: dailyRequirement,
    remaining,
    status: getDailyMemberStatus(member, dailyRequirement)
  };
}
