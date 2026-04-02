// XP constants — re-exported from shared module (used by both client and server)
export { BASE_XP, FIRST_COMPLETION_BONUS, PERFECT_BONUS } from "./questXP.js";

// Player levels — each entry: minimum XP to reach that level
export const XP_LEVELS = [
  { level: 1, xp: 0, title: "Explorer" },
  { level: 2, xp: 100, title: "Learner" },
  { level: 3, xp: 300, title: "Student" },
  { level: 4, xp: 600, title: "Scholar" },
  { level: 5, xp: 1000, title: "Adventurer" },
  { level: 6, xp: 1500, title: "Champion" },
  { level: 7, xp: 2200, title: "Master" },
  { level: 8, xp: 3000, title: "Legend" },
];

// Bridge threshold — minimum % on ALL exercises in a branch to show graduation link
export const BRIDGE_THRESHOLD = 60;

// Task type display names (for bridge links)
export const TYPE_LABELS = {
  word_spelling: "Word Spelling",
  word_formation: "Word Formation",
  multiple_choice: "Multiple Choice",
  open_cloze: "Open Cloze",
  true_false_ni: "True / False / NI",
  matching: "Matching",
};

// --- Shared helpers for nested level traversal ---

/** Flatten all exercises across all levels in a branch */
export function flattenExercises(branch) {
  if (!branch.levels) return branch.exercises || [];
  return branch.levels.flatMap((lvl) => lvl.exercises);
}

/** Find which level number an exercise belongs to */
export function getExerciseLevel(branch, exerciseId) {
  if (!branch.levels) return 1;
  for (const lvl of branch.levels) {
    if (lvl.exercises.some((ex) => ex.id === exerciseId)) return lvl.level;
  }
  return 1;
}

/** Get the next exercise in the same level, or null if at end of level */
export function getNextExercise(branch, currentExerciseId) {
  if (!branch.levels) return null;
  for (const lvl of branch.levels) {
    const idx = lvl.exercises.findIndex((ex) => ex.id === currentExerciseId);
    if (idx !== -1 && idx < lvl.exercises.length - 1) {
      return { exerciseId: lvl.exercises[idx + 1].id, branchId: branch.id };
    }
    if (idx !== -1) return null; // last exercise in level
  }
  return null;
}
