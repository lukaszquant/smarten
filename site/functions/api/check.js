// POST /api/check — AI-grade a task
// body: { type, task, answers }
// Returns: { items: [{ id, earned, max, feedback }], earned, max }

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-6";

export async function onRequestPost(context) {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { type, task, answers } = await context.request.json();

    if (!type || !task || !answers) {
      return Response.json({ error: "type, task, and answers required" }, { status: 400 });
    }

    let prompt, model;

    if (type === "sentence_transformation") {
      model = HAIKU;
      prompt = buildSentenceTransformationPrompt(task, answers);
    } else if (type === "grammar_gaps") {
      model = HAIKU;
      prompt = buildGrammarGapsPrompt(task, answers);
    } else if (type === "writing") {
      model = SONNET;
      prompt = buildWritingPrompt(task, answers);
    } else {
      return Response.json({ error: `Unsupported type: ${type}` }, { status: 400 });
    }

    const result = await callClaude(apiKey, model, prompt);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

async function callClaude(apiKey, model, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");

  return JSON.parse(jsonMatch[0]);
}

function buildSentenceTransformationPrompt(task, answers) {
  const items = task.items.map((item) => ({
    id: item.id,
    original: item.original,
    keyword: item.keyword,
    gappedSentence: item.transformed,
    expectedAnswer: item.answer,
    studentAnswer: answers[item.id] || "",
  }));

  return `You are grading an English sentence transformation exercise for a Polish middle school competition.

Each item has:
- An original sentence
- A keyword (must be used, unchanged)
- A gapped sentence to complete
- The expected answer(s)
- The student's answer

Grade each item: 1 point if correct, 0 if wrong. The student's answer is correct if:
1. It uses the keyword exactly as given (no form changes)
2. The completed sentence has the same meaning as the original
3. It is grammatically correct
4. It fits naturally in the gap

Be lenient with minor spelling errors if the grammar structure is clearly correct. Accept alternative phrasings that preserve meaning.

Items to grade:
${JSON.stringify(items, null, 2)}

Respond with ONLY this JSON (no other text):
{
  "items": [
    { "id": "...", "earned": 0 or 1, "max": 1, "correct": true/false, "feedback": "brief explanation", "correctAnswer": "expected answer" }
  ],
  "earned": total_points,
  "max": ${task.items.length}
}`;
}

function buildGrammarGapsPrompt(task, answers) {
  const items = task.items.map((item) => {
    // grammar_gaps items have context with multiple blanks
    // answers are keyed as item.id + "_0", item.id + "_1", etc. or just item.id
    const studentAnswers = {};
    for (const [key, val] of Object.entries(answers)) {
      if (key === item.id || key.startsWith(item.id + "_")) {
        studentAnswers[key] = val;
      }
    }
    return {
      id: item.id,
      context: item.context,
      expectedAnswers: item.answer,
      studentAnswers,
    };
  });

  return `You are grading an English grammar exercise for a Polish middle school competition.

Each item has a sentence with gaps. The student must fill in the correct grammatical forms of words given in brackets.

Grade each gap: 1 point if correct, 0 if wrong. Accept answers that are grammatically correct and match the required form, even if phrased slightly differently from the expected answer. Require correct spelling.

Items to grade:
${JSON.stringify(items, null, 2)}

Count the total number of individual gaps across all items. Each gap is worth 1 point.

Respond with ONLY this JSON (no other text):
{
  "items": [
    { "id": "...", "earned": points_for_this_item, "max": number_of_gaps_in_item, "correct": true/false, "feedback": "brief explanation for each gap", "correctAnswer": "expected answers joined with ; " }
  ],
  "earned": total_points,
  "max": total_gaps
}`;
}

function buildWritingPrompt(task, answers) {
  const studentText = answers.writing || answers[task.id + "_writing"] || "";

  return `You are grading a writing task for a Polish middle school English competition.

Task instruction (in Polish):
${task.instruction}

Maximum points: ${task.points}

Student's response:
${studentText}

Grade the response on these criteria, allocating points from the total of ${task.points}:
1. Task completion (did they address all required points?)
2. Coherence and organization
3. Vocabulary range and accuracy
4. Grammar accuracy
5. Appropriate register and format

Be fair but rigorous — this is a competition, not a classroom exercise. Deduct for:
- Missing required content points
- Significant grammar errors
- Limited vocabulary
- Poor organization

If the response is empty or completely off-topic, give 0 points.

Respond with ONLY this JSON (no other text):
{
  "items": [
    { "id": "${task.id}", "earned": points, "max": ${task.points}, "correct": false, "feedback": "detailed feedback in Polish covering each criterion, 3-5 sentences", "correctAnswer": "n/a" }
  ],
  "earned": points,
  "max": ${task.points}
}`;
}
