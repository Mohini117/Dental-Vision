import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  ClipboardList,
  RotateCcw,
} from "lucide-react";

import { QUESTIONS, RESULTS, START_ID } from "../data/questionnaireTree";

export default function Questionnaire({ onGoToScan }) {
  const [currentId, setCurrentId] = useState(START_ID);
  const [history, setHistory] = useState([]);

  const question = QUESTIONS[currentId];
  const result = RESULTS[currentId];

  function choose(nextId) {
    setHistory((previous) => [...previous, currentId]);
    setCurrentId(nextId);
  }

  function goBack() {
    setHistory((previous) => {
      if (previous.length === 0) return previous;
      const nextHistory = previous.slice(0, -1);
      setCurrentId(previous[previous.length - 1]);
      return nextHistory;
    });
  }

  function startOver() {
    setHistory([]);
    setCurrentId(START_ID);
  }

  return (
    <section className="panel questionnaire">
      <div className="panel-header inline">
        <div>
          <span className="step-label">RULE-BASED SCREENING</span>
          <h3>Symptom checker</h3>
        </div>

        <div className="evidence-chip">
          <ClipboardList size={14} />
          {result ? "Result" : `Question ${history.length + 1}`}
        </div>
      </div>

      <p className="questionnaire-note">
        Answer a few quick questions about what you're noticing. This is a
        simple guided checklist — no AI or photo is used here.
      </p>

      {question && (
        <div className="question-card">
          <div className="question-prompt">{question.prompt}</div>

          <div className="question-options">
            {question.options.map((option) => (
              <button
                key={option.label}
                type="button"
                className="question-option"
                onClick={() => choose(option.next)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="result-card">
          <div
            className={`result-urgency result-urgency-${result.urgency}`}
          >
            {result.urgency === "high"
              ? "See a dentist soon"
              : result.urgency === "moderate"
              ? "Worth checking further"
              : "Likely minor"}
          </div>

          <h4>{result.title}</h4>
          <p>{result.description}</p>

          <div className="result-recommendation">
            {result.recommendation}
          </div>

          <div className="result-actions">
            {result.suggestScan && (
              <button
                type="button"
                className="btn primary"
                onClick={onGoToScan}
              >
                <Camera size={16} />
                Run AI photo screening
              </button>
            )}

            <button
              type="button"
              className="btn ghost"
              onClick={startOver}
            >
              <RotateCcw size={16} />
              Start over
            </button>
          </div>

          <p className="questionnaire-disclaimer">
            This checklist is a general guide, not a diagnosis. When in
            doubt, a dentist visit is always the safest next step.
          </p>
        </div>
      )}

      {history.length > 0 && !result && (
        <button type="button" className="question-back" onClick={goBack}>
          <ArrowLeft size={14} />
          Back
        </button>
      )}
    </section>
  );
}