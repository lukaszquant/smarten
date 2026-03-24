import TrueFalseNI from "./TrueFalseNI";
import GapFillSentences from "./GapFillSentences";
import MultipleChoice from "./MultipleChoice";
import OpenCloze from "./OpenCloze";
import WordSpelling from "./WordSpelling";
import WordFormation from "./WordFormation";
import Matching from "./Matching";
import MatchingColumns from "./MatchingColumns";
import KnowledgeQuestions from "./KnowledgeQuestions";
import SkippedTask from "./SkippedTask";

const COMPONENTS = {
  true_false_ni: TrueFalseNI,
  gap_fill_sentences: GapFillSentences,
  multiple_choice: MultipleChoice,
  dialogue_choice: MultipleChoice,
  open_cloze: OpenCloze,
  word_spelling: WordSpelling,
  word_formation: WordFormation,
  matching: Matching,
  matching_columns: MatchingColumns,
  knowledge_questions: KnowledgeQuestions,
};

const SKIPPED_TYPES = [
  "listening_true_false_ni",
  "listening_open",
  "sentence_transformation",
  "grammar_gaps",
];

export default function TaskRenderer({ task, answers, onChange, showResults, taskResult }) {
  if (task.skipped || SKIPPED_TYPES.includes(task.type)) {
    return <SkippedTask task={task} />;
  }

  const Comp = COMPONENTS[task.type];
  if (!Comp) {
    return (
      <div style={styles.unknown}>
        <p>Nieobsługiwany typ zadania: <code>{task.type}</code></p>
      </div>
    );
  }

  return <Comp task={task} answers={answers} onChange={onChange} showResults={showResults} taskResult={taskResult} />;
}

const styles = {
  unknown: {
    padding: 20,
    background: "#1a1a2e",
    borderRadius: 10,
    border: "1px solid #2a2a3e",
    color: "#7a7a90",
  },
};
