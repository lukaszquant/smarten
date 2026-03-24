import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDocumentHead } from "../hooks";
import { useUser } from "../App";

const STAGE_LABELS = { szkolny: "Etap szkolny", rejonowy: "Etap rejonowy", wojewodzki: "Etap wojewodzki" };
const STAGE_COLORS = { szkolny: "#50d890", rejonowy: "#42b4f5", wojewodzki: "#a78bfa" };

const TYPE_LABELS = {
  knowledge_questions: "Wiedza o krajach",
  true_false_ni: "Prawda / Falsz / NI",
  gap_fill_sentences: "Luki w zdaniach",
  multiple_choice: "Wybor A/B/C",
  open_cloze: "Uzupelnianie luk",
  word_spelling: "Literowanie",
  word_formation: "Slowotworstwo",
  matching: "Dopasowywanie",
  dialogue_choice: "Dialogi",
};

function useDashboardStats() {
  const user = useUser();
  const storageKey = `smarten_konkursy_${user?.name || "default"}`;
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const attempts = stored.attempts || [];
      if (attempts.length === 0) { setData(null); return; }

      const competitions = attempts.filter((a) => !a.testId?.startsWith("practice/"));
      const practice = attempts.filter((a) => a.testId?.startsWith("practice/"));

      // Per-type stats from both competitions and practice
      const byType = {};
      for (const a of attempts) {
        for (const tb of (a.taskBreakdown || [])) {
          if (tb.skipped) continue;
          const t = tb.type;
          if (!byType[t]) byType[t] = { earned: 0, max: 0, count: 0 };
          byType[t].earned += tb.earned;
          byType[t].max += tb.max;
          byType[t].count++;
        }
      }

      // Find weakest type (min percentage, at least 3 attempts)
      let weakest = null, weakestPct = 101;
      for (const [type, s] of Object.entries(byType)) {
        if (s.count < 3 || s.max === 0) continue;
        const pct = Math.round((s.earned / s.max) * 100);
        if (pct < weakestPct) { weakestPct = pct; weakest = type; }
      }

      // Find strongest
      let strongest = null, strongestPct = -1;
      for (const [type, s] of Object.entries(byType)) {
        if (s.count < 3 || s.max === 0) continue;
        const pct = Math.round((s.earned / s.max) * 100);
        if (pct > strongestPct) { strongestPct = pct; strongest = type; }
      }

      // Overall avg from best per unique exercise
      const bestByExercise = {};
      for (const a of attempts) {
        const key = a.testId;
        if (!bestByExercise[key] || a.percentage > bestByExercise[key]) {
          bestByExercise[key] = a.percentage;
        }
      }
      const allBests = Object.values(bestByExercise);
      const overallAvg = allBests.length > 0 ? Math.round(allBests.reduce((s, v) => s + v, 0) / allBests.length) : 0;

      setData({
        totalAttempts: attempts.length,
        competitionsDone: new Set(competitions.map((a) => a.testId)).size,
        practicesDone: new Set(practice.map((a) => a.testId)).size,
        overallAvg,
        weakest: weakest ? { type: weakest, label: TYPE_LABELS[weakest] || weakest, pct: weakestPct } : null,
        strongest: strongest ? { type: strongest, label: TYPE_LABELS[strongest] || strongest, pct: strongestPct } : null,
      });
    } catch { setData(null); }
  }, [storageKey]);

  return data;
}

