import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useDocumentHead } from "../hooks";
import { useUser } from "../App";
import TaskRenderer from "../components/konkursy/TaskRenderer";
import { scoreTest } from "../lib/scoring";

const STAGE_LABELS = { szkolny: "Etap szkolny", rejonowy: "Etap rejonowy", wojewodzki: "Etap wojewodzki" };

export default function KonkursTest() {
  const { year, stage } = useParams();
  const user = useUser();
  const storageKey = `smarten_konkursy_${user?.name || "default"}`;
  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  useDocumentHead(
    `${STAGE_LABELS[stage] || stage} ${year}`,
    "Test konkursowy z jezyka angielskiego"
  );

  useEffect(() => {
    fetch(`/konkursy/angielski/data/${year}/${stage}.json`)
      .then((r) => r.json())
      .then(setTestData)
      .catch(console.error);
  }, [year, stage]);

  const startTimer = useCallback(() => {
    if (!testData) return;
    const activePoints = testData.tasks.filter(t => !t.skipped).reduce((s, t) => s + t.points, 0);
    const ratio = testData.maxPoints > 0 ? activePoints / testData.maxPoints : 1;
    setTimeLeft(Math.round(testData.timeMinutes * ratio) * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [testData]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const handleStart = () => {
    setStarted(true);
    startTimer();
  };

  const handleChange = (itemId, value) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const res = scoreTest(testData, answers);
    setResult(res);
    const entry = {
      testId: `${year}/${stage}`,
      date: new Date().toISOString(),
      score: res.earned,
      maxScore: res.max,
      percentage: res.percentage,
      answers,
      taskBreakdown: res.tasks.map((t) => ({
        taskId: t.taskId,
        type: t.type,
        earned: t.earned,
        max: t.max,
        skipped: t.skipped,
      })),
    };
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const attempts = stored.attempts || [];
      attempts.push(entry);
      stored.attempts = attempts;
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch (e) {
      console.error("Failed to save results:", e);
    }
    fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user?.name, ...entry }),
    }).catch(() => {});
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!testData) {
    return (
      <div style={styles.page}>
        <p style={{ color: "#7a7a90" }}>Ladowanie testu...</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={styles.page}>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Playfair+Display:wght@700;900&display=swap"
          rel="stylesheet"
        />
        <Link to="/" style={styles.back}>&larr; Powrot do listy</Link>
        <h1 style={styles.title}>{STAGE_LABELS[stage] || stage}</h1>
        <p style={styles.subtitle}>{testData.year}</p>
        <div style={styles.infoCard}>
          <div style={styles.infoRow}><span>Czas:</span><strong>{Math.round(testData.timeMinutes * testData.tasks.filter(t => !t.skipped).reduce((s, t) => s + t.points, 0) / testData.maxPoints)} minut</strong></div>
          <div style={styles.infoRow}><span>Maks. punkty:</span><strong>{testData.tasks.filter(t => !t.skipped).reduce((s, t) => s + t.points, 0)} pkt</strong></div>
          <div style={styles.infoRow}><span>Liczba zadan:</span><strong>{testData.tasks.filter(t => !t.skipped).length}/{testData.tasks.length}</strong></div>
        </div>
        <button onClick={handleStart} style={styles.startBtn}>Rozpocznij test</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Playfair+Display:wght@700;900&display=swap"
        rel="stylesheet"
      />

      <div style={styles.stickyHeader}>
        <Link to="/" style={{ ...styles.back, margin: 0 }}>&larr;</Link>
        <span style={{ color: "#c8c8d8", fontWeight: 700, fontSize: 15 }}>
          {STAGE_LABELS[stage]} {testData.year}
        </span>
        {!result && timeLeft !== null && (
          <span style={{
            ...styles.timer,
            color: timeLeft < 300 ? "#e05050" : timeLeft < 600 ? "#f5a623" : "#50d890",
          }}>
            {formatTime(timeLeft)}
          </span>
        )}
        {result && (
          <span style={styles.score}>
            {result.earned}/{result.max} ({result.percentage}%)
          </span>
        )}
      </div>

      {result && (
        <div style={{
          ...styles.resultBanner,
          borderColor: result.percentage >= 70 ? "#50d890" : result.percentage >= 40 ? "#f5a623" : "#e05050",
        }}>
          <div style={styles.resultScore}>{result.earned}/{result.max}</div>
          <div style={styles.resultPct}>{result.percentage}%</div>
          <div style={styles.resultLabel}>
            {result.percentage >= 70 ? "Swietny wynik!" : result.percentage >= 40 ? "Niezly wynik" : "Trenuj dalej!"}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {testData.tasks.map((task) => {
          const taskRes = result?.tasks?.find((r) => r.taskId === task.id);
          return (
            <div key={task.id}>
              <div style={styles.taskHeader}>
                <span style={styles.taskNum}>Zadanie {task.id}</span>
                <span style={styles.taskPts}>
                  {result && taskRes ? (
                    <span style={{ color: taskRes.earned === taskRes.max ? "#50d890" : taskRes.earned > 0 ? "#f5a623" : "#e05050" }}>
                      {taskRes.earned}/{taskRes.max} pkt
                    </span>
                  ) : (
                    `0\u2013${task.points} pkt`
                  )}
                </span>
              </div>
              <TaskRenderer
                task={task}
                answers={answers}
                onChange={handleChange}
                showResults={!!result}
                taskResult={taskRes}
              />
            </div>
          );
        })}
      </div>

      {!result && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button onClick={handleSubmit} style={styles.submitBtn}>Sprawdz odpowiedzi</button>
        </div>
      )}

      {result && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link to="/" style={styles.submitBtn}>Powrot do listy testow</Link>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "20px 20px 60px",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  back: {
    color: "#7a7a90",
    textDecoration: "none",
    fontSize: 14,
    display: "inline-block",
    marginBottom: 16,
  },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 28,
    fontWeight: 900,
    color: "#e8e8f0",
    marginBottom: 4,
  },
  subtitle: { color: "#7a7a90", fontSize: 16, marginBottom: 24 },
  infoCard: {
    background: "#13131a",
    border: "1px solid #1e1e2e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #1e1e2e",
    color: "#c8c8d8",
    fontSize: 15,
  },
  startBtn: {
    display: "inline-block",
    background: "linear-gradient(135deg, #50d890, #42b4f5)",
    color: "#0d0d14",
    border: "none",
    borderRadius: 10,
    padding: "14px 48px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: "none",
  },
  stickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#0d0d14ee",
    backdropFilter: "blur(10px)",
    padding: "10px 16px",
    borderRadius: 10,
    marginBottom: 24,
    border: "1px solid #1e1e2e",
  },
  timer: { fontFamily: "monospace", fontSize: 18, fontWeight: 700 },
  score: { color: "#50d890", fontWeight: 700, fontSize: 16 },
  taskHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskNum: { color: "#e8e8f0", fontSize: 16, fontWeight: 700 },
  taskPts: { color: "#7a7a90", fontSize: 13, fontWeight: 600 },
  submitBtn: {
    display: "inline-block",
    background: "linear-gradient(135deg, #50d890, #42b4f5)",
    color: "#0d0d14",
    border: "none",
    borderRadius: 10,
    padding: "14px 48px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: "none",
  },
  resultBanner: {
    background: "#13131a",
    border: "2px solid",
    borderRadius: 16,
    padding: "24px",
    textAlign: "center",
    marginBottom: 32,
  },
  resultScore: {
    fontSize: 36,
    fontWeight: 900,
    color: "#e8e8f0",
    fontFamily: "'Playfair Display', serif",
  },
  resultPct: { fontSize: 20, fontWeight: 700, color: "#c8c8d8", marginBottom: 4 },
  resultLabel: { fontSize: 14, color: "#7a7a90" },
};
