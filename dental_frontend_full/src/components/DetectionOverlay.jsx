import {
  Eye,
  MapPin,
} from "lucide-react";

import {
  normalizeCondition,
  pct,
} from "../utils/result";

export default function DetectionOverlay({
  src,
  width,
  height,
  detections = [],
}) {
  const safeWidth = Number(width || 0);
  const safeHeight = Number(height || 0);

  return (
    <section className="panel">
      <div className="panel-header inline">
        <div>
          <span className="step-label">
            VISUAL EVIDENCE
          </span>
          <h3>Localized findings</h3>
        </div>

        <div className="evidence-chip">
          <Eye size={14} />
          {detections.length} region
          {detections.length === 1
            ? ""
            : "s"}
        </div>
      </div>

      <div className="image-evidence">
        <img
          src={src}
          alt="Analyzed intraoral image with model findings"
        />

        {safeWidth > 0 &&
          safeHeight > 0 &&
          detections.map((detection, index) => {
            // Native boxes are already mapped from model space through the
            // letterbox padding back into the EXIF-oriented displayed image.
            const x1 =
              (Number(detection.bbox?.x1 || 0) /
                safeWidth) *
              100;

            const y1 =
              (Number(detection.bbox?.y1 || 0) /
                safeHeight) *
              100;

            const x2 =
              (Number(detection.bbox?.x2 || 0) /
                safeWidth) *
              100;

            const y2 =
              (Number(detection.bbox?.y2 || 0) /
                safeHeight) *
              100;

            return (
              <div
                key={`${detection.class_name}-${index}`}
                className="box-overlay"
                style={{
                  left: `${x1}%`,
                  top: `${y1}%`,
                  width: `${Math.max(
                    0,
                    x2 - x1
                  )}%`,
                  height: `${Math.max(
                    0,
                    y2 - y1
                  )}%`,
                }}
              >
                <span>
                  {normalizeCondition(
                    detection.class_name
                  )}{" "}
                  {pct(detection.confidence)}
                </span>
              </div>
            );
          })}

        {detections.length > 0 && (
          <div className="overlay-legend">
            <MapPin size={14} />
            Highlighted regions are possible model detections.
          </div>
        )}
      </div>
    </section>
  );
}
