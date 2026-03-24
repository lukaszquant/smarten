import * as s from "./taskStyles";

function getItemResult(taskResult, itemId) {
  return taskResult?.items?.find((r) => r.id === itemId);
}

export default function OpenCloze({ task, answers, onChange, showResults, taskResult }) {
  const items = task.items || [];

  // Render text with inline inputs for gaps
  const parts = (task.text || "").split(/(\d+\.\d+\.\s*_+|\b\d+\.\d+\.)/g);

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>
      {task.title && <p style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{task.title}</p>}

      <div style={{ ...s.text, lineHeight: 2.8 }}>
        {renderTextWithGaps(task.text, items, answers, onChange, showResults, taskResult)}
      </div>

      {showResults && (
        <div style={{ marginTop: 12 }}>
          {items.map((item) => {
            const ir = getItemResult(taskResult, item.id);
            return !ir?.correct ? (
              <div key={item.id} style={s.correctAnswer}>{item.id}: {ir?.correctAnswer}</div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function renderTextWithGaps(text, items, answers, onChange, showResults, taskResult) {
  if (!text) return null;
  // Split on gap markers like "4.1. _________" or "6.1. _________"
  const regex = /(\d+\.\d+)\.\s*_{2,}/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    parts.push({ type: "gap", id: match[1] });
    last = regex.lastIndex;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }

  return parts.map((part, i) => {
    if (part.type === "text") {
      return <span key={i}>{part.value}</span>;
    }
    const item = items.find((it) => it.id === part.id);
    if (!item) return <span key={i}>[{part.id}]</span>;
    const ir = taskResult?.items?.find((r) => r.id === part.id);
    const inputStyle = showResults && ir
      ? (ir.correct ? s.inputCorrect : s.inputWrong)
      : s.input;
    return (
      <span key={i} style={{ display: "inline-flex", alignItems: "center", margin: "2px 4px", verticalAlign: "middle" }}>
        <span style={{ color: "#50d890", fontSize: 11, fontWeight: 700, marginRight: 4 }}>{part.id}</span>
        <input
          style={{ ...inputStyle, width: 100, border: "2px solid #42b4f5", background: "#1a1a2e", borderRadius: 4, padding: "4px 8px" }}
          value={answers[part.id] || ""}
          onChange={(e) => onChange(part.id, e.target.value)}
          disabled={showResults}
        />
      </span>
    );
  });
}
