export default function SkippedTask({ task }) {
  const typeLabels = {
    listening_true_false_ni: "Listening (T/F/NI)",
    listening_open: "Listening (open)",
    sentence_transformation: "Transformacja zdania",
    grammar_gaps: "Gramatyka",
  };
  return (
    <div style={styles.wrap}>
      <p style={styles.label}>{typeLabels[task.type] || task.type}</p>
      <p style={styles.text}>
        To zadanie wymaga sprawdzenia przez nauczyciela / AI i nie jest jeszcze dostepne online.
      </p>
    </div>
  );
}

const styles = {
  wrap: {
    padding: "16px 20px",
    background: "#13131a",
    borderRadius: 10,
    border: "1px dashed #2a2a3e",
    opacity: 0.6,
  },
  label: { color: "#7a7a90", fontSize: 12, fontWeight: 600, margin: "0 0 4px", textTransform: "uppercase" },
  text: { color: "#4a4a5a", fontSize: 14, margin: 0 },
};
