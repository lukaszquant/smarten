# Review Prompt: Quest KV Sync Plan (Revised)

You are reviewing a revised plan to add cross-device progress sync to SmartEn Quest, a gamified English learning app for children. The plan is in `QUEST_KV_SYNC_PLAN.md` in the repo root.

A previous version of this plan was reviewed (`QUEST_KV_SYNC_REVIEW.md`) and received "Request changes" with two high-severity issues:
1. XP recomputation mismatch — the live XP model (accumulate per attempt) didn't match the sync merge model (derive from best scores)
2. Full-document PUT could overwrite newer remote data from a stale device

The revised plan adopts Option C from that review: simplify the XP model first (Phase 1) so XP depends only on best scores, then add KV sync (Phase 2) with server-side merge.

## Context

SmartEn is a Cloudflare Pages app (React 19 + Vite 6) with a serverless API (`site/functions/api/`). It uses Cloudflare KV for competition results. Quest progress is currently localStorage-only. Users are hardcoded (no server auth) — there are only 3 users.

## What to evaluate

Read `QUEST_KV_SYNC_PLAN.md` and evaluate whether the revised plan adequately addresses the concerns raised in `QUEST_KV_SYNC_REVIEW.md`. Specifically:

1. **Does Phase 1 (XP simplification) correctly resolve the XP mismatch?** Check that the new `computeTotalXP()` formula matches what `processResult()` would produce for single-attempt best scores. Are there edge cases where the migration (recomputing on load) could produce surprising results?

2. **Does server-side merge on PUT resolve the stale-overwrite problem?** The server now reads existing KV, merges (highest score wins), and stores the merged result. Is this sufficient, or are there still race conditions?

3. **Are the remaining review concerns (#3-#6) addressed?** Check attemptId for dedup, server-side validation, pattern divergence documentation, and dynamic branch key iteration.

4. **Phase ordering.** Is it safe to deploy Phase 1 (XP change) independently before Phase 2 (KV sync)? Are there any issues with the transition?

5. **Anything new introduced by the revision that wasn't in the original?** The server-side merge, `computeTotalXP` duplication (client + server), return-merged-from-PUT pattern — do these introduce new concerns?

## Key files to read

- `QUEST_KV_SYNC_PLAN.md` — the revised plan under review
- `QUEST_KV_SYNC_REVIEW.md` — the previous review (to check concerns are addressed)
- `site/src/lib/questProgress.js` — current progress logic
- `site/src/lib/questData.js` — XP constants
- `site/src/pages/quest/QuestExercise.jsx` — where XP is displayed after scoring
- `site/functions/api/results.js` — existing KV API pattern for comparison

## Output format

Return a structured review with:
- **Approve / Approve with changes / Request changes**
- For each remaining or new concern: severity (high/medium/low), description, and suggested fix
- Confirm which original review concerns are resolved vs. still open
