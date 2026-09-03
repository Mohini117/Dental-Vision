import { useState } from "react";

import {
  Eye,
  MapPin,
  X,
} from "lucide-react";

import { isCavityOrDecayLabel } from "../inference/canonicalLabels";
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
  const [selectedIndex, setSelectedIndex] = useState(null);
  const cavityDetections = detections.filter((detection) =>
    isCavityOrDecayLabel(detection.class_name || detection.label || detection.condition)
  );
  const safeWidth = Number(width || 0);
  const safeHeight = Number(height || 0);
  const selected =
    selectedIndex != null ? cavityDetections[selectedIndex] : null;

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
          {cavityDetections.length} region
          {cavityDetections.length === 1
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
          cavityDetections.map((detection, index) => {
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

            const isSelected = selectedIndex === index;

            return (
              <div
                key={`${detection.class_name}-${index}`}
                className={`box-overlay${isSelected ? " box-overlay-selected" : ""}`}
                role="button"
                tabIndex={0}
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
                  cursor: "pointer",
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedIndex(isSelected ? null : index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedIndex(isSelected ? null : index);
                  }
                }}
              >
                <span>
                  {detection.subtype_label ||
                    normalizeCondition(detection.class_name)}{" "}
                  {pct(detection.confidence)}
                </span>
              </div>
            );
          })}

        {selected && (
          <div
            className="detection-popover"
            style={{
              left: `${Math.min(
                85,
                (Number(selected.bbox?.x1 || 0) / safeWidth) * 100
              )}%`,
              top: `${Math.min(
                80,
                (Number(selected.bbox?.y2 || 0) / safeHeight) * 100
              )}%`,
            }}
          >
            <button
              type="button"
              className="detection-popover-close"
              onClick={() => setSelectedIndex(null)}
              aria-label="Close details"
            >
              <X size={14} />
            </button>

            <strong>
              {selected.subtype_label ||
                normalizeCondition(selected.class_name)}
            </strong>

            <span className="detection-popover-confidence">
              {pct(selected.confidence)} confident
            </span>

            {selected.severity && (
              <div className="detection-popover-severity">
                <span>Severity (estimated)</span>
                <span
                  className={`severity-badge severity-${selected.severity.toLowerCase()}`}
                >
                  {selected.severity}
                </span>
              </div>
            )}
          </div>
        )}

        {cavityDetections.length > 0 && (
          <div className="overlay-legend">
            <MapPin size={14} />
            Highlighted regions are possible model detections. Tap a region for details.
          </div>
        )}
      </div>
    </section>
  );
}