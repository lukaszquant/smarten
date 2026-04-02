# Quest KV Sync Plan Review (Revised)

Status: Request changes

## Verdict

Phase 1 resolves the original XP model mismatch, and Phase 2 is materially better than the original blind-overwrite design. The plan is still not ready to approve because the proposed server-side merge is a non-atomic read-merge-write on Cloudflare KV, so concurrent writes can still lose progress. A few secondary issues remain around attempt-history sync, validation depth, and duplicated XP logic.

## Findings

### 1. High — Server-side merge is not actually conflict-free on Cloudflare KV

Description:

The revised PUT path fixes the simple stale-device overwrite case by merging incoming bestScores with the stored snapshot. But the implementation is still:

1. read current KV value
2. merge in memory
3. write merged snapshot back

On Cloudflare KV this is not atomic. If two devices submit around the same time, both requests can read the same old value, compute different merged snapshots, and the later PUT can still drop the earlier write. That means the plan's "highest-score-wins is CRDT-like, no version/timestamp needed" claim is too strong for the actual storage primitive.

Suggested fix:

Use an append-only attempt or event API, or move the authoritative merge to a store with compare-and-swap or transactional semantics. If KV must stay the store, document the residual race clearly and add a retry and re-read loop as a best-effort mitigation rather than calling it conflict-free.

### 2. Medium — Attempt IDs are added, but server-side sync still drops attempt history

Description:

The plan adds attemptId and client-side attempt dedup, which is the right identity model. But the server-side merge example only merges branches and bestScores. It starts from the incoming snapshot and does not union attempts from existing and incoming. In practice that means PUT can still replace remote attempt history with whatever happens to be on the writing device, so attemptId never protects the authoritative write path.

Suggested fix:

Either merge attempts server-side by attemptId, or explicitly state that attempts are local-only and should not be stored in KV at all. The current hybrid plan keeps them in the payload but does not preserve them.

### 3. Medium — Server-side validation is still too shallow

Description:

The revised plan does add an allowlist for users and a basic progress shape check, and it correctly recomputes XP on the server. That addresses the original concern in principle, but the validation described is still too weak to make the payload safe:

- bestScores values are not constrained to finite numbers in the 0-100 range
- branch and exercise keys are not validated or normalized
- attempts are not validated
- malformed numeric values can still produce incorrect derived XP

Suggested fix:

Normalize the entire payload server-side before merge. Coerce or reject invalid percentages, initialize missing branches to empty objects, and recompute all derived fields from the normalized structure rather than from raw client data.

### 4. Low — computeTotalXP is duplicated client-side and server-side

Description:

The revised design now depends on the same XP formula in two places. That is workable, but it creates a drift risk the next time the XP model changes. One side can silently diverge from the other even though the plan treats the server response as canonical.

Suggested fix:

Extract one shared pure helper used by both client and Pages Functions, or add a small contract test that verifies both implementations return the same XP for representative snapshots.

### 5. Low — Phase 1 migration can still surprise the user, even if it is acceptable

Description:

The migration story is now explicit and internally consistent: recomputing XP from bestScores may lower XP and level for previously repeated exercises. That is acceptable given the stated product decision, but it is still a deliberate user-visible downgrade.

Suggested fix:

Ship Phase 1 with a short release note or one-time banner for the Quest user, or at minimum note this in deployment communications so the level drop is not mistaken for data loss.

## Original Review Concerns

Resolved:

- #1 XP recomputation mismatch: resolved. The proposed computeTotalXP formula matches what processResult would produce if each exercise contributed only its best single-attempt score.
- #5 Pattern divergence documentation: resolved. The plan now explicitly explains why Quest uses snapshot-with-merge instead of the competition results append model.
- #6 Dynamic branch key iteration: resolved. The client merge uses the union of branch keys, and the server merge preserves unknown branches from either side.

Partially resolved:

- #2 Full-document PUT stale overwrite: resolved for the common stale-device case, but still open for concurrent writes because the KV merge is a non-atomic read-merge-write.
- #3 Weak dedup identity: partially resolved. attemptId is the right fix, but the server merge path does not currently preserve or deduplicate attempts.
- #4 No server-side validation: partially resolved. The allowlist and shape check are useful, but the normalization and validation described are not yet strong enough.

## Phase Ordering

Phase 1 is safe to ship on its own before Phase 2. The transition is straightforward because load-time recomputation makes the new XP model authoritative immediately, without any remote dependency. The main consequence is intentional: existing XP and level can drop to the new best-score-only value. The only other transition risk is a temporarily stale browser tab still running the old bundle until reload, which is minor.

## Answer To The Prompt's Key Questions

### Does Phase 1 correctly resolve the XP mismatch?

Yes. The new per-exercise formula is consistent with the desired best-score-only model, and xpEarned as a recomputed delta behaves correctly for improved versus non-improved retries. The only surprising migration effect is the intentional XP and level drop for historical grind XP.

### Does server-side merge on PUT resolve the stale-overwrite problem?

Mostly, but not completely. It resolves the original sequential stale-device overwrite problem for bestScores. It does not make writes conflict-free on KV, so simultaneous updates can still race and lose one side's progress.

### Are remaining review concerns #3-#6 addressed?

Partially. attemptId, documentation, and dynamic branch handling are improved; validation is only partially addressed; attempt history sync is still incomplete on the server.

### Is the phase ordering safe?

Yes. Phase 1 can be deployed independently. The main visible effect is the one-time XP and level recalculation.

### Did the revision introduce any new concerns?

Yes:

- the plan now relies on duplicated computeTotalXP logic on client and server
- the return-merged-from-PUT pattern only works if the server response is truly canonical, which is not quite true while attempt history and validation are incomplete
- the new CRDT-like language overstates what a KV-backed read-merge-write can guarantee

## Recommendation

Request changes.

The revised plan is substantially better and fixes the original XP model mismatch. I would approve it after the plan either:

1. switches sync to an append-only or transactional merge model, or
2. explicitly accepts KV's concurrent-write limitation and narrows the promise of the feature, while also fixing server-side attempt merging and validation depth.