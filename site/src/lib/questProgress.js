import { STAR_TITLES, STARS_TO_UNLOCK } from "./questData";
import { computeTotalStars, computeLevelStars, percentageToStars } from "./questStars.js";

const STORAGE_PREFIX = "smarten_quest_";

function storageKey(username) {
  return `${STORAGE_PREFIX}${username || "default"}`;
}

const EMPTY_PROGRESS = {
  stars: 0,
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
    // Backfill missing attemptId on legacy attempts
    let backfilled = false;
    for (const attempt of parsed.attempts) {
      if (!attempt.attemptId) {
        attempt.attemptId = crypto.randomUUID();
        backfilled = true;
      }
    }
    // Migrate: remove old xp field, compute stars
    delete parsed.xp;
    parsed.stars = computeTotalStars(parsed);
    // Persist backfilled IDs so they stay stable across loads
    if (backfilled) {
      try { localStorage.setItem(storageKey(username), JSON.stringify(parsed)); } catch {}
    }
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

export function getPlayerTitle(totalStars) {
  let current = STAR_TITLES[0];
  let next = STAR_TITLES[1] || null;
  for (let i = STAR_TITLES.length - 1; i >= 0; i--) {
    if (totalStars >= STAR_TITLES[i].stars) {
      current = STAR_TITLES[i];
      next = STAR_TITLES[i + 1] || null;
      break;
    }
  }
  const starsInLevel = totalStars - current.stars;
  const starsForNext = next ? next.stars - current.stars : 0;
  return {
    title: current.title,
    starsInLevel,
    starsForNext,
    progress: next ? starsInLevel / starsForNext : 1,
  };
}

export function processResult(progress, branch, exerciseId, score, maxScore) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const branchData = progress.branches[branch];

  // Update best score (keep highest)
  const prevBest = branchData.bestScores[exerciseId] ?? -1;
  const improved = percentage > prevBest;
  if (improved) {
    branchData.bestScores[exerciseId] = percentage;
  }

  // Recompute stars from best scores
  const prevStars = progress.stars;
  const prevTitle = getPlayerTitle(prevStars);
  progress.stars = computeTotalStars(progress);
  const newTitle = getPlayerTitle(progress.stars);

  const starsEarned = progress.stars - prevStars; // 0 if score didn't improve
  const titleUp = newTitle.title !== prevTitle.title;
  const exerciseStars = percentageToStars(percentage);

  // Record attempt
  progress.attempts.push({
    attemptId: crypto.randomUUID(),
    exerciseId,
    branch,
    date: new Date().toISOString(),
    score,
    maxScore,
    percentage,
    starsEarned,
  });

  return { starsEarned, exerciseStars, titleUp, newTitle };
}

/** Check if a level has enough stars to unlock the next */
export function isLevelComplete(progress, branchId, levelExercises) {
  const branchData = progress.branches[branchId];
  if (!branchData) return false;
  return computeLevelStars(branchData.bestScores, levelExercises) >= STARS_TO_UNLOCK;
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

// --- KV Sync ---

export async function fetchRemoteProgress(username) {
  try {
    const res = await fetch(`/api/quest-progress?user=${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function pushRemoteProgress(username, progress) {
  return fetch("/api/quest-progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: username, progress }),
  })
    .then((r) => r.ok ? r.json() : null)
    .catch(() => null);
}

export function mergeProgress(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const merged = structuredClone(local);

  // Merge bestScores: highest per exercise
  for (const branchId of new Set([
    ...Object.keys(local.branches),
    ...Object.keys(remote.branches || {}),
  ])) {
    if (!merged.branches[branchId]) {
      merged.branches[branchId] = remote.branches[branchId];
      continue;
    }
    const remoteScores = remote.branches[branchId]?.bestScores || {};
    const mergedScores = merged.branches[branchId].bestScores;
    for (const [exId, score] of Object.entries(remoteScores)) {
      if ((mergedScores[exId] ?? -1) < score) {
        mergedScores[exId] = score;
      }
    }
  }

  // Merge attempts: union by attemptId
  const seen = new Set((local.attempts || []).map((a) => a.attemptId));
  for (const attempt of remote.attempts || []) {
    if (attempt.attemptId && !seen.has(attempt.attemptId)) {
      merged.attempts.push(attempt);
    }
  }

  merged.stars = computeTotalStars(merged);
  return merged;
}

/** Check if entire branch is complete (all levels have enough stars) */
export function isBranchComplete(progress, branchId, branch) {
  if (branch.levels) {
    return branch.levels.every((lvl) =>
      isLevelComplete(progress, branchId, lvl.exercises)
    );
  }
  const exercises = branch.exercises || branch;
  const branchData = progress.branches[branchId];
  if (!branchData) return false;
  const list = Array.isArray(exercises) ? exercises : [];
  return computeLevelStars(branchData.bestScores, list) >= STARS_TO_UNLOCK;
}
