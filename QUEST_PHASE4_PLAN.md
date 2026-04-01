# SmartEn Quest — Phase 4: Level Expansion (Revised Plan)

> **Status: IMPLEMENTED** (2026-04-01). All 36 new exercises authored, index restructured, UI updated, build passes. Not yet committed/deployed.

## Summary

Expand Quest from 9 exercises (1 level per branch) to 45 exercises (5 levels per branch) with progressive difficulty. Content authoring is the critical path. Code changes are modest: restructure the quest index to support nested levels, add shared traversal helpers, update QuestHome and QuestExercise to render and gate levels, and raise XP thresholds.

**What this plan does NOT change:** scoring.js, task renderers, App.jsx routing, Layout.jsx, the localStorage-only storage model, or Quest's separation from competition progress.

---

## MVP-to-Expansion Continuity

### What's deployed (Phases 1-3, completed 2026-03-31)

- 9 exercises across 3 branches (Vocabulary, Grammar, Reading), all level 1
- QuestHome (branch cards, XP bar, exercise list, bridge links) + QuestExercise (exercise player, scoring, XP)
- XP system with 5 player levels (Explorer → Adventurer)
- Quest-only user "Lidia" (sees only Quest routes)
- localStorage-only progress, separate from competition KV
- Bridge links shown when all exercises in a branch scored ≥ 60%

### Key files

| Purpose | Path |
|---------|------|
| Exercise data | `pub/konkursy/angielski/data/quest/` (9 JSONs + index.json) |
| Quest home page | `site/src/pages/quest/QuestHome.jsx` |
| Exercise player | `site/src/pages/quest/QuestExercise.jsx` |
| Progress logic | `site/src/lib/questProgress.js` |
| XP/level config | `site/src/lib/questData.js` |
| Routing & auth | `site/src/App.jsx` |
| Scoring | `site/src/lib/scoring.js` |
| Task renderers | `site/src/components/konkursy/` (TaskRenderer.jsx, MultipleChoice.jsx, WordSpelling.jsx, OpenCloze.jsx, TrueFalseNI.jsx, Matching.jsx, etc.) |

### Architecture decisions (carried forward, unchanged)

- localStorage only for quest progress (key: `smarten_quest_{username}`)
- Quest attempts do NOT appear in Progress.jsx
- Dark exercise cards on light page background (full theming remains deferred)
- Existing Layout wraps Quest pages (no dedicated QuestLayout)
- All task types auto-scored, no AI grading

---

## Implementation Phases

### Phase 4A — Content Authoring (critical path, gating dependency)

Everything else blocks on this. No code changes should begin until at least levels 1-3 content is authored and reviewed.

**Who authors:** Claude drafts exercises; the user reviews and calibrates for difficulty and language appropriateness for a Polish 4th grader (age 10).

**Process:**
1. Author level 2 exercises for all 3 branches (9 exercises)
2. User reviews level 2 for difficulty fit
3. Author level 3 exercises (9 exercises)
4. User reviews level 3 — this is the inflection point where content shifts from concrete/factual to inferential
5. Author levels 4-5 exercises (18 exercises) — see "Difficulty staircase" below for calibration guidance
6. User reviews levels 4-5 with extra scrutiny (see Critical Risks)

**File naming:** `quest_vocab_04.json` through `quest_vocab_15.json`, same pattern for `quest_grammar_*` and `quest_reading_*`. All in `pub/konkursy/angielski/data/quest/`.

**Exercise JSON format:** Unchanged from MVP. Each file follows:
```json
{
  "title": "Exercise Title",
  "type": "practice",
  "tasks": [{
    "id": "1",
    "type": "multiple_choice",
    "points": 6,
    "instruction": "Choose the correct answer.",
    "items": [
      { "id": "1.1", "stem": "...", "options": ["A) ...", "B) ...", "C) ..."], "answer": "B" }
    ]
  }]
}
```

**Task types available:** `word_spelling`, `multiple_choice`, `open_cloze`, `true_false_ni`, `matching`

#### Difficulty staircase

| Level | Vocabulary | Grammar | Reading |
|-------|-----------|---------|---------|
| 1 (done) | Common nouns: animals, school, kitchen | Present simple/continuous | Short factual passages (~80 words), T/F |
| 2 | Clothes, weather, travel, daily routines | Past simple, articles, there is/are | Longer passages (~120 words), T/F + matching |
| 3 | Phrasal verbs (common ones), feelings, descriptions | Mixed tenses (present vs past), comparatives/superlatives | Inference from context, multiple choice on passages |
| 4 | Word formation (common suffixes: -ful, -less, -ly, -tion) | Modals (can/could/must/should), first conditional | Short opinion texts, identifying author's view |
| 5 | Collocations (make/do, get phrases), common idioms | Second conditional, passive (present/past simple only) | Competition-style: longer texts (~150 words), mixed question types |

**Design decision on levels 4-5:** These levels are intentionally harder than typical grade-4 material. They serve as a bridge toward competition exercises. A child who completes level 5 should be ready for the easiest real competition tasks. However, this staircase must be validated: if the child stalls at level 3-4, the content should be softened rather than abandoning the progression. Levels 4-5 are explicitly marked as stretch goals for the learner — the bridge links after level 5 make this transition explicit.

