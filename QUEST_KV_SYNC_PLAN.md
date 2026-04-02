# Quest KV Sync — Cross-Device Progress Plan (v3)

> **Status:** PLANNED (2026-04-01). Not yet implemented.
>
> **Revision history:**
> - v1: Initial plan with full-document PUT and client-side merge
> - v2: Adopted Option C (simplify XP first), added server-side merge
> - v3: Addressed second review — narrowed concurrency promise, added server-side attempt merging and deeper validation

## Problem

Quest progress is localStorage-only (`smarten_quest_{username}`). If a user switches devices or browsers, their XP, scores, and level unlocks are lost.

## Goal

1. **Simplify XP model** — XP is derived from best scores only, not accumulated per attempt. Retrying an exercise improves your best score (and thus XP) but doesn't add XP on top.
2. **Add KV sync** — persist quest progress to Cloudflare KV for cross-device continuity.

---

## Phase 1: Simplify XP Model

### Why first

The current XP model awards XP on every attempt (`progress.xp += xpEarned`). This makes XP an accumulated counter that can't be reconstructed from best scores alone, which makes cross-device merge ambiguous. Simplifying XP to be a derived value from best scores makes merge trivial: take the highest score per exercise, recompute XP.

### Current behavior (to change)

In `questProgress.js` `processResult()`:
- Every attempt earns `floor(BASE_XP * percentage / 100)` XP
- First attempt adds `FIRST_COMPLETION_BONUS` (+10)
- Perfect score adds `PERFECT_BONUS` (+15)
- XP accumulates: `progress.xp += xpEarned` (line 87)
- Retrying an exercise at 80% repeatedly gives 40 XP each time

### New behavior

- XP is **not stored** — it's computed on the fly from `bestScores`
- Each exercise contributes: `floor(BASE_XP * bestPercentage / 100) + FIRST_COMPLETION_BONUS + (bestPercentage === 100 ? PERFECT_BONUS : 0)`
- Retrying an exercise only increases XP if the new score beats the previous best
- The `xp` field in the progress object becomes a derived cache, recomputed on every load and after every submission

### XP formula per exercise

```
exerciseXP(percentage) = floor(50 * percentage / 100) + 10 + (percentage === 100 ? 15 : 0)
```

Examples:
| Best score | XP from that exercise |
|------------|----------------------|
| 0% | 10 (completion bonus only) |
| 50% | 35 (25 base + 10 bonus) |
| 80% | 50 (40 base + 10 bonus) |
| 100% | 75 (50 base + 10 bonus + 15 perfect) |

Max total XP: 45 exercises × 75 = 3,375. Current XP level thresholds (Explorer→Legend, 0→3000) remain appropriate.

### Migration of existing data

Lidia may have accumulated XP from retries that exceeds what best-scores-only would produce. On next load after this change, `computeTotalXP()` will recompute from bestScores. Her XP may drop and her player level may decrease.

**This is acceptable** because:
- She's the only quest user and has just started (progress was recently reset)
- The old model unintentionally rewarded grinding, not mastery
- The new model is more honest: your level reflects your best performance

### Shared XP computation module

Both the client and the server need to compute XP from bestScores using the same formula. To avoid drift, extract this into a shared pure module:

**New file: `site/src/lib/questXP.js`**
```javascript
// Shared XP computation — used by both client (questProgress.js) and server (quest-progress.js)
export const BASE_XP = 50;
export const FIRST_COMPLETION_BONUS = 10;
export const PERFECT_BONUS = 15;

export function exerciseXP(percentage) {
  const pct = clampPercentage(percentage);
  return Math.floor(BASE_XP * (pct / 100)) + FIRST_COMPLETION_BONUS + (pct === 100 ? PERFECT_BONUS : 0);
}

export function computeTotalXP(progress) {
  let xp = 0;
  for (const branchData of Object.values(progress?.branches || {})) {
    for (const percentage of Object.values(branchData?.bestScores || {})) {
      xp += exerciseXP(percentage);
    }
  }
  return xp;
}

function clampPercentage(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
```

