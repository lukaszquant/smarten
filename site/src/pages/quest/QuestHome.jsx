import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../../App";
import { useDocumentHead } from "../../hooks";
import { loadProgress, saveProgress, getPlayerLevel, isBranchComplete, isLevelComplete, getHighestUnlockedLevel, fetchRemoteProgress, pushRemoteProgress, mergeProgress } from "../../lib/questProgress";
import { TYPE_LABELS, flattenExercises } from "../../lib/questData";

export default function QuestHome() {
  const user = useUser();
  const [index, setIndex] = useState(null);
  const [progress, setProgress] = useState(null);
  const [expanded, setExpanded] = useState({}); // { "vocabulary-2": true }

  useDocumentHead("SmartEn Quest", "Fun English practice for young learners");

  useEffect(() => {
    document.body.style.background = "#f8f9fc";
    return () => { document.body.style.background = "#0a0a12"; };
  }, []);

  useEffect(() => {
    fetch("/konkursy/angielski/data/quest/index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) return;
    const local = loadProgress(user.name);
    setProgress(local); // Render immediately from localStorage

    fetchRemoteProgress(user.name).then((remote) => {
      const merged = remote ? mergeProgress(local, remote) : local;
      setProgress(merged);
      saveProgress(user.name, merged);
      // Always push merged state to KV (first-time backup or re-upload local-only progress)
      pushRemoteProgress(user.name, merged).then((serverResult) => {
        if (serverResult) {
          setProgress(serverResult);
          saveProgress(user.name, serverResult);
        }
      });
    });
  }, [user]);

  if (!index || !progress) {
    return <div style={styles.page}><p style={{ color: "#5a5e72" }}>Loading...</p></div>;
  }

  const level = getPlayerLevel(progress.xp);

  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Fredoka:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>SmartEn Quest</h1>
        <p style={styles.subtitle}>Practice English, earn XP, level up!</p>
      </div>

      {/* XP Bar */}
      <div style={styles.xpCard}>
        <div style={styles.xpTop}>
          <span style={styles.xpLevel}>Level {level.level}</span>
          <span style={styles.xpTitle}>{level.title}</span>
          <span style={styles.xpAmount}>{progress.xp} XP</span>
        </div>
        <div style={styles.xpBarOuter}>
          <div style={{ ...styles.xpBarInner, width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        {level.xpForNext > 0 && (
          <div style={styles.xpNext}>{level.xpForNext - level.xpInLevel} XP to next level</div>
        )}
      </div>

      {/* Branch Cards */}
      <div style={styles.branches}>
        {index.branches.map((branch) => {
          const branchProgress = progress.branches[branch.id] || { bestScores: {} };
          const allExercises = flattenExercises(branch);
          const completedCount = allExercises.filter(
            (ex) => ex.id in branchProgress.bestScores
          ).length;
          const complete = isBranchComplete(progress, branch.id, branch);
          const highestUnlocked = getHighestUnlockedLevel(progress, branch.id, branch.levels);

          return (
            <div key={branch.id} style={{ ...styles.branchCard, borderLeftColor: branch.color }}>
              <div style={styles.branchHeader}>
                <h2 style={{ ...styles.branchName, color: branch.color }}>{branch.name}</h2>
                <span style={styles.branchCount}>
                  {completedCount}/{allExercises.length} done
                </span>
              </div>

              {/* Levels */}
              {branch.levels.map((lvl) => {
                const locked = lvl.level > highestUnlocked;
                const lvlComplete = isLevelComplete(progress, branch.id, lvl.exercises);
                const key = `${branch.id}-${lvl.level}`;
                // Default: expand the highest unlocked incomplete level
                const isDefaultExpanded = !locked && !lvlComplete;
                const isExpanded = expanded[key] !== undefined ? expanded[key] : isDefaultExpanded;

                return (
                  <div key={lvl.level} style={{ marginBottom: 4 }}>
                    {/* Level header — clickable unless locked */}
                    <button
                      onClick={() => {
                        if (locked) return;
                        setExpanded((prev) => ({ ...prev, [key]: !isExpanded }));
                      }}
                      style={{
                        ...styles.levelHeader,
                        cursor: locked ? "default" : "pointer",
                        opacity: locked ? 0.45 : 1,
                      }}
                    >
                      <span style={styles.levelTitle}>
                        {locked ? "\u{1F512} " : lvlComplete ? "\u2705 " : ""}
                        Level {lvl.level}: {lvl.title}
                      </span>
                      <span style={styles.levelArrow}>
                        {locked ? "" : isExpanded ? "\u25B2" : "\u25BC"}
                      </span>
                    </button>

                    {/* Exercise list */}
                    {isExpanded && !locked && (
                      <div style={styles.exerciseList}>
                        {lvl.exercises.map((ex) => {
                          const best = branchProgress.bestScores[ex.id];
                          const hasBest = best !== undefined;
                          return (
                            <Link
                              key={ex.id}
                              to={`/quest/${branch.id}/${ex.id}`}
                              style={styles.exerciseRow}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f0f2f6";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <span style={styles.exerciseTitle}>{ex.title}</span>
                              <span style={{
                                ...styles.exerciseScore,
                                color: hasBest
                                  ? (best >= 70 ? "#16a34a" : best >= 40 ? "#d97706" : "#dc2626")
                                  : "#9ca3af",
                              }}>
                                {hasBest ? `${best}%` : "Not started"}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {complete && (
                <div style={styles.bridgeCard}>
                  <p style={styles.bridgeText}>Ready for the real challenge?</p>
                  <div style={styles.bridgeLinks}>
                    {branch.bridgeTypes.map((type) => (
                      <Link key={type} to={`/cwiczenia/${type}`} style={{ ...styles.bridgeLink, color: branch.color }}>
                        {TYPE_LABELS[type] || type} &rarr;
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "24px 20px 60px",
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: 28,
  },
  title: {
    fontFamily: "'Fredoka', sans-serif",
    fontSize: 32,
    fontWeight: 700,
    background: "linear-gradient(135deg, #f59e0b, #8b5cf6, #3b82f6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#5a5e72",
    fontWeight: 500,
  },
  xpCard: {
    background: "#ffffff",
    border: "1px solid #e2e4ea",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 28,
  },
  xpTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  xpLevel: {
    fontFamily: "'Fredoka', sans-serif",
    fontWeight: 600,
    fontSize: 16,
    color: "#1a1a2e",
  },
  xpTitle: {
    fontSize: 14,
    color: "#8b5cf6",
    fontWeight: 600,
  },
  xpAmount: {
    marginLeft: "auto",
    fontSize: 14,
    fontWeight: 700,
    color: "#1a1a2e",
  },
  xpBarOuter: {
    height: 10,
    background: "#e5e7eb",
    borderRadius: 5,
    overflow: "hidden",
  },
  xpBarInner: {
    height: "100%",
    background: "linear-gradient(90deg, #8b5cf6, #3b82f6)",
    borderRadius: 5,
    transition: "width 0.4s ease",
  },
  xpNext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
    textAlign: "right",
  },
  branches: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  branchCard: {
    background: "#ffffff",
    border: "1px solid #e2e4ea",
    borderLeft: "4px solid",
    borderRadius: 12,
    padding: "16px 20px",
  },
  branchHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  branchName: {
    fontFamily: "'Fredoka', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
  },
  branchCount: {
    fontSize: 13,
    fontWeight: 600,
    color: "#6b7280",
  },
  levelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "8px 12px",
    border: "none",
    borderRadius: 8,
    background: "#f8f9fc",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: 600,
  },
  levelArrow: {
    fontSize: 10,
    color: "#9ca3af",
  },
  exerciseList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingLeft: 8,
  },
  exerciseRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 8,
    textDecoration: "none",
    transition: "background 0.15s",
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1a1a2e",
  },
  exerciseScore: {
    fontSize: 13,
    fontWeight: 600,
  },
  bridgeCard: {
    marginTop: 12,
    padding: "12px 16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
  },
  bridgeText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#16a34a",
    marginBottom: 8,
  },
  bridgeLinks: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
  bridgeLink: {
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
  },
};