### Phase 4B — Index Restructure + Shared Helpers

**Depends on:** Phase 4A (at least levels 1-3 content authored)

#### 1. Restructure index.json

Current flat structure (`branch.exercises[]`) becomes nested (`branch.levels[].exercises[]`):

```json
{
  "branches": [{
    "id": "vocabulary",
    "name": "Vocabulary",
    "color": "#f59e0b",
    "bridgeTypes": ["word_spelling", "word_formation"],
    "levels": [
      {
        "level": 1,
        "title": "Basic Words",
        "exercises": [
          { "id": "quest_vocab_01", "title": "Animals Around Us", "taskType": "word_spelling", "points": 6 },
          { "id": "quest_vocab_02", "title": "At School", "taskType": "word_spelling", "points": 6 },
          { "id": "quest_vocab_03", "title": "In the Kitchen", "taskType": "multiple_choice", "points": 6 }
        ]
      },
      {
        "level": 2,
        "title": "Everyday Life",
        "exercises": [...]
      }
    ]
  }]
}
```

#### 2. Add shared helpers (see Shared Helpers section below)

#### 3. Update questData.js — new XP levels

With 45 exercises, max possible XP = 45 × (50 + 10 + 15) = 3,375. New thresholds:

| Level | XP | Title |
|-------|-----|-------|
| 1 | 0 | Explorer |
| 2 | 100 | Learner |
| 3 | 300 | Student |
| 4 | 600 | Scholar |
| 5 | 1000 | Adventurer |
| 6 | 1500 | Champion |
| 7 | 2200 | Master |
| 8 | 3000 | Legend |

### Phase 4C — UI Updates

**Depends on:** Phase 4B (index restructured, helpers available)

#### QuestHome.jsx changes
- Render levels as collapsible sections within each branch card
- **Level unlock rule:** level N+1 unlocks when ALL exercises in level N have bestScore ≥ 60% (uses `isLevelComplete` helper)
- Locked levels shown grayed out with lock indicator
- Current level (highest unlocked incomplete) expanded by default; completed levels collapsed; locked levels collapsed and non-expandable
- Bridge links shown only after ALL levels in a branch are complete (uses `isBranchComplete` helper, which now checks all levels)

#### QuestExercise.jsx changes
- Show level context in header (e.g., "Vocabulary — Level 2")
- After scoring, show "Next Exercise" button:
  - If more exercises remain in this level → navigate to next exercise
  - If level complete → navigate back to QuestHome
  - Uses `getNextExercise` helper

### Phase 4D — Verify & Deploy

**Depends on:** Phase 4C complete, all 45 exercise JSONs authored

See expanded verification checklist below.

Deploy: `cd site && npm run build && cd .. && npx wrangler pages deploy site/dist --project-name=smarten`

---

## Shared Helpers / Data Access

The nested level structure introduces traversal logic needed by both QuestHome.jsx and QuestExercise.jsx. These helpers live in `site/src/lib/questProgress.js` (progress-related) and `site/src/lib/questData.js` (index-traversal).

### Add to questData.js

```
flattenExercises(branch)
  Input: a branch object from index.json (with .levels array)
  Returns: flat array of all exercise objects across all levels
  Used by: isBranchComplete, anywhere that needs all exercises for a branch

getExerciseLevel(branch, exerciseId)
  Input: branch object, exercise ID
  Returns: level number the exercise belongs to
  Used by: QuestExercise (header display)

getNextExercise(branch, currentExerciseId)
  Input: branch object, current exercise ID
  Returns: { exerciseId, branchId } of next exercise in the level, or null if level is done
  Used by: QuestExercise (next-exercise navigation)
```

### Add to questProgress.js

```
isLevelComplete(progress, branchId, levelExercises)
  Input: progress object, branch ID, array of exercise objects for one level
  Returns: true if all exercises in the level have bestScore >= BRIDGE_THRESHOLD
  Used by: QuestHome (unlock gating), isBranchComplete

getHighestUnlockedLevel(progress, branchId, levels)
  Input: progress object, branch ID, array of level objects from index.json
  Returns: level number of highest unlocked level (1-based; level 1 is always unlocked)
  Used by: QuestHome (default expansion state)
```

### Modify in questProgress.js

```
isBranchComplete(progress, branch, exercises)
  Current: checks flat exercises array
  Change: accepts branch object with .levels, checks ALL levels complete via isLevelComplete
  Or: caller passes flattenExercises(branch) — either approach works, but be consistent
```

---

## localStorage Continuity

**No migration required.** The existing `bestScores` map is keyed by exercise ID (`quest_vocab_01`, etc.), not by level. Adding levels to index.json does not change how scores are stored or looked up.

### Edge cases for existing users with partial level 1 progress

