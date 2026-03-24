// GET /api/results?user=Tadzio  — fetch all results for a user (or all users if no param)
// POST /api/results             — save a new result
//   body: { user, testId, date, score, maxScore, percentage, answers, taskBreakdown }

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const user = url.searchParams.get("user");

  if (user) {
    const raw = await context.env.RESULTS.get(`user:${user}`, "json");
    return Response.json(raw || []);
  }

  // Return all users' results
  const list = await context.env.RESULTS.list({ prefix: "user:" });
  const all = {};
  for (const key of list.keys) {
    const name = key.name.replace("user:", "");
    all[name] = await context.env.RESULTS.get(key.name, "json") || [];
  }
  return Response.json(all);
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { user, testId, date, score, maxScore, percentage, answers, taskBreakdown } = body;

    if (!user || !testId) {
      return Response.json({ error: "user and testId required" }, { status: 400 });
    }

    const key = `user:${user}`;
    const existing = await context.env.RESULTS.get(key, "json") || [];

    existing.push({
      testId, date, score, maxScore, percentage,
      answers, taskBreakdown,
    });

    await context.env.RESULTS.put(key, JSON.stringify(existing));

    return Response.json({ ok: true, count: existing.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
