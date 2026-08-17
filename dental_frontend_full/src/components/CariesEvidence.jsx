import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
} from "lucide-react";

import {
  normalizeCondition,
  pct,
} from "../utils/result";

export default function CariesEvidence({
  result,
}) {
  const detections =
    result?.caries_detections || [];

  const strongest =
    detections.length > 0
      ? [...detections].sort(
          (a, b) =>
            Number(b.confidence) -
            Number(a.confidence)
        )[0]
      : null;

  return (
    <section className="panel">
      <div className="panel-header inline">
        <div>
          <span className="step-label">
            LOCALIZED CARIES MODEL
          </span>

          <h3>
            Caries screening
          </h3>
        </div>

        <div className="evidence-icon warning">
          <Crosshair size={18} />
        </div>
      </div>

      {result?.caries_detected ? (
        <div className="caries-detected">
          <CheckCircle2 size={20} />
          <div>
            <strong>
              Possible caries detected
            </strong>

            <span>
              {strongest
                ? `${normalizeCondition(
                    strongest.class_name
                  )} · ${pct(
                    strongest.confidence
                  )}`
                : "Review the highlighted region."}
            </span>
          </div>
        </div>
      ) : (
        <div className="caries-clear">
          <AlertTriangle size={19} />
          <div>
            <strong>
              No caries region reported
            </strong>

            <span>
              This does not rule out dental disease.
            </span>
          </div>
        </div>
      )}

      {detections.length > 0 && (
        <div className="detection-table">
          {detections.map(
            (detection, index) => (
              <div
                className="detection-line"
                key={`${detection.class_name}-${index}`}
              >
                <span>
                  {normalizeCondition(
                    detection.class_name
                  )}
                </span>

                <strong>
                  {pct(
                    detection.confidence
                  )}
                </strong>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
