// Shared star computation — used by both client (questProgress.js) and server (quest-progress.js)

// Stars per exercise based on percentage score
export function percentageToStars(percentage) {
  const pct = clampPercentage(percentage);
  if (pct === 0) return 0;
  if (pct < 40) return 1;
  if (pct < 60) return 2;
  if (pct < 80) return 3;
  if (pct < 100) return 4;
  return 5;
}

// Total stars across all branches from bestScores
export function computeTotalStars(progress) {
  let stars = 0;
  for (const branchData of Object.values(progress?.branches || {})) {
    for (const percentage of Object.values(branchData?.bestScores || {})) {
      stars += percentageToStars(percentage);
    }
  }
  return stars;
}

// Stars earned in a single branch-level from bestScores
export function computeLevelStars(branchBestScores, levelExercises) {
  let stars = 0;
  for (const ex of levelExercises) {
    const pct = branchBestScores[ex.id];
    if (pct !== undefined) stars += percentageToStars(pct);
  }
  return stars;
}

export function clampPercentage(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
