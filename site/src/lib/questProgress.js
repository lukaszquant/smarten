import { BASE_XP, FIRST_COMPLETION_BONUS, PERFECT_BONUS, XP_LEVELS, BRIDGE_THRESHOLD, flattenExercises } from "./questData";

const STORAGE_PREFIX = "smarten_quest_";

function storageKey(username) {
  return `${STORAGE_PREFIX}${username || "default"}`;
}

const EMPTY_PROGRESS = {
  xp: 0,
  branches: {
    vocabulary: { bestScores: {} },
    grammar: { bestScores: {} },
    reading: { bestScores: {} },
  },
  attempts: [],
};

export function loadProgress(username) {
  try {
    const raw = localStorage.getItem(storageKey(username));
    if (!raw) return structuredClone(EMPTY_PROGRESS);
    const parsed = JSON.parse(raw);
    // Ensure all branches exist
    for (const b of ["vocabulary", "grammar", "reading"]) {
      if (!parsed.branches[b]) parsed.branches[b] = { bestScores: {} };
      if (!parsed.branches[b].bestScores) parsed.branches[b].bestScores = {};
    }
    if (!parsed.attempts) parsed.attempts = [];
    if (typeof parsed.xp !== "number") parsed.xp = 0;
    return parsed;
  } catch {
    return structuredClone(EMPTY_PROGRESS);
  }
}

export function saveProgress(username, progress) {
  try {
    localStorage.setItem(storageKey(username), JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save quest progress:", e);
  }
}

export function calculateXP(percentage, isFirstAttempt) {
  let xp = Math.floor(BASE_XP * (percentage / 100));
  if (isFirstAttempt) xp += FIRST_COMPLETION_BONUS;
  if (percentage === 100) xp += PERFECT_BONUS;
  return xp;
}

export function getPlayerLevel(totalXP) {
  let current = XP_LEVELS[0];
  let next = XP_LEVELS[1] || null;
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= XP_LEVELS[i].xp) {
      current = XP_LEVELS[i];
      next = XP_LEVELS[i + 1] || null;
      break;
    }
  }
  const xpInLevel = totalXP - current.xp;
  const xpForNext = next ? next.xp - current.xp : 0;
  return {
    level: current.level,
    title: current.title,
    xpInLevel,
    xpForNext,
    progress: next ? xpInLevel / xpForNext : 1,
  };
}

export function processResult(progress, branch, exerciseId, score, maxScore) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const branchData = progress.branches[branch];
  const isFirstAttempt = !(exerciseId in branchData.bestScores);
  const xpEarned = calculateXP(percentage, isFirstAttempt);

  // Update best score (keep highest)
  const prevBest = branchData.bestScores[exerciseId] ?? -1;
  if (percentage > prevBest) {
    branchData.bestScores[exerciseId] = percentage;
  }

  // Add XP
  const prevLevel = getPlayerLevel(progress.xp);
  progress.xp += xpEarned;
  const newLevel = getPlayerLevel(progress.xp);
  const levelUp = newLevel.level > prevLevel.level;

  // Record attempt
  progress.attempts.push({
    exerciseId,
    branch,
    date: new Date().toISOString(),
    score,
    maxScore,
    percentage,
    xpEarned,
  });

  return { xpEarned, levelUp, newLevel };
}

/** Check if all exercises in a single level have bestScore >= threshold */
export function isLevelComplete(progress, branchId, levelExercises) {
  const branchData = progress.branches[branchId];
  if (!branchData) return false;
  return levelExercises.every(
    (ex) => (branchData.bestScores[ex.id] ?? 0) >= BRIDGE_THRESHOLD
  );
}

/** Get the highest unlocked level (1-based; level 1 always unlocked) */
export function getHighestUnlockedLevel(progress, branchId, levels) {
  if (!levels || levels.length === 0) return 1;
  let highest = 1;
  for (let i = 0; i < levels.length - 1; i++) {
    if (isLevelComplete(progress, branchId, levels[i].exercises)) {
      highest = levels[i + 1].level;
    } else {
      break;
    }
  }
  return highest;
}

/** Check if entire branch is complete (all levels) */
export function isBranchComplete(progress, branchId, branch) {
  // Support both old flat format and new nested format
  if (branch.levels) {
    return branch.levels.every((lvl) =>
      isLevelComplete(progress, branchId, lvl.exercises)
    );
  }
  // Flat fallback
  const exercises = branch.exercises || branch;
  const branchData = progress.branches[branchId];
  if (!branchData) return false;
  const list = Array.isArray(exercises) ? exercises : [];
  return list.every(
    (ex) => (branchData.bestScores[ex.id] ?? 0) >= BRIDGE_THRESHOLD
  );
}
