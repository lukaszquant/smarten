# Quest KV Sync Implementation Review

Status: Request changes

## Verdict

The implementation covers the main plan items: shared XP computation, server-side merge, basic server-side normalization, QuestHome remote fetch, and QuestExercise remote push. The remaining issues are in sync behavior and data normalization rather than missing scaffolding. The current code is not ready to treat KV sync as authoritative across devices.

## Findings

### 1. High — QuestHome does not push merged local-plus-remote state back to KV

Description:

When QuestHome loads, it reads local progress, fetches remote progress, merges them client-side, updates React state, and saves the merged snapshot to localStorage. But if remote data already exists, it does not push that merged snapshot back to KV. As a result, local-only progress from an offline device is not uploaded during the next QuestHome load unless the user later completes another exercise.

Why it matters:

- The sync is not self-healing on the next app open.
- A device can successfully recover remote progress without actually publishing its own previously offline work.
- Cross-device state can stay stale indefinitely if the user only visits QuestHome.

Suggested fix:

After merging local and remote on QuestHome, push the merged snapshot to the server and persist the server-returned version locally.

### 2. Medium — Legacy attempts without attemptId can still be duplicated in KV

Description:

The local migration recomputes XP on load, but it does not assign attemptId values to pre-existing attempts loaded from localStorage. The server normalizes missing attemptId values by generating fresh UUIDs during PUT. That means the same legacy attempt can be uploaded multiple times as distinct server-side records if the local copy still lacks IDs.

Why it matters:

- Attempt dedup only works once every persisted local attempt has a stable ID.
- Historical attempt logs in KV can grow with duplicates even though bestScores remain correct.

Suggested fix:

Backfill missing attemptId values locally during loadProgress, then save the normalized progress back to localStorage. Also make sure first-time sync paths persist the canonical PUT response rather than ignoring server normalization.

### 3. Medium — XP feedback on QuestExercise is computed before the server-merged state is known

Description:

QuestExercise computes xpEarned and levelUp from the local snapshot before the PUT completes. If the device is stale and the server already has better progress, the eventual merged server state can differ from the local pre-merge result, but the visible XP badge and level-up feedback are not corrected.

Why it matters:

- A user can see XP gain for an exercise already completed on another device.
- The UI can temporarily report a level-up that the merged state does not support.

Suggested fix:

Either fetch and merge remote progress before scoring on the exercise page, or recalculate the visible reward from the merged PUT response before finalizing the feedback banner.

### 4. Low — The server preserves unnormalized existing KV data

Description:

Incoming payloads are normalized before merge, but the existing KV snapshot is read raw and merged as-is. GET also returns raw KV data. If malformed branch keys, exercise keys, or numeric values ever land in KV, the endpoint can keep serving and preserving them.

Why it matters:

- Server-side normalization is incomplete.
- Bad data can persist across later writes instead of being cleaned up.

Suggested fix:

Normalize the existing KV snapshot before merge, and return normalized data from GET as well.

## What Looks Correct

- XP is now derived from bestScores via the shared questXP helper.
- Attempts are no longer the source of truth for XP.
- The server recomputes XP instead of trusting client-sent xp.
- The server merge preserves the highest bestScore per exercise.
- Attempt dedup is based on attemptId rather than timestamp-only identity.

## Residual Design Risk

The Cloudflare KV write path is still a non-atomic read-merge-write. That means simultaneous writes can race and one request can still overwrite another request's merge result. This appears to be an accepted limitation of the chosen storage model rather than a deviation from the implemented plan, but it remains a real concurrency risk.

## Recommendation

Request changes.

The implementation is close, but I would fix QuestHome upload behavior first, then close the attemptId migration gap, and finally make the exercise-page feedback authoritative from the merged server result.