export default function Home() {
  useDocumentHead(null, "Testy z konkursow jezyka angielskiego woj. mazowieckiego. Rozwiazuj online i sprawdzaj wyniki!");
  const [tests, setTests] = useState(null);
  const dashboard = useDashboardStats();

  useEffect(() => {
    fetch("/konkursy/angielski/data/tests.json")
      .then((r) => r.json())
      .then(setTests)
      .catch(console.error);
  }, []);

  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Playfair+Display:wght@700;900&display=swap"
        rel="stylesheet"
      />

      <h1 style={styles.title}>Konkurs jezyka angielskiego</h1>
      <p style={styles.subtitle}>
        Wojewodztwo mazowieckie, klasy IV-VIII. Wybierz test i sprawdz swoja wiedze!
      </p>

      <div
        style={{
          background: "#13131a",
          border: "1px solid #1e1e2e",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 40,
          fontSize: 14,
          lineHeight: 1.7,
          color: "#7a7a90",
        }}
      >
        <span style={{ fontWeight: 700, color: "#e8e8f0" }}>Jak korzystac:</span>{" "}
        Wybierz etap konkursu, rozwiaz zadania i sprawdz odpowiedzi.
        Zadania otwarte (sluchanie, transformacje, wypracowania) beda dodane pozniej.
      </div>

      {dashboard && (
        <div style={{
          background: "#13131a", border: "1px solid #1e1e2e", borderRadius: 12,
          padding: "20px 24px", marginBottom: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 16 }}>Twoje wyniki</span>
            <span style={{
              fontSize: 28, fontWeight: 900, fontFamily: "'Playfair Display', serif",
              color: dashboard.overallAvg >= 70 ? "#50d890" : dashboard.overallAvg >= 40 ? "#f5a623" : "#e05050",
            }}>
              {dashboard.overallAvg}%
            </span>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 100, background: "#0d0d14", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ color: "#7a7a90", fontSize: 11, marginBottom: 2 }}>Testy konkursowe</div>
              <div style={{ color: "#42b4f5", fontSize: 18, fontWeight: 700 }}>{dashboard.competitionsDone}</div>
            </div>
            <div style={{ flex: 1, minWidth: 100, background: "#0d0d14", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ color: "#7a7a90", fontSize: 11, marginBottom: 2 }}>Cwiczenia</div>
              <div style={{ color: "#f5a623", fontSize: 18, fontWeight: 700 }}>{dashboard.practicesDone}</div>
            </div>
            <div style={{ flex: 1, minWidth: 100, background: "#0d0d14", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ color: "#7a7a90", fontSize: 11, marginBottom: 2 }}>Podejsc</div>
              <div style={{ color: "#a78bfa", fontSize: 18, fontWeight: 700 }}>{dashboard.totalAttempts}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {dashboard.weakest && (
              <Link to={`/cwiczenia/${dashboard.weakest.type}`} style={{
                flex: 1, minWidth: 140, background: "#e0505015", border: "1px solid #e0505030",
                borderRadius: 8, padding: "10px 14px", textDecoration: "none",
              }}>
                <div style={{ color: "#e05050", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Najslabszy typ</div>
                <div style={{ color: "#e8e8f0", fontSize: 14, fontWeight: 700 }}>{dashboard.weakest.label}</div>
                <div style={{ color: "#e05050", fontSize: 13, fontWeight: 700 }}>{dashboard.weakest.pct}%</div>
              </Link>
            )}
            {dashboard.strongest && (
              <Link to={`/cwiczenia/${dashboard.strongest.type}`} style={{
                flex: 1, minWidth: 140, background: "#50d89015", border: "1px solid #50d89030",
                borderRadius: 8, padding: "10px 14px", textDecoration: "none",
              }}>
                <div style={{ color: "#50d890", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Najlepszy typ</div>
                <div style={{ color: "#e8e8f0", fontSize: 14, fontWeight: 700 }}>{dashboard.strongest.label}</div>
                <div style={{ color: "#50d890", fontSize: 13, fontWeight: 700 }}>{dashboard.strongest.pct}%</div>
              </Link>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
        <Link
          to="/postepy"
          style={{
            flex: 1,
            display: "block",
            background: "#13131a",
            border: "1px solid #1e1e2e",
            borderRadius: 10,
            padding: "16px 20px",
            textDecoration: "none",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#42b4f566"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e1e2e"; }}
        >
          <span style={{ color: "#42b4f5", fontWeight: 700, fontSize: 15 }}>Twoje postepy</span>
          <span style={{ color: "#7a7a90", fontSize: 13, display: "block", marginTop: 4 }}>
            Historia wynikow &rarr;
          </span>
        </Link>
        <Link
          to="/cwiczenia"
          style={{
            flex: 1,
            display: "block",
            background: "#13131a",
            border: "1px solid #1e1e2e",
            borderRadius: 10,
            padding: "16px 20px",
            textDecoration: "none",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f5a62366"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e1e2e"; }}
        >
          <span style={{ color: "#f5a623", fontWeight: 700, fontSize: 15 }}>Cwiczenia</span>
          <span style={{ color: "#7a7a90", fontSize: 13, display: "block", marginTop: 4 }}>
            Dodatkowe zadania &rarr;
          </span>
        </Link>
      </div>

      {!tests && <p style={{ color: "#7a7a90" }}>Ladowanie...</p>}

      {tests?.tests.map((yearGroup) => (
        <div key={yearGroup.year} style={{ marginBottom: 32 }}>
          <h2 style={styles.yearTitle}>{yearGroup.year}</h2>
          <div style={styles.grid}>
            {yearGroup.stages.map((stage) => {
              const color = STAGE_COLORS[stage.stage] || "#50d890";
              return (
                <Link
                  key={stage.stage}
                  to={`/${yearGroup.yearPath}/${stage.stage}`}
                  style={{ ...styles.card, textDecoration: "none", color: "inherit" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = color + "66";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1e1e2e";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ ...styles.stageBadge, background: color + "20", color }}>
                    {STAGE_LABELS[stage.stage]}
                  </div>
                  <div style={styles.cardInfo}>
                    <span style={{ color: "#7a7a90", fontSize: 13 }}>{stage.date}</span>
                    <span style={{ color: "#c8c8d8", fontSize: 14 }}>{stage.maxPoints} pkt</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "48px 20px",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 32,
    fontWeight: 900,
    marginBottom: 8,
    background: "linear-gradient(135deg, #50d890, #42b4f5, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    color: "#7a7a90",
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 32,
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#c8c8d8",
    marginBottom: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 12,
  },
  card: {
    display: "block",
    background: "#13131a",
    border: "1px solid #1e1e2e",
    borderRadius: 12,
    padding: "20px",
    transition: "border-color 0.2s, transform 0.2s",
  },
  stageBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 12,
  },
  cardInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
};