`questData.js` re-exports the constants from `questXP.js` so existing imports continue to work. The server endpoint imports `questXP.js` directly (Cloudflare Pages Functions can import from `site/src/lib/`).

### Changes to questProgress.js

**Remove:** `progress.xp += xpEarned` accumulation in `processResult()`

**Import:** `computeTotalXP` from `questXP.js` (instead of defining it locally)

**Modify `processResult()`:**
```javascript
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
    exerciseId, branch,
    date: new Date().toISOString(),
    score, maxScore, percentage,
    xpEarned,
  });

  return { xpEarned, levelUp, newLevel };
}
```

**Modify `loadProgress()`:** After loading from localStorage, recompute XP:
```javascript
// At end of loadProgress, before return:
parsed.xp = computeTotalXP(parsed);
return parsed;
```

This ensures existing stored data is migrated transparently on next load.

### Changes to QuestExercise.jsx

Hide the XP badge when score didn't improve (avoids showing "+0 XP"):

```jsx
{xpInfo && xpInfo.xpEarned > 0 && (
  <div style={styles.xpEarned}>
    <span style={styles.xpBadge}>+{xpInfo.xpEarned} XP</span>
    {xpInfo.levelUp && (
      <span style={styles.levelUpBadge}>Level Up! {xpInfo.newLevel.title}</span>
    )}
  </div>
)}
```

### Verification (Phase 1 only)

- [ ] `npm run build` succeeds
- [ ] Complete a new exercise → XP increases by the formula amount
- [ ] Retry the same exercise with a lower score → XP unchanged, "+0 XP" not shown
- [ ] Retry the same exercise with a higher score → XP increases by the delta
- [ ] Existing Lidia progress (if any): XP recomputed on load, no crash
- [ ] Player level reflects recomputed XP correctly
- [ ] Level unlock gating unaffected (depends on bestScores, not XP)

---

## Phase 2: KV Sync

**Depends on:** Phase 1 complete (XP is derived from bestScores).

### Design

With XP derived from bestScores, the merge problem reduces to: **take the highest bestScore per exercise across both sources**. XP, player level, and level unlocks all follow automatically.

### Concurrency model and known limitations

The server performs a read-merge-write on Cloudflare KV, which is **not atomic**. If two devices submit simultaneously, both read the same old value, compute different merges, and the later write overwrites the earlier one. This means a concurrent write can theoretically lose one side's score improvements.

**Why this is acceptable:** SmartEn has 3 users (children), each using one device at a time. Simultaneous writes from two devices for the same user are not a realistic scenario. If this ever becomes a concern, the fix is to move to a store with compare-and-swap (e.g., Durable Objects) or an append-only event model. For now, the residual race is documented and accepted.

**Self-healing property:** Even if a concurrent write drops a score, the next QuestHome load (or next exercise submission) from either device will merge again and recover the lost score — provided one device still has it in localStorage. Data is only permanently lost if both devices overwrite each other and neither retains the dropped score locally, which requires two simultaneous submissions of different exercises on two devices for the same user.

### Separate KV key, same namespace

- **KV namespace:** existing `RESULTS` binding
- **Key:** `quest:{username}` (e.g., `quest:Lidia`)
- **Value:** the full quest progress JSON object

### New API endpoint: `/api/quest-progress`

**New file: `site/functions/api/quest-progress.js`**

**GET `/api/quest-progress?user={username}`**
- Validates `user` is in the allowed list
- Returns the stored quest progress object, or `null` if none exists

**PUT `/api/quest-progress`**
- Body: `{ user, progress }`
- Validates `user` is in the allowed list
- **Normalizes and validates** the incoming progress payload (see Validation section)
- Server-side merge: reads existing KV value, takes highest bestScore per exercise between existing and incoming, **merges attempts by attemptId**
- Recomputes XP server-side from merged bestScores (never trusts client XP)
- Stores merged result, returns it to the client

