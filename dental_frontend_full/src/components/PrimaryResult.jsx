import {
  AlertCircle,
  CheckCircle2,
  Crosshair,
  Info,
} from "lucide-react";

import {
  getConfidenceLevel,
  getPrimaryFinding,
  getPrimaryMessage,
  pct,
} from "../utils/result";

export default function PrimaryResult({ result }) {
  const finding = getPrimaryFinding(result);
  const level = getConfidenceLevel(
    finding.confidence
  );

  const icon =
    result?.status === "possible_caries" ? (
      <Crosshair size={19} />
    ) : result?.status === "prediction" ? (
      <CheckCircle2 size={19} />
    ) : (
      <AlertCircle size={19} />
    );

  return (
    <section
      className={`panel primary-result ${level}`}
    >
      <div className="result-top">
        <div>
          <span className="step-label">
            02 · PRIMARY SCREENING RESULT
          </span>

          <h2>{finding.label}</h2>
        </div>

        <div className="result-icon">
          {icon}
        </div>
      </div>

      <div className="confidence-number">
        {pct(finding.confidence)}
      </div>

      <div className="confidence-label">
        {level === "high"
          ? "High model confidence"
          : level === "moderate"
          ? "Moderate model confidence"
          : "Low model confidence"}
      </div>

      <div className="confidence-track">
        <div
          className="confidence-fill"
          style={{
            width: `${Math.min(
              100,
              finding.confidence * 100
            )}%`,
          }}
        />
      </div>

      <div className="result-message">
        <Info size={16} />
        <span>
          {getPrimaryMessage(result)}
        </span>
      </div>
    </section>
  );
}
