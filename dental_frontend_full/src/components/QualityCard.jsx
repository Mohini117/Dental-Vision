import {
  Check,
  TriangleAlert,
} from "lucide-react";

export default function QualityCard({
  quality,
}) {
  if (!quality) return null;

  const warnings =
    quality.warnings || [];

  return (
    <section className="panel">
      <div className="panel-header inline">
        <div>
          <span className="step-label">
            IMAGE QUALITY
          </span>

          <h3>
            {quality.acceptable
              ? "Suitable for screening"
              : "Retake recommended"}
          </h3>
        </div>

        <div
          className={`quality-status ${
            quality.acceptable
              ? "good"
              : "warning"
          }`}
        >
          {quality.acceptable ? (
            <Check size={17} />
          ) : (
            <TriangleAlert size={17} />
          )}
        </div>
      </div>

      <div className="quality-grid">
        <div>
          <span>Resolution</span>
          <strong>
            {quality.width} ×{" "}
            {quality.height}
          </strong>
        </div>

        <div>
          <span>Brightness</span>
          <strong>
            {Number(
              quality.brightness || 0
            ).toFixed(0)}
          </strong>
        </div>

        <div>
          <span>Sharpness</span>
          <strong>
            {Number(
              quality.blur_score || 0
            ).toFixed(0)}
          </strong>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="quality-warnings">
          {warnings.map((warning) => (
            <div key={warning}>
              <TriangleAlert size={14} />
              {warning}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
