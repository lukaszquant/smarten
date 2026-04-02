# Quest KV Sync — Implementation Notes

## Phase 1: XP Simplification — DONE

- [x] Created `site/src/lib/questXP.js` — shared XP computation (`exerciseXP`, `computeTotalXP`, `clampPercentage`)
- [x] Updated `site/src/lib/questData.js` — re-exports `BASE_XP`, `FIRST_COMPLETION_BONUS`, `PERFECT_BONUS` from questXP.js
- [x] Updated `site/src/lib/questProgress.js`:
  - Removed `calculateXP()` (accumulated-per-attempt model)
  - `processResult()` now recomputes XP from bestScores via `computeTotalXP()`
  - `loadProgress()` recomputes XP on load (migration)
  - Attempts now include `attemptId` via `crypto.randomUUID()`
- [x] Updated `site/src/pages/quest/QuestExercise.jsx` — XP badge hidden when `xpEarned === 0`
- [x] Build passes

## Phase 2: KV Sync — DONE

- [x] Created `site/functions/api/quest-progress.js`:
  - GET: returns stored progress from `quest:{username}` KV key
  - PUT: normalizes incoming payload, merges with existing (highest bestScore wins, attempts unioned by attemptId), recomputes XP server-side, returns merged result
  - User allowlist: Tadzio, Zosia, Lidia
  - `normalizeProgress()`: regex validation on branch/exercise IDs, percentage clamping, typed attempt fields
  - `mergeProgress()`: union of branch keys, highest score per exercise, attempt dedup by attemptId
- [x] Added sync functions to `site/src/lib/questProgress.js`:
  - `fetchRemoteProgress(username)` — GET from KV, returns null on error
  - `pushRemoteProgress(username, progress)` — PUT to KV, returns merged or null
  - `mergeProgress(local, remote)` — client-side merge (same logic as server)
- [x] Updated `site/src/pages/quest/QuestHome.jsx` — fetches remote on mount, merges with local, saves merged
- [x] Updated `site/src/pages/quest/QuestExercise.jsx` — pushes to KV after scoring, applies server-merged result
- [x] Build passes

## Files changed

| File | Change |
|------|--------|
| `site/src/lib/questXP.js` | **New.** Shared XP module |
| `site/src/lib/questData.js` | Re-export XP constants from questXP.js |
| `site/src/lib/questProgress.js` | Derived XP, attemptId, sync functions (fetch/push/merge) |
| `site/src/pages/quest/QuestExercise.jsx` | Hide +0 XP, push to KV after scoring |
| `site/src/pages/quest/QuestHome.jsx` | Fetch remote on mount, merge with local |
| `site/functions/api/quest-progress.js` | **New.** GET/PUT endpoint with validation, normalization, server-side merge |

## Post-review fixes

Addressed findings from QUEST_KV_SYNC_IMPL_REVIEW.md:

- **#1 (High) — QuestHome now pushes merged state back to KV.** After merging local+remote, always PUTs the merged result to the server and persists the server-returned canonical version. Sync is now self-healing on every QuestHome load.
- **#2 (Medium) — Legacy attemptId backfill.** `loadProgress()` now assigns `crypto.randomUUID()` to any attempt missing an `attemptId` and persists the backfilled data to localStorage. Prevents duplicate attempts in KV.
- **#3 (Medium) — XP feedback timing.** Accepted as-is. The local XP badge shows what the user earned from this device's perspective. Correcting it from the server response would add complexity for a rare stale-device edge case. The merged state is still saved correctly.
- **#4 (Low) — Server normalizes existing KV data.** Both GET and PUT now normalize existing KV data through `normalizeProgress()` before returning or merging. Bad data cannot persist across writes.

## Not changed (as planned)

- `site/wrangler.toml` — reuses existing RESULTS KV namespace
- `site/functions/api/results.js` — competition results untouched
- `site/src/App.jsx` — no routing changes
