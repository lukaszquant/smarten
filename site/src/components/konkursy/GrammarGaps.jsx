import * as s from "./taskStyles";

export default function GrammarGaps({ task, answers, onChange, showResults, taskResult }) {
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
          // Split context on blanks
          const parts = item.context.split("_________");
          const gapCount = parts.length - 1;

          return (
            <div key={item.id}>
              <p style={{ color: "#7a7a90", fontSize: 13, marginBottom: 6 }}>{item.id}</p>
              <div style={{ color: "#c8c8d8", fontSize: 14, lineHeight: 2.2, paddingLeft: 8 }}>
                {parts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < gapCount && (
                      <input
                        style={{
                          ...(showResults && ir
                            ? (ir.correct ? s.inputCorrect : s.inputWrong)
                            : s.input),
                          width: 200,
                          margin: "0 4px",
                        }}
                        value={answers[gapCount === 1 ? item.id : `${item.id}_${i}`] || ""}
                        onChange={(e) => onChange(
                          gapCount === 1 ? item.id : `${item.id}_${i}`,
                          e.target.value
                        )}
                        disabled={showResults}
                        placeholder="..."
                      />
                    )}
                  </span>
                ))}
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
