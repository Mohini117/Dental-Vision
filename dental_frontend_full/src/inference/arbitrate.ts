import { Condition, ClassResult, Detection, DiagnosisResult } from "./types";
import { CONFIDENCE_THRESHOLDS, MAX_FINDINGS } from "./thresholds";

export const DISCLAIMER =
  "This is not a medical diagnosis. Consult a qualified dental professional for concerns.";

function isConfident(condition: Condition, confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLDS[condition];
}

function findingMessage(condition: Condition): string {
  const labels: Record<Condition, string> = {
    [Condition.HEALTHY]: "healthy-looking areas",
    [Condition.CAVITY_DECAY]: "cavity or decay",
    [Condition.FILLING]: "a filling",
    [Condition.STAIN]: "a surface stain",
    [Condition.CALCULUS]: "calculus",
    [Condition.GINGIVITIS]: "gingivitis",
    [Condition.MOUTH_ULCER]: "a mouth ulcer",
    [Condition.DISCOLORATION]: "tooth discoloration",
    [Condition.HYPODONTIA]: "possible missing teeth",
  };
  return labels[condition];
}

function detectorFindings(detections: Detection[]): Detection[] {
  return detections
    .filter((detection) => isConfident(detection.condition, detection.confidence))
    .sort((first, second) => second.confidence - first.confidence)
    .slice(0, MAX_FINDINGS);
}

export function arbitrate(
  detections: Detection[],
  classification: ClassResult
): DiagnosisResult {
  const findings = detectorFindings(detections);
  const topDetector = findings[0];
  const classifierConfident = isConfident(
    classification.condition,
    classification.confidence
  );
  const detectorConfident = Boolean(topDetector);

  if (detectorConfident && classifierConfident && topDetector.condition === classification.condition) {
    return {
      status: topDetector.condition === Condition.HEALTHY ? "healthy" : "finding",
      findings: [{
        condition: topDetector.condition,
        confidence: Math.max(topDetector.confidence, classification.confidence),
        boundingBox: topDetector.boundingBox,
        source: "both",
      }],
      message: `The photo shows signs consistent with ${findingMessage(topDetector.condition)}.`,
      disclaimer: DISCLAIMER,
    };
  }

  if (detectorConfident && !classifierConfident) {
    return {
      status: topDetector.condition === Condition.HEALTHY ? "healthy" : "finding",
      findings: findings.map((detection) => ({
        condition: detection.condition,
        confidence: detection.confidence,
        boundingBox: detection.boundingBox,
        source: "detector",
      })),
      message: `The localized screening found signs consistent with ${findingMessage(topDetector.condition)}.`,
      disclaimer: DISCLAIMER,
    };
  }

  if (!detectorConfident && classifierConfident) {
    return {
      status: classification.condition === Condition.HEALTHY ? "healthy" : "finding",
      findings: [{
        condition: classification.condition,
        confidence: classification.confidence,
        source: "classifier",
      }],
      message: `This photo shows signs consistent with ${findingMessage(classification.condition)}.`,
      disclaimer: DISCLAIMER,
    };
  }

  if (detectorConfident && classifierConfident) {
    const detectorPreferred = [
      Condition.CAVITY_DECAY,
      Condition.FILLING,
      Condition.STAIN,
    ].includes(topDetector.condition);
    const preferred = detectorPreferred || topDetector.confidence >= classification.confidence
      ? { condition: topDetector.condition, confidence: topDetector.confidence, boundingBox: topDetector.boundingBox, source: "detector" as const }
      : { condition: classification.condition, confidence: classification.confidence, source: "classifier" as const };

    return {
      status: preferred.condition === Condition.HEALTHY ? "healthy" : "finding",
      findings: [preferred],
      message: `The screening found signs consistent with ${findingMessage(preferred.condition)}.`,
      disclaimer: DISCLAIMER,
    };
  }

  if (classification.condition === Condition.HEALTHY) {
    return {
      status: "healthy",
      findings: [],
      message: "No obvious signs of the conditions this app screens for were identified.",
      disclaimer: DISCLAIMER,
    };
  }

  return {
    status: "uncertain",
    findings: [],
    message: "We couldn't confidently identify a specific condition from this photo. This doesn't mean there's nothing there; consider retaking the photo in better lighting or closer up, and consult a dentist for any concerns.",
    disclaimer: DISCLAIMER,
  };
}