### Server-side validation and normalization

The server normalizes the incoming payload before merging. This prevents malformed or malicious data from poisoning KV:

```javascript
function normalizeProgress(raw) {
  const progress = { branches: {}, attempts: [], xp: 0 };

  // Normalize branches and bestScores
  for (const [branchId, branchData] of Object.entries(raw?.branches || {})) {
    // Only accept known branch ID patterns (lowercase alpha)
    if (!/^[a-z]+$/.test(branchId)) continue;

    const bestScores = {};
    for (const [exId, score] of Object.entries(branchData?.bestScores || {})) {
      // Only accept known exercise ID patterns
      if (!/^quest_[a-z]+_\d+$/.test(exId)) continue;
      // Clamp to valid percentage range
      const pct = Number(score);
      if (!Number.isFinite(pct)) continue;
      bestScores[exId] = Math.max(0, Math.min(100, Math.round(pct)));
    }
    progress.branches[branchId] = { bestScores };
  }

  // Normalize attempts
  for (const attempt of raw?.attempts || []) {
    if (!attempt?.exerciseId || !attempt?.branch) continue;
    if (!/^quest_[a-z]+_\d+$/.test(attempt.exerciseId)) continue;

    progress.attempts.push({
      attemptId: typeof attempt.attemptId === "string" ? attempt.attemptId : crypto.randomUUID(),
      exerciseId: attempt.exerciseId,
      branch: attempt.branch,
      date: typeof attempt.date === "string" ? attempt.date : new Date().toISOString(),
      score: Number(attempt.score) || 0,
      maxScore: Number(attempt.maxScore) || 0,
      percentage: Math.max(0, Math.min(100, Math.round(Number(attempt.percentage) || 0))),
      xpEarned: Number(attempt.xpEarned) || 0,
    });
  }

  return progress;
}
```

### Server-side merge (including attempts)

```javascript
function mergeProgress(existing, incoming) {
  if (!existing) return incoming;

  const merged = JSON.parse(JSON.stringify(incoming));

  // Merge bestScores: highest score per exercise wins
  for (const branchId of Object.keys(existing.branches || {})) {
    if (!merged.branches[branchId]) {
      merged.branches[branchId] = existing.branches[branchId];
      continue;
    }
    const existingScores = existing.branches[branchId].bestScores || {};
    const mergedScores = merged.branches[branchId].bestScores || {};
    for (const [exId, score] of Object.entries(existingScores)) {
      if ((mergedScores[exId] ?? -1) < score) {
        mergedScores[exId] = score;
      }
    }
    merged.branches[branchId].bestScores = mergedScores;
  }

  // Merge attempts: union by attemptId
  const seenAttempts = new Set((merged.attempts || []).map((a) => a.attemptId));
  for (const attempt of existing.attempts || []) {
    if (attempt.attemptId && !seenAttempts.has(attempt.attemptId)) {
      merged.attempts.push(attempt);
      seenAttempts.add(attempt.attemptId);
    }
  }

  return merged;
}
```

### Full server endpoint

```javascript
import { computeTotalXP } from "../../src/lib/questXP.js";

const ALLOWED_USERS = ["Tadzio", "Zosia", "Lidia"];

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const user = url.searchParams.get("user");
  if (!user || !ALLOWED_USERS.includes(user)) {
    return Response.json({ error: "invalid user" }, { status: 400 });
  }
  const raw = await context.env.RESULTS.get(`quest:${user}`, "json");
  return Response.json(raw);
}

export async function onRequestPut(context) {
  try {
    const body = await context.request.json();
    const { user } = body;
    if (!user || !ALLOWED_USERS.includes(user)) {
      return Response.json({ error: "invalid user" }, { status: 400 });
    }
    if (!body.progress?.branches) {
      return Response.json({ error: "invalid progress" }, { status: 400 });
    }

    // Normalize incoming payload
    const incoming = normalizeProgress(body.progress);

    const key = `quest:${user}`;
    const existing = await context.env.RESULTS.get(key, "json");

    // Server-side merge: highest bestScore wins, attempts unioned by ID
    const merged = mergeProgress(existing, incoming);

    // Recompute XP server-side (never trust client)
    merged.xp = computeTotalXP(merged);

    await context.env.RESULTS.put(key, JSON.stringify(merged));
    return Response.json(merged);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
```

