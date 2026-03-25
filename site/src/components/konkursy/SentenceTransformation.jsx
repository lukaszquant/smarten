import * as s from "./taskStyles";

export default function SentenceTransformation({ task, answers, onChange, showResults, taskResult }) {
  const items = task.items || [];

  function getItemResult(id) {
    return taskResult?.items?.find((r) => r.id === id);
  }

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {items.map((item) => {
          const ir = getItemResult(item.id);
          const inputStyle = showResults && ir
            ? (ir.correct ? s.inputCorrect : s.inputWrong)
            : s.input;

          // Split transformed sentence on the blank
          const parts = item.transformed.split("_________");

          return (
            <div key={item.id}>
              <p style={{ color: "#7a7a90", fontSize: 13, marginBottom: 4 }}>
                <span style={{ marginRight: 8 }}>{item.id}</span>
                {item.original}
              </p>
              <div style={{ color: "#c8c8d8", fontSize: 14, lineHeight: 2, paddingLeft: 8 }}>
                <span style={{ color: "#f5a623", fontWeight: 700, marginRight: 8, fontSize: 12 }}>
                  {item.keyword}
                </span>
                {parts[0]}
                <input
                  style={{ ...inputStyle, width: 220, margin: "0 4px" }}
                  value={answers[item.id] || ""}
                  onChange={(e) => onChange(item.id, e.target.value)}
                  disabled={showResults}
                  placeholder="..."
                />
                {parts[1] || ""}
              </div>
              {showResults && ir && (
                <div style={{ paddingLeft: 8, marginTop: 4 }}>
                  {!ir.correct && (
                    <span style={s.correctAnswer}>{ir.correctAnswer}</span>
                  )}
                  {ir.feedback && (
                    <p style={{ color: "#7a7a90", fontSize: 12, marginTop: 2 }}>{ir.feedback}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
