// GET /api/quest-progress?user=Lidia  — fetch quest progress from KV
// PUT /api/quest-progress             — merge and store quest progress
//   body: { user, progress }

import { computeTotalXP, clampPercentage } from "../../src/lib/questXP.js";

const ALLOWED_USERS = ["Tadzio", "Zosia", "Lidia"];

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const user = url.searchParams.get("user");
  if (!user || !ALLOWED_USERS.includes(user)) {
    return Response.json({ error: "invalid user" }, { status: 400 });
  }
  const raw = await context.env.RESULTS.get(`quest:${user}`, "json");
  if (!raw) return Response.json(null);
  const normalized = normalizeProgress(raw);
  normalized.xp = computeTotalXP(normalized);
  return Response.json(normalized);
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
    const rawExisting = await context.env.RESULTS.get(key, "json");
    const existing = rawExisting ? normalizeProgress(rawExisting) : null;

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

function normalizeProgress(raw) {
  const progress = { branches: {}, attempts: [], xp: 0 };

  // Normalize branches and bestScores
  for (const [branchId, branchData] of Object.entries(raw?.branches || {})) {
    if (!/^[a-z]+$/.test(branchId)) continue;

    const bestScores = {};
    for (const [exId, score] of Object.entries(branchData?.bestScores || {})) {
      if (!/^quest_[a-z]+_\d+$/.test(exId)) continue;
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