| Scenario | Behavior |
|----------|----------|
| User has completed 2 of 3 level 1 exercises at ≥ 60% | Level 1 shows as in-progress (expanded). Level 2 locked. XP preserved. |
| User has completed all 3 level 1 exercises at ≥ 60% | Level 1 complete (collapsed). Level 2 unlocked (expanded). XP preserved. |
| User has completed all 3 level 1 exercises but one is below 60% | Level 1 in-progress. Level 2 locked. User must re-attempt the low-scoring exercise. |
| User has 0 progress | Level 1 unlocked (expanded). All others locked. |
| Bridge links were previously visible (all level 1 at ≥ 60%) | Bridge links now hidden until ALL 5 levels complete. This is a deliberate behavior change — the bridge threshold is raised. |

**Note on bridge link regression:** Users who previously saw bridge links will lose them until they complete levels 2-5. This is acceptable because (a) the only quest-only user is Lidia who hasn't completed all branches yet, and (b) full-app users already have direct access to `/cwiczenia` routes.

---

## Critical Risks

### 1. Content quality and difficulty calibration (HIGH)
The hardest part of Phase 4. 36 new exercises must be appropriately difficult for a Polish 10-year-old. Levels 4-5 intentionally stretch beyond typical grade-4 material as a competition bridge, but if they're too hard the child will disengage.

**Mitigation:** Author and review in batches (levels 2-3 first, then 4-5). Deploy incrementally — levels 2-3 can ship before 4-5 are ready. Observe the child's engagement at each stage.

### 2. Level 4-5 difficulty jump (MEDIUM)
Conditionals, passives, reported speech, word formation, and idioms are B1-level grammar. A strong A2 learner can handle exposure to these, but the exercises must scaffold carefully (e.g., multiple choice with clear distractors, not open production).

**Mitigation:** Keep levels 4-5 receptive (recognition/selection tasks: multiple_choice, matching, true_false_ni). Avoid production-heavy types (word_spelling, open_cloze) for B1 grammar until the child demonstrates readiness. This can be decided per-exercise during content review.

### 3. Bridge link behavior change (LOW)
Users who had bridge links visible after level 1 will lose them. See localStorage Continuity section.

**Mitigation:** Only one quest-only user exists (Lidia). Full-app users have direct access to competition practice. No user communication needed.

---

## Files Changed

| File | Change |
|------|--------|
| `pub/konkursy/angielski/data/quest/index.json` | Restructure: flat exercises → nested levels |
| `pub/konkursy/angielski/data/quest/quest_*_04.json` through `quest_*_15.json` | 36 new exercise files |
| `site/src/lib/questData.js` | New XP thresholds (8 levels). Add `flattenExercises`, `getExerciseLevel`, `getNextExercise` helpers. |
| `site/src/lib/questProgress.js` | Add `isLevelComplete`, `getHighestUnlockedLevel`. Update `isBranchComplete` for nested levels. |
| `site/src/pages/quest/QuestHome.jsx` | Level-based rendering, unlock gating, collapsible sections, bridge links after level 5 |
| `site/src/pages/quest/QuestExercise.jsx` | Level context header, next-exercise navigation |

### Files NOT changed

| File | Why |
|------|-----|
| `site/src/lib/scoring.js` | Works with standard exercise JSON format, no changes needed |
| `site/src/components/konkursy/*` | Same 5 task types, no theming changes |
| `site/src/App.jsx` | `/quest/:branch/:id` already handles any exercise ID |
| `site/src/components/Layout.jsx` | No refactor needed |

---

## Verification Checklist

### Core functionality
- [ ] `npm run dev` → `/quest` shows levels within each branch
- [ ] Level 1 exercises render and score correctly (regression)
- [ ] All 36 new exercises load and score correctly
- [ ] XP accumulates across all levels; new level titles (Champion, Master, Legend) display

### Level unlock gating
- [ ] Level 2 locked when any level 1 exercise is below 60% or unattempted
- [ ] Level 2 unlocks when ALL level 1 exercises scored ≥ 60%
- [ ] Gating works correctly at each level boundary (2→3, 3→4, 4→5)
- [ ] Locked levels appear grayed with lock indicator, cannot be expanded

### Expansion state
- [ ] Current (highest unlocked incomplete) level expanded by default
- [ ] Completed levels collapsed by default
- [ ] Locked levels collapsed and non-expandable
- [ ] User can manually expand/collapse completed levels

### Navigation
- [ ] "Next Exercise" after completing an exercise navigates to next in level
- [ ] "Next Exercise" at end of level navigates back to QuestHome
- [ ] Level header shows correct context (e.g., "Grammar — Level 3")

### Bridge links and branch completion
- [ ] Bridge links hidden when only level 1 complete
- [ ] Bridge links appear only after all 5 levels in branch scored ≥ 60%
- [ ] Bridge links navigate to correct `/cwiczenia/:type` routes

### Existing progress continuity
- [ ] User with partial level 1 progress: scores preserved, levels display correctly
- [ ] User with full level 1 complete: level 2 auto-unlocked
- [ ] XP from previous sessions preserved and displayed correctly
- [ ] No localStorage migration errors or data loss

### Users and access
- [ ] Quest-only user (Lidia) sees level structure correctly
- [ ] Full-app users (Tadzio, Zosia) see Quest alongside competition routes
- [ ] `npm run build` succeeds with no errors
