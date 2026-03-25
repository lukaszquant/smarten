import * as s from "./taskStyles";

export default function Writing({ task, answers, onChange, showResults, taskResult }) {
  const ir = taskResult?.items?.[0];
  const key = "writing";

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>
      <textarea
        style={{
          ...s.input,
          width: "100%",
          minHeight: 200,
          resize: "vertical",
          lineHeight: 1.7,
          padding: "12px 14px",
          boxSizing: "border-box",
          ...(showResults && ir ? (ir.earned >= ir.max * 0.7 ? { borderColor: "#50d890", background: "#50d89015" } : ir.earned >= ir.max * 0.4 ? { borderColor: "#f5a623", background: "#f5a62315" } : { borderColor: "#e05050", background: "#e0505015" }) : {}),
        }}
        value={answers[key] || ""}
        onChange={(e) => onChange(key, e.target.value)}
        disabled={showResults}
        placeholder="Napisz swoja odpowiedz tutaj..."
      />
      {showResults && ir && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: ir.earned >= ir.max * 0.7 ? "#50d890" : ir.earned >= ir.max * 0.4 ? "#f5a623" : "#e05050",
          }}>
            {ir.earned}/{ir.max} pkt
          </div>
          {ir.feedback && (
            <p style={{ color: "#9a9ab0", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>{ir.feedback}</p>
          )}
        </div>
      )}
    </div>
  );
}
