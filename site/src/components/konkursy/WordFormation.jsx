import * as s from "./taskStyles";

function getItemResult(taskResult, itemId) {
  return taskResult?.items?.find((r) => r.id === itemId);
}

export default function WordFormation({ task, answers, onChange, showResults, taskResult }) {
  const items = task.items || [];
  const wordBank = task.wordBank || [];

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
        padding: 12,
        background: "#0d0d14",
        borderRadius: 8,
        border: "1px solid #1e1e2e",
      }}>
        {wordBank.map((word) => (
          <span key={word} style={{
            padding: "4px 10px",
            borderRadius: 6,
            background: "#1e1e2e",
            color: "#c8c8d8",
            fontSize: 13,
            fontWeight: 600,
          }}>{word}</span>
        ))}
      </div>

      {task.title && <p style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{task.title}</p>}
      {task.text && <div style={s.text}>{renderWordFormationText(task.text, items, answers, onChange, showResults, taskResult)}</div>}
    </div>
  );
}

function renderWordFormationText(text, items, answers, onChange, showResults, taskResult) {
  const regex = /(\d+\.\d+)\.\s*_{2,}/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    parts.push({ type: "gap", id: match[1] });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });

  return parts.map((part, i) => {
    if (part.type === "text") return <span key={i}>{part.value}</span>;
    const item = items.find((it) => it.id === part.id);
    if (!item) return <span key={i}>[{part.id}]</span>;
    const ir = taskResult?.items?.find((r) => r.id === part.id);
    const inputStyle = showResults && ir ? (ir.correct ? s.inputCorrect : s.inputWrong) : s.input;
    return (
      <span key={i} style={{ display: "inline-flex", alignItems: "center", margin: "0 2px" }}>
        <span style={{ color: "#7a7a90", fontSize: 11, marginRight: 2 }}>{part.id}</span>
        <input
          style={{ ...inputStyle, width: 120 }}
          value={answers[part.id] || ""}
          onChange={(e) => onChange(part.id, e.target.value)}
          disabled={showResults}
        />
        {showResults && ir && !ir.correct && <span style={{ ...s.correctAnswer, marginLeft: 4 }}>{ir.correctAnswer}</span>}
      </span>
    );
  });
}
