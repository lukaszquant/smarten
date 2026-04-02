import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../../App";
import { useDocumentHead } from "../../hooks";
import { loadProgress, saveProgress, getPlayerTitle, isBranchComplete, isLevelComplete, getHighestUnlockedLevel, fetchRemoteProgress, pushRemoteProgress, mergeProgress } from "../../lib/questProgress";
import { STARS_TO_UNLOCK, TYPE_LABELS, flattenExercises } from "../../lib/questData";
import { percentageToStars, computeLevelStars } from "../../lib/questStars";

function StarDisplay({ count, max = 5, size = 16 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      {"★".repeat(count)}{"☆".repeat(max - count)}
    </span>
  );
}

export default function QuestHome() {
  const user = useUser();
  const [index, setIndex] = useState(null);
  const [progress, setProgress] = useState(null);
  const [expanded, setExpanded] = useState({}); // { "vocabulary-2": true }
  const [showHelp, setShowHelp] = useState(false);

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
    setProgress(local);

    fetchRemoteProgress(user.name).then((remote) => {
      const merged = remote ? mergeProgress(local, remote) : local;
      setProgress(merged);
      saveProgress(user.name, merged);
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

  const titleInfo = getPlayerTitle(progress.stars);

  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Fredoka:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>SmartEn Quest</h1>
        <p style={styles.subtitle}>Practice English, earn stars, level up!</p>
      </div>

      {/* Stars & Title Card */}
      <div style={styles.starsCard}>
        <div style={styles.starsTop}>
          <span style={styles.starsTitle}>{titleInfo.title}</span>
          <span style={styles.starsCount}>
            <span style={{ color: "#f59e0b", fontSize: 18 }}>★</span> {progress.stars}
          </span>
        </div>
        <div style={styles.starsBarOuter}>
          <div style={{ ...styles.starsBarInner, width: `${Math.round(titleInfo.progress * 100)}%` }} />
        </div>
        {titleInfo.starsForNext > 0 && (
          <div style={styles.starsNext}>{titleInfo.starsForNext - titleInfo.starsInLevel} stars to next title</div>
        )}
      </div>

      {/* How does it work? */}
      <button
        onClick={() => setShowHelp((v) => !v)}
        style={styles.helpToggle}
      >
        How does it work? {showHelp ? "▲" : "▼"}
      </button>
      {showHelp && (
        <div style={styles.helpCard}>
          <p style={styles.helpText}>
            <strong>Earn stars</strong> for each exercise you complete:
          </p>
          <div style={styles.helpStars}>
            <span>☆☆☆☆☆ — 0%</span>
            <span>★☆☆☆☆ — 1–39%</span>
            <span>★★☆☆☆ — 40–59%</span>
            <span>★★★☆☆ — 60–79%</span>
            <span>★★★★☆ — 80–99%</span>
            <span>★★★★★ — 100%</span>
          </div>
          <p style={styles.helpText}>
            Collect <strong>{STARS_TO_UNLOCK} stars</strong> in a level to unlock the next one.
            The more stars you earn, the higher your title!
          </p>
        </div>
      )}

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
                const lvlStars = computeLevelStars(branchProgress.bestScores, lvl.exercises);
                const lvlMaxStars = lvl.exercises.length * 5;
                const key = `${branch.id}-${lvl.level}`;
                const isDefaultExpanded = !locked && !lvlComplete;
                const isExpanded = expanded[key] !== undefined ? expanded[key] : isDefaultExpanded;

                return (
                  <div key={lvl.level} style={{ marginBottom: 4 }}>
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
                      <span style={styles.levelStars}>
                        {!locked && (
                          <span style={{ color: "#f59e0b", fontSize: 12, marginRight: 4 }}>
                            ★ {lvlStars}/{lvlMaxStars}
                          </span>
                        )}
                        <span style={styles.levelArrow}>
                          {locked ? "" : isExpanded ? "▲" : "▼"}
                        </span>
                      </span>
                    </button>

                    {isExpanded && !locked && (
                      <div style={styles.exerciseList}>
                        {lvl.exercises.map((ex) => {
                          const best = branchProgress.bestScores[ex.id];
                          const hasBest = best !== undefined;
                          const stars = hasBest ? percentageToStars(best) : 0;
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
                                color: hasBest ? "#f59e0b" : "#9ca3af",
                              }}>
                                {hasBest ? <StarDisplay count={stars} size={14} /> : "Not started"}
                              </span>
                            </Link>
                          );
                        })}
                        {!lvlComplete && (
                          <div style={styles.unlockHint}>
                            {STARS_TO_UNLOCK - lvlStars > 0
                              ? `${STARS_TO_UNLOCK - lvlStars} more star${STARS_TO_UNLOCK - lvlStars === 1 ? "" : "s"} to unlock the next level`
                              : ""}
                          </div>
                        )}
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
  starsCard: {
    background: "#ffffff",
    border: "1px solid #e2e4ea",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 16,
  },
  starsTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  starsTitle: {
    fontFamily: "'Fredoka', sans-serif",
    fontWeight: 600,
    fontSize: 18,
    color: "#8b5cf6",
  },
  starsCount: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a1a2e",
  },
  starsBarOuter: {
    height: 10,
    background: "#e5e7eb",
    borderRadius: 5,
    overflow: "hidden",
  },
  starsBarInner: {
    height: "100%",
    background: "linear-gradient(90deg, #f59e0b, #f97316)",
    borderRadius: 5,
    transition: "width 0.4s ease",
  },
  starsNext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
    textAlign: "right",
  },
  helpToggle: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    padding: "8px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#6b7280",
    cursor: "pointer",
    textAlign: "center",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 12,
  },
  helpCard: {
    background: "#ffffff",
    border: "1px solid #e2e4ea",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 20,
  },
  helpText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 1.5,
    margin: "0 0 10px",
  },
  helpStars: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontSize: 13,
    color: "#6b7280",
    padding: "8px 12px",
    background: "#f8f9fc",
    borderRadius: 8,
    marginBottom: 10,
    fontFamily: "monospace",
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
  levelStars: {
    display: "flex",
    alignItems: "center",
    gap: 4,
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
  unlockHint: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    padding: "6px 0 2px",
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
