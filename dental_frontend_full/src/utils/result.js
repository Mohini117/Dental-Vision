export function normalizeCondition(value) {
  if (!value) return "Uncertain";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function pct(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "0.0%";
  }

  return `${(n * 100).toFixed(1)}%`;
}

export function getPrimaryFinding(result) {
  // The backend screening decision is authoritative for the UI.
  if (result?.screening?.primary_condition) {
    return {
      label: normalizeCondition(
        result.screening.primary_condition
      ),
      confidence: Number(
        result.screening.confidence ?? 0
      ),
      status:
        result.screening.status ||
        result.status ||
        "uncertain",
      source: "decision",
    };
  }

  // Fallback only when the backend does not provide screening.
  if (result?.classifier?.top_prediction) {
    return {
      label: normalizeCondition(
        result.classifier.top_prediction
      ),
      confidence: Number(
        result.classifier.confidence ?? 0
      ),
      status:
        result.classifier.status ||
        "uncertain",
      source: "classifier",
    };
  }

  return {
    label: "Uncertain",
    confidence: 0,
    status: "uncertain",
    source: "none",
  };
}

export function getConfidenceLevel(confidence) {
  const value = Number(confidence || 0);

  if (value >= 0.85) return "high";
  if (value >= 0.70) return "moderate";
  return "low";
}

export function getPrimaryMessage(result) {
  const finding = getPrimaryFinding(result);
  const confidence = finding.confidence;

  if (result?.status === "poor_image_quality") {
    return "Please retake the photo with better focus, lighting, and framing before relying on the result.";
  }

  if (result?.status === "possible_caries") {
    return "Possible caries was identified by the localized caries detector. A dentist should confirm the finding.";
  }

  if (result?.status === "prediction") {
    if (confidence >= 0.85) {
      return "The model has strong confidence in this screening result. It is still not a clinical diagnosis.";
    }

    return "The general condition classifier produced a screening result. Professional confirmation is recommended.";
  }

  if (result?.status === "mixed_evidence") {
    return "The models produced different signals. Review the localized caries finding and the general classifier together.";
  }

  return "The model is not confident enough to make a reliable screening prediction from this image.";
}
