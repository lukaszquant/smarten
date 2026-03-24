import { useState } from "react";
import * as s from "./taskStyles";

export default function MatchingColumns({ task, answers, onChange, showResults, taskResult }) {
  const items = task.items || [];
  const options = task.options || [];
  const cities = task.cities || items.map((i) => i.id);

  return (
    <div style={s.card}>
      <p style={s.instruction}>{task.instruction}</p>

      <div style={{ marginBottom: 16 }}>
        {options.map((opt) => (
          <p key={opt.letter} style={{ fontSize: 13, color: "#c8c8d8", lineHeight: 1.6, margin: "2px 0" }}>
            <strong style={{ marginRight: 6 }}>{opt.letter}.</strong>{opt.text}
          </p>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Miasto</th>
            <th style={thStyle}>Wybor 1</th>
            <th style={thStyle}>Wybor 2</th>
            {showResults && <th style={thStyle}></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const cityId = item.id;
            const userAns = answers[cityId] || ["", ""];
            const ir = taskResult?.items?.find((r) => r.id === cityId);
            return (
              <tr key={cityId} style={ir ? { background: ir.correct ? "#50d89008" : "#e0505008" } : {}}>
                <td style={tdStyle}><strong>{cityId}</strong></td>
                {[0, 1].map((idx) => (
                  <td key={idx} style={tdStyle}>
                    <select
                      value={userAns[idx] || ""}
                      onChange={(e) => {
                        const newAns = [...(answers[cityId] || ["", ""])];
                        newAns[idx] = e.target.value;
                        onChange(cityId, newAns);
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
    </div>
  );
}

const thStyle = { padding: "8px 12px", borderBottom: "1px solid #1e1e2e", color: "#7a7a90", fontSize: 13, fontWeight: 600, textAlign: "left" };
const tdStyle = { padding: "8px 12px", borderBottom: "1px solid #1e1e2e", fontSize: 14, color: "#c8c8d8" };