### Client-side sync functions in questProgress.js

```javascript
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
```

### Update QuestHome.jsx — merge on load

```javascript
useEffect(() => {
  if (!user) return;
  const local = loadProgress(user.name);
  setProgress(local); // Render immediately from localStorage

  fetchRemoteProgress(user.name).then((remote) => {
    if (remote) {
      const merged = mergeProgress(local, remote);
      setProgress(merged);
      saveProgress(user.name, merged);
    } else {
      // No remote data yet — push local to KV for first-time backup
      pushRemoteProgress(user.name, local);
    }
  });
}, [user]);
```

### Update QuestExercise.jsx — push after scoring

Add after `saveProgress(user?.name, progress);`:
```javascript
pushRemoteProgress(user?.name, progress).then((merged) => {
  if (merged) {
    // Server may have merged with newer remote data
    saveProgress(user?.name, merged);
  }
});
```

The server always merges, so even a stale device can't overwrite newer remote scores.

---

## Files Changed

### Phase 1 (XP simplification)

| File | Change |
|------|--------|
| `site/src/lib/questXP.js` | **New.** Shared XP computation: `exerciseXP()`, `computeTotalXP()`, `clampPercentage()`, XP constants |
| `site/src/lib/questData.js` | Re-export XP constants from `questXP.js` (backward compat). Remove local `BASE_XP`, `FIRST_COMPLETION_BONUS`, `PERFECT_BONUS` definitions. |
| `site/src/lib/questProgress.js` | Import `computeTotalXP` from `questXP.js`. Modify `processResult()` to recompute XP from bestScores. Modify `loadProgress()` to recompute on load. Add `attemptId` to attempts. |
| `site/src/pages/quest/QuestExercise.jsx` | Hide "+0 XP" badge when score didn't improve |

### Phase 2 (KV sync)

| File | Change |
|------|--------|
| `site/functions/api/quest-progress.js` | **New.** GET/PUT endpoint with normalization, server-side merge (bestScores + attempts), user validation, XP recomputation via shared `questXP.js` |
| `site/src/lib/questProgress.js` | Add `fetchRemoteProgress()`, `pushRemoteProgress()`, `mergeProgress()` |
| `site/src/pages/quest/QuestHome.jsx` | Fetch remote on mount, merge, update local |
| `site/src/pages/quest/QuestExercise.jsx` | Push to KV after scoring, apply server-merged result |

### Files NOT changed

| File | Why |
|------|-----|
| `site/wrangler.toml` | Reuses existing `RESULTS` KV namespace |
| `site/functions/api/results.js` | Competition results unchanged |
| `site/src/App.jsx` | No routing changes |

---

## Review Concerns — Resolution Status

### From first review (v1 → v2)

| # | Concern | Severity | Status |
|---|---------|----------|--------|
| 1 | XP recomputation mismatch | HIGH | **Resolved.** Phase 1 changes XP to derived-from-bestScores. Live and sync models are identical. |
| 2 | PUT can overwrite remote data | HIGH | **Resolved (common case).** Server-side merge prevents stale overwrite. Concurrent write race on KV is documented and accepted (see Concurrency section). |
| 3 | Weak attempt dedup | MEDIUM | **Resolved.** `attemptId` (UUID) for identity. Server and client both dedup by attemptId. |
| 4 | No server validation | MEDIUM | **Resolved.** User allowlist, schema normalization (regex on IDs, clamped percentages, typed fields), server-side XP recomputation. |
| 5 | Pattern divergence | LOW | **Resolved.** Documented as intentional: quest uses snapshot-with-merge vs competition's append-only. Different data shape justifies different pattern. |
| 6 | Hardcoded branch list | LOW | **Resolved.** Merge iterates union of branch keys from both sources. |

