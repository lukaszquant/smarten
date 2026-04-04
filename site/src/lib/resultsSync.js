/**
 * Remote results sync — modeled after questProgress.js sync flow.
 *
 * Pattern: optimistic local save → fetch remote → merge → push merged → apply server response.
 * Merge strategy: union attempts by attemptId (no duplicates).
 */

import { normalizeAttempt, loadAttempts } from "./resultsModel";

// Per-user dedup: only one sync in flight at a time
const inflightSyncs = new Map();

export function mergeAttempts(local, remote) {
  if (!remote || remote.length === 0) return local;
  if (!local || local.length === 0) return remote.map(normalizeAttempt);

  const merged = [...local];
  const seen = new Set(local.map((a) => a.attemptId));

  for (const raw of remote) {
    const a = normalizeAttempt(raw);
    if (a.attemptId && !seen.has(a.attemptId)) {
      merged.push(a);
      seen.add(a.attemptId);
    }
  }

  return merged;
}

export async function fetchRemoteAttempts(username) {
  try {
    const res = await fetch(`/api/results?user=${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function pushRemoteAttempts(username, attempts) {
  return fetch("/api/results", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: username, attempts }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

export function clearRemoteAttempts(username) {
  return fetch(`/api/results?user=${encodeURIComponent(username)}`, {
    method: "DELETE",
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

/**
 * Full sync cycle: load local → fetch remote → merge → save local → push to server.
 * Returns the merged attempts array.
 * Deduplicates concurrent calls for the same user.
 */
export function syncAttempts(username, storageKey) {
  const existing = inflightSyncs.get(username);
  if (existing) return existing;

  const promise = _doSync(username, storageKey).finally(() => {
    inflightSyncs.delete(username);
  });
  inflightSyncs.set(username, promise);
  return promise;
}

async function _doSync(username, storageKey) {
  const local = loadAttempts(storageKey);
  const remote = await fetchRemoteAttempts(username);
  const merged = mergeAttempts(local, remote);

  // Save merged back to localStorage
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    stored.attempts = merged;
    localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {}

  // Push to server; server merges again and returns canonical copy
  const serverResult = await pushRemoteAttempts(username, merged);
  if (serverResult && Array.isArray(serverResult.attempts)) {
    const final = serverResult.attempts.map(normalizeAttempt);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      stored.attempts = final;
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {}
    return final;
  }

  return merged;
}
