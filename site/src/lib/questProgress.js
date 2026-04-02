import { XP_LEVELS, BRIDGE_THRESHOLD, flattenExercises } from "./questData";
import { computeTotalXP } from "./questXP.js";

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
    // Backfill missing attemptId on legacy attempts
    let backfilled = false;
    for (const attempt of parsed.attempts) {
      if (!attempt.attemptId) {
        attempt.attemptId = crypto.randomUUID();
        backfilled = true;
      }
    }
    // Recompute XP from bestScores (migration + consistency)
    parsed.xp = computeTotalXP(parsed);
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

  // Update best score (keep highest)
  const prevBest = branchData.bestScores[exerciseId] ?? -1;
  const improved = percentage > prevBest;
  if (improved) {
    branchData.bestScores[exerciseId] = percentage;
  }

  // Recompute XP from best scores
  const prevXP = progress.xp;
  const prevLevel = getPlayerLevel(prevXP);
  progress.xp = computeTotalXP(progress);
  const newLevel = getPlayerLevel(progress.xp);

  const xpEarned = progress.xp - prevXP; // 0 if score didn't improve
  const levelUp = newLevel.level > prevLevel.level;

  // Record attempt (history only, not XP-relevant)
  progress.attempts.push({
    attemptId: crypto.randomUUID(),
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

// --- KV Sync ---

export async function fetchRemoteProgress(username) {
  try {
    const res = await fetch(`/api/quest-progress?user=${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // Offline or error — use localStorage only
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

  merged.xp = computeTotalXP(merged);
  return merged;
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
