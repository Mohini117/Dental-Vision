import {
  Brain,
  BarChart3,
} from "lucide-react";

import {
  normalizeCondition,
  pct,
} from "../utils/result";

export default function ClassifierBreakdown({
  result,
}) {
  const probabilities =
    result?.classifier?.probabilities || {};

  const entries = Object.entries(
    probabilities
  ).sort(
    ([, a], [, b]) =>
      Number(b) - Number(a)
  );

  return (
    <section className="panel">
      <div className="panel-header inline">
        <div>
          <span className="step-label">
            SUPPORTING EVIDENCE
          </span>
          <h3>
            General condition classifier
          </h3>
        </div>

        <div className="evidence-icon">
          <Brain size={18} />
        </div>
      </div>

      <div className="supporting-callout">
        <BarChart3 size={16} />
        <div>
          <strong>
            {result?.classifier
              ?.top_prediction
              ? normalizeCondition(
                  result.classifier
                    .top_prediction
                )
              : "Uncertain"}
          </strong>

          <span>
            {pct(
              result?.classifier
                ?.confidence
            )} top probability
          </span>
        </div>
      </div>

      <div className="probability-list">
        {entries.map(
          ([name, probability]) => (
            <div
              className="probability-row"
              key={name}
            >
              <div className="probability-label">
                <span>
                  {normalizeCondition(name)}
                </span>

                <strong>
                  {pct(probability)}
                </strong>
              </div>

              <div className="probability-track">
                <div
                  className="probability-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        Number(
                          probability
                        ) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
