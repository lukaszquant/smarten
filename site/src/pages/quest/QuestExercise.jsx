import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "../../App";
import { useDocumentHead } from "../../hooks";
import { scoreTest } from "../../lib/scoring";
import { loadProgress, saveProgress, processResult, getPlayerLevel } from "../../lib/questProgress";
import { getExerciseLevel, getNextExercise } from "../../lib/questData";
import TaskRenderer from "../../components/konkursy/TaskRenderer";

export default function QuestExercise() {
  const { branch, id } = useParams();
  const user = useUser();
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [xpInfo, setXpInfo] = useState(null);

  useDocumentHead("Quest Exercise", "SmartEn Quest exercise");

  useEffect(() => {
    document.body.style.background = "#f8f9fc";
    return () => { document.body.style.background = "#0a0a12"; };
  }, []);

  useEffect(() => {
    fetch(`/konkursy/angielski/data/quest/${id}.json`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    fetch("/konkursy/angielski/data/quest/index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(console.error);
  }, []);

  const handleChange = (itemId, value) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = () => {
    const res = scoreTest(data, answers);
    setResult(res);

    // Calculate and save XP
    const progress = loadProgress(user?.name);
    const info = processResult(progress, branch, id, res.earned, res.max);
    saveProgress(user?.name, progress);
    setXpInfo(info);
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
    setXpInfo(null);
    window.scrollTo(0, 0);
  };

  if (!data) {
    return <div style={styles.page}><p style={{ color: "#5a5e72" }}>Loading...</p></div>;
  }

  // Derive level context and next exercise from index
  const branchData = index?.branches?.find((b) => b.id === branch);
  const levelNum = branchData ? getExerciseLevel(branchData, id) : null;
  const next = branchData ? getNextExercise(branchData, id) : null;

  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Fredoka:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <Link to="/quest" style={styles.back}>&larr; Back to Quest</Link>

      {/* Level context */}
      {branchData && levelNum && (
        <div style={styles.levelContext}>
          <span style={{ color: branchData.color }}>{branchData.name}</span>
          <span style={{ color: "#9ca3af" }}> — Level {levelNum}</span>
        </div>
      )}

      <h1 style={styles.title}>{data.title}</h1>

      {/* Result banner */}
      {result && (
        <div style={{
          ...styles.resultBanner,
          borderColor: result.percentage >= 70 ? "#22c55e" : result.percentage >= 40 ? "#f59e0b" : "#ef4444",
        }}>
          <div style={styles.resultScore}>{result.earned}/{result.max}</div>
          <div style={styles.resultPercent}>{result.percentage}%</div>
          <div style={{
            ...styles.resultLabel,
            color: result.percentage >= 70 ? "#22c55e" : result.percentage >= 40 ? "#f59e0b" : "#ef4444",
          }}>
            {result.percentage >= 70 ? "Great job!" : result.percentage >= 40 ? "Good effort!" : "Keep practising!"}
          </div>

          {xpInfo && (
            <div style={styles.xpEarned}>
              <span style={styles.xpBadge}>+{xpInfo.xpEarned} XP</span>
              {xpInfo.levelUp && (
                <span style={styles.levelUpBadge}>Level Up! {xpInfo.newLevel.title}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tasks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {data.tasks.map((task) => {
          const taskRes = result?.tasks?.find((r) => r.taskId === task.id);
          return (
            <div key={task.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#1a1a2e", fontSize: 16, fontWeight: 700 }}>Task {task.id}</span>
                <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 600 }}>
                  {result && taskRes ? (
                    <span style={{ color: taskRes.earned === taskRes.max ? "#22c55e" : taskRes.earned > 0 ? "#f59e0b" : "#ef4444" }}>
                      {taskRes.earned}/{taskRes.max} pts
                    </span>
                  ) : (
                    `0\u2013${task.points} pts`
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

      {/* Submit button */}
      {!result && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button onClick={handleSubmit} style={styles.submitBtn}>Check answers</button>
        </div>
      )}

      {/* Post-result actions */}
      {result && (
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
          <button onClick={handleRetry} style={styles.retryBtn}>Try again</button>
          {next && (
            <Link to={`/quest/${next.branchId}/${next.exerciseId}`} style={styles.submitBtn}>
              Next exercise &rarr;
            </Link>
          )}
          <Link to="/quest" style={next ? styles.retryBtn : styles.submitBtn}>Back to Quest</Link>
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
    fontFamily: "'DM Sans', sans-serif",
  },
  back: {
    color: "#6b7280",
    textDecoration: "none",
    fontSize: 14,
    display: "inline-block",
    marginBottom: 8,
  },
  levelContext: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  title: {
    fontFamily: "'Fredoka', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 20,
  },
  resultBanner: {
    background: "#ffffff",
    border: "2px solid",
    borderRadius: 16,
    padding: "24px",
    textAlign: "center",
    marginBottom: 32,
  },
  resultScore: {
    fontSize: 36,
    fontWeight: 900,
    color: "#1a1a2e",
    fontFamily: "'Fredoka', sans-serif",
  },
  resultPercent: {
    fontSize: 20,
    fontWeight: 700,
    color: "#374151",
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 600,
    marginTop: 4,
  },
  xpEarned: {
    marginTop: 12,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  xpBadge: {
    display: "inline-block",
    background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    padding: "6px 16px",
    borderRadius: 20,
  },
  levelUpBadge: {
    display: "inline-block",
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    padding: "6px 16px",
    borderRadius: 20,
  },
  submitBtn: {
    display: "inline-block",
    background: "linear-gradient(135deg, #22c55e, #3b82f6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "14px 48px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: "none",
  },
  retryBtn: {
    display: "inline-block",
    background: "#e5e7eb",
    color: "#374151",
    border: "none",
    borderRadius: 10,
    padding: "14px 48px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: "none",
  },
};
