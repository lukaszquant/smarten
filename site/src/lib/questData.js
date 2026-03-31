// XP constants
export const BASE_XP = 50;
export const FIRST_COMPLETION_BONUS = 10;
export const PERFECT_BONUS = 15;

// Player levels — each entry: minimum XP to reach that level
export const XP_LEVELS = [
  { level: 1, xp: 0, title: "Explorer" },
  { level: 2, xp: 100, title: "Learner" },
  { level: 3, xp: 250, title: "Student" },
  { level: 4, xp: 500, title: "Scholar" },
  { level: 5, xp: 800, title: "Adventurer" },
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
