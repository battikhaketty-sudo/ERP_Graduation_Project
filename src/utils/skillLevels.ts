export const compareSkillLevelsByRank = (
  left: { progress: number },
  right: { progress: number },
) => (Number(left.progress) || 0) - (Number(right.progress) || 0);

export const sortSkillLevelsByRank = <T extends { progress: number }>(levels: T[]) =>
  [...levels].sort(compareSkillLevelsByRank);
