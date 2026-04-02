// Shared XP computation — used by both client (questProgress.js) and server (quest-progress.js)
export const BASE_XP = 50;
export const FIRST_COMPLETION_BONUS = 10;
export const PERFECT_BONUS = 15;

export function exerciseXP(percentage) {
  const pct = clampPercentage(percentage);
  return Math.floor(BASE_XP * (pct / 100)) + FIRST_COMPLETION_BONUS + (pct === 100 ? PERFECT_BONUS : 0);
}

export function computeTotalXP(progress) {
  let xp = 0;
  for (const branchData of Object.values(progress?.branches || {})) {
    for (const percentage of Object.values(branchData?.bestScores || {})) {
      xp += exerciseXP(percentage);
    }
  }
  return xp;
}

export function clampPercentage(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
