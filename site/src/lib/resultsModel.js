/**
 * Attempt normalization and filtering.
 *
 * Legacy attempts encode kind in testId:
 *   - "practice/{id}"  → practice
 *   - "{year}/{stage}" → competition
 *
 * New attempts carry an explicit `kind` field and `attemptId`.
 */

export function normalizeAttempt(raw) {
  const a = { ...raw };

  // Ensure attemptId
  if (!a.attemptId) {
    const base = `${a.testId || ""}_${a.date || ""}`;
    a.attemptId = base === "_" ? `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` : base;
  }

  // Derive kind from testId if missing
  if (!a.kind) {
    if (a.testId?.startsWith("practice/")) {
      a.kind = "practice";
    } else {
      a.kind = "competition";
    }
  }

  // Derive structured fields for each kind
  if (a.kind === "competition" && !a.year) {
    const parts = a.testId?.split("/") || [];
    a.year = parts[0] || "";
    a.stage = parts[1] || "";
  }

  if (a.kind === "practice" && !a.exerciseId) {
    a.exerciseId = a.testId?.replace("practice/", "") || "";
  }

  return a;
}

export function loadAttempts(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return (stored.attempts || []).map(normalizeAttempt);
  } catch {
    return [];
  }
}

export function competitionAttempts(storageKey) {
  return loadAttempts(storageKey).filter((a) => a.kind === "competition");
}

export function practiceAttempts(storageKey) {
  return loadAttempts(storageKey).filter((a) => a.kind === "practice");
}

export function makeAttemptId() {
  return crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
