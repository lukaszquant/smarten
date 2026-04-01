# Prompt: SmartEn Quest — Phase 4 Level Expansion

You are continuing work on **SmartEn Quest**, a gamified English learning section within the smarten app (a competition practice platform for Polish students). The MVP is complete and deployed. Your job is to implement Phase 4: expanding from 1 level to 5 levels per branch.

## Context

Read these files first to understand the current state:

1. **`QUEST_PHASE4_PLAN.md`** (repo root) — full plan with progress summary, data structures, difficulty progression, file changes, and verification checklist
2. **`~/.claude/plans/swirling-strolling-pony.md`** — original MVP architecture plan with detailed component specs and design decisions

Key code to read before making changes:
- `site/src/pages/quest/QuestHome.jsx` — main Quest UI (branch cards, XP bar, exercise list)
- `site/src/pages/quest/QuestExercise.jsx` — exercise player
- `site/src/lib/questProgress.js` — localStorage progress load/save/XP calculation
- `site/src/lib/questData.js` — XP constants, level thresholds
- `pub/konkursy/angielski/data/quest/index.json` — exercise index (currently flat, needs levels)
- Any existing exercise JSON (e.g. `pub/konkursy/angielski/data/quest/quest_vocab_01.json`) for format reference

## What to do

### Step 1 — Restructure index.json
Add a `levels` array to each branch in `index.json`. Move existing exercises under level 1. See QUEST_PHASE4_PLAN.md for the target schema.

### Step 2 — Author 36 new exercises
Create exercise JSONs for levels 2-5 (3 exercises per branch per level = 36 new files). Follow the exact format of existing exercises. Difficulty must increase per level — see the progression table in QUEST_PHASE4_PLAN.md. Target audience: a Polish 4th grader (age 10) with intermediate English.

### Step 3 — Update UI and logic
- **QuestHome.jsx**: Show levels as collapsible sections. Level N+1 locked until all exercises in level N scored >= 60%. Bridge links appear after level 5 completion only.
- **QuestExercise.jsx**: Show level context in header. Add "Next Exercise" button.
- **questProgress.js**: Add `isLevelComplete()` function. Update `isBranchComplete()` to check all 5 levels.
- **questData.js**: Raise XP level thresholds and add levels 6-8 (see plan for values).

### Step 4 — Verify
Run through the checklist in QUEST_PHASE4_PLAN.md. At minimum: `cd site && npm run build` must succeed, and `npm run dev` should show levels with correct locking behavior.

## Constraints

- Do NOT change scoring.js, renderers, App.jsx routing, or Layout.jsx
- Do NOT add AI-graded task types — use only: word_spelling, multiple_choice, open_cloze, true_false_ni, matching
- Do NOT change the exercise JSON format — must work with existing `scoreTest()`
- Existing localStorage progress must be preserved (bestScores is keyed by exercise ID, not level — this naturally works)
- Deploy command when ready: `cd site && npm run build && cd .. && npx wrangler pages deploy site/dist --project-name=smarten`
