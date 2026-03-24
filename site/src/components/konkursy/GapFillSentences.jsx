import * as s from "./taskStyles";

function getItemResult(taskResult, itemId) {
  return taskResult?.items?.find((r) => r.id === itemId);
}

export default function GapFillSentences({ task, answers, onChange, showResults, taskResult }) {
  const items = task.items || [];
  const options = task.options || [];

  const usedLetters = new Set(Object.values(answers));

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>
      {task.text && <div style={s.text}>{task.text}</div>}

      <div style={{ marginBottom: 16 }}>
        <p style={{ color: "#7a7a90", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Zdania do wyboru:</p>
        {options.map((opt) => (
          <p key={opt.letter} style={{
            fontSize: 13,
            color: usedLetters.has(opt.letter) ? "#4a4a5a" : "#c8c8d8",
            lineHeight: 1.7,
            margin: "2px 0",
            textDecoration: usedLetters.has(opt.letter) ? "line-through" : "none",
          }}>
            <strong style={{ marginRight: 6 }}>{opt.letter}.</strong>{opt.text}
          </p>
        ))}
      </div>

      {items.map((item) => {
        const ir = getItemResult(taskResult, item.id);
        const selectStyle = showResults && ir
          ? { borderColor: ir.correct ? "#50d890" : "#e05050", background: ir.correct ? "#50d89015" : "#e0505015" }
          : {};
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ color: "#7a7a90", fontSize: 13, minWidth: 32 }}>{item.id}</span>
            <select
              value={answers[item.id] || ""}
              onChange={(e) => onChange(item.id, e.target.value)}
              disabled={showResults}
              style={{
                ...s.input,
                width: 80,
                cursor: "pointer",
                ...selectStyle,
              }}
            >
              <option value="">—</option>
              {options.map((opt) => (
                <option key={opt.letter} value={opt.letter}>{opt.letter}</option>
              ))}
            </select>
            {showResults && ir && !ir.correct && (
              <span style={s.correctAnswer}>{ir.correctAnswer}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
