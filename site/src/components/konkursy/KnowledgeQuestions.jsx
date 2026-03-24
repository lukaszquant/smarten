import * as s from "./taskStyles";

function getItemResult(taskResult, itemId) {
  return taskResult?.items?.find((r) => r.id === itemId);
}

export default function KnowledgeQuestions({ task, answers, onChange, showResults, taskResult }) {
  const items = task.items || [];

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((item) => {
          const ir = getItemResult(taskResult, item.id);
          const inputStyle = showResults && ir
            ? (ir.correct ? s.inputCorrect : s.inputWrong)
            : s.input;
          return (
            <div key={item.id}>
              <p style={{ color: "#c8c8d8", fontSize: 14, lineHeight: 1.6, marginBottom: 6 }}>
                <span style={{ color: "#7a7a90", marginRight: 8 }}>{item.id}</span>
                {item.question}
              </p>
              {item.options && item.options.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                  {item.options.map((opt) => {
                    const letter = opt.replace(/^([A-D])\..*/, "$1");
                    const selected = answers[item.id] === letter;
                    const isCorrect = showResults && ir && letter === ir.correctAnswer;
                    const isWrong = showResults && ir && selected && !ir.correct;
                    let optStyle = { ...s.input, width: "auto", cursor: showResults ? "default" : "pointer", padding: "6px 12px", display: "inline-block" };
                    if (isCorrect) optStyle = { ...optStyle, ...s.inputCorrect };
                    else if (isWrong) optStyle = { ...optStyle, ...s.inputWrong };
                    else if (selected) optStyle = { ...optStyle, borderColor: "#42b4f5", background: "#42b4f515" };
                    return (
                      <div
                        key={opt}
                        style={optStyle}
                        onClick={() => !showResults && onChange(item.id, letter)}
                      >
                        {opt}
                      </div>
                    );
                  })}
                  {showResults && ir && !ir.correct && (
                    <span style={s.correctAnswer}>{ir.correctAnswer}</span>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 8, flexWrap: "wrap" }}>
                  <input
                    style={{ ...inputStyle, width: 260 }}
                    value={answers[item.id] || ""}
                    onChange={(e) => onChange(item.id, e.target.value)}
                    disabled={showResults}
                    placeholder="odpowiedz..."
                  />
                  {item.secondAnswer && (
                    <input
                      style={{ ...inputStyle, width: 200 }}
                      value={answers[item.id + "_b"] || ""}
                      onChange={(e) => onChange(item.id + "_b", e.target.value)}
                      disabled={showResults}
                      placeholder="(druga czesc)..."
                    />
                  )}
                  {showResults && ir && !ir.correct && (
                    <span style={s.correctAnswer}>{ir.correctAnswer}</span>
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