### From second review (v2 → v3)

| # | Concern | Severity | Status |
|---|---------|----------|--------|
| 1 | Non-atomic KV read-merge-write | HIGH | **Accepted with documentation.** Concurrency section explains the residual race, why it's acceptable for 3 single-device users, and the self-healing property. |
| 2 | Server drops attempt history | MEDIUM | **Resolved.** Server merge now unions attempts by attemptId. |
| 3 | Shallow validation | MEDIUM | **Resolved.** `normalizeProgress()` validates/clamps all fields: branch ID regex, exercise ID regex, percentage range, typed attempt fields. |
| 4 | Duplicated XP logic | LOW | **Resolved.** Shared `questXP.js` module used by both client and server. |
| 5 | Migration surprise | LOW | **Accepted.** Documented in plan. Only user (Lidia) had progress recently reset. No banner needed. |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| First load on new device, KV has data | Remote data merged into empty local; user sees full progress |
| First load on new device, KV empty | Local stays empty; local pushed to KV as initial backup |
| Both devices have scores for same exercise | Highest score wins (both client and server merge) |
| User completes exercises without revisiting QuestHome | QuestExercise pushes to KV after each submission; server merges |
| Stale device submits old data | Server merges with existing KV; no data loss |
| Two devices submit simultaneously | Last write wins; next load from either device re-merges and recovers (see Concurrency section) |
| KV fetch fails (offline) | Falls back to localStorage; no user-visible error |
| KV PUT fails | Silent failure; next load will merge and reconcile |
| User clears localStorage | Next QuestHome load fetches from KV and restores |
| KV contains unknown branches or exercises | Merge preserves them (union of keys) |
| Child retries exercise many times, score doesn't improve | XP unchanged; "+X XP" badge not shown |
| Malformed progress in KV | Server normalizes before merge; invalid fields are clamped or dropped |
| Client sends fabricated high scores | Scores clamped to 0-100; XP recomputed server-side; no way to inject arbitrary XP |
| Network failure after local save, before KV push | Local is safe; next load or next submission will push again |

---

## Verification Checklist

### Phase 1

- [ ] `npm run build` succeeds
- [ ] New exercise → XP increases by the formula amount
- [ ] Retry the same exercise with a lower score → XP unchanged, "+0 XP" not shown
- [ ] Retry the same exercise with a higher score → XP increases by the delta
- [ ] Existing Lidia progress (if any): XP recomputed on load, no crash
- [ ] Player level reflects recomputed XP correctly
- [ ] Level unlock gating unaffected (depends on bestScores, not XP)

### Phase 2

- [ ] GET `/api/quest-progress?user=Lidia` returns `null` initially
- [ ] Complete exercise → PUT sends progress; GET returns it
- [ ] Clear localStorage → reload → progress restored from KV
- [ ] Two browsers, different scores → both converge to highest after reload
- [ ] Complete exercise on stale device → server merges, no data loss
- [ ] Invalid user rejected by API
- [ ] Malformed progress (out-of-range scores, bad exercise IDs) normalized by server
- [ ] XP in KV matches server-side recomputation (not client-supplied)
- [ ] Attempt history preserved across devices (merged by attemptId)
- [ ] Competition progress (`/api/results`) unaffected
- [ ] Offline: exercises work normally, KV errors silent

---

## Deploy

```bash
cd site && npm run build && cd .. && npx wrangler pages deploy site/dist --project-name=smarten
```

No KV namespace creation needed — reuses existing `RESULTS` namespace.
