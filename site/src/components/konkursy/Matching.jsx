import * as s from "./taskStyles";

function getItemResult(taskResult, itemId) {
  return taskResult?.items?.find((r) => r.id === itemId);
}

export default function Matching({ task, answers, onChange, showResults, taskResult }) {
  const items = task.items || [];
  const options = task.options || [];

  // Detect if this is a multi-answer matching (table with multiple selects per row)
  const isMultiAnswer = items.length > 0 && Array.isArray(items[0].answers);

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>

      {options.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#7a7a90", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Opisy do wyboru:</p>
          {options.map((opt) => (
            <p key={opt.letter} style={{ fontSize: 13, color: "#c8c8d8", lineHeight: 1.6, margin: "2px 0" }}>
              <strong style={{ marginRight: 6 }}>{opt.letter}.</strong>{opt.text}
            </p>
          ))}
        </div>
      )}

      {isMultiAnswer ? (
        <MultiAnswerTable items={items} options={options} answers={answers} onChange={onChange} showResults={showResults} taskResult={taskResult} />
      ) : (
        <SingleAnswerList items={items} options={options} answers={answers} onChange={onChange} showResults={showResults} taskResult={taskResult} />
      )}
    </div>
  );
}

function SingleAnswerList({ items, options, answers, onChange, showResults, taskResult }) {
  return items.map((item) => {
    const ir = getItemResult(taskResult, item.id);
    const selectStyle = showResults && ir
      ? { borderColor: ir.correct ? "#50d890" : "#e05050" }
      : {};
    const label = item.name || item.statement || item.id;
    return (
      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ color: "#c8c8d8", fontSize: 14, minWidth: 140 }}>{label}</span>
        <select
          value={answers[item.id] || ""}
          onChange={(e) => onChange(item.id, e.target.value)}
          disabled={showResults}
          style={{ ...s.input, width: 80, cursor: "pointer", ...selectStyle }}
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt.letter} value={opt.letter}>{opt.letter}</option>
          ))}
        </select>
        {showResults && ir && !ir.correct && (
          <span style={s.correctAnswer}>{ir?.correctAnswer}</span>
        )}
      </div>
    );
  });
}

function MultiAnswerTable({ items, options, answers, onChange, showResults, taskResult }) {
  const numSelects = items[0]?.answers?.length || 3;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={thStyle}></th>
          {Array.from({ length: numSelects }, (_, i) => (
            <th key={i} style={thStyle}>{i + 1}</th>
          ))}
          {showResults && <th style={thStyle}></th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const userAns = answers[item.id] || Array(numSelects).fill("");
          const ir = getItemResult(taskResult, item.id);
          return (
            <tr key={item.id} style={ir ? { background: ir.correct ? "#50d89008" : "#e0505008" } : {}}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{item.id}</td>
              {Array.from({ length: numSelects }, (_, idx) => (
                <td key={idx} style={tdStyle}>
                  <select
                    value={(Array.isArray(userAns) ? userAns[idx] : "") || ""}
                    onChange={(e) => {
                      const newAns = [...(Array.isArray(answers[item.id]) ? answers[item.id] : Array(numSelects).fill(""))];
                      newAns[idx] = e.target.value;
                      onChange(item.id, newAns);
                    }}
                    disabled={showResults}
                    style={{ ...s.input, width: 60, cursor: "pointer" }}
                  >
                    <option value="">—</option>
                    {options.map((opt) => (
                      <option key={opt.letter} value={opt.letter}>{opt.letter}</option>
                    ))}
                  </select>
                </td>
              ))}
              {showResults && ir && !ir.correct && (
                <td style={tdStyle}><span style={s.correctAnswer}>{ir.correctAnswer}</span></td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const thStyle = { padding: "8px 12px", borderBottom: "1px solid #1e1e2e", color: "#7a7a90", fontSize: 13, fontWeight: 600, textAlign: "left" };
const tdStyle = { padding: "8px 12px", borderBottom: "1px solid #1e1e2e", fontSize: 14, color: "#c8c8d8" };
