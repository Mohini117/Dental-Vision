import type { ClassResult, DiagnosisFinding, DiagnosisResult } from "./types";
import { Condition } from "./types";
import {
  CONFIDENCE_THRESHOLDS,
  HEALTHY_CLASSIFICATION_MARGIN,
  MAX_FINDINGS,
  MIN_CLASSIFICATION_MARGIN,
} from "./thresholds";
import type { DetectorResult } from "./scanTeeth";

export const DISCLAIMER =
  "This is not a medical diagnosis. Consult a qualified dental professional for concerns.";

function probabilityMargin(probabilities: Record<string, number> | undefined, condition: Condition): number {
  if (!probabilities || Object.keys(probabilities).length === 0) return 0;
  const entries = Object.entries(probabilities)
    .filter(([, value]) => Number.isFinite(value))
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((first, second) => second.value - first.value);
  if (entries.length < 2) return 0;
  const top = entries[0];
  const second = entries.find((entry) => entry.label !== top.label) ?? entries[1];
  if (top.label !== condition) {
    return Math.max(0, top.value - second.value);
  }
  return Math.max(0, top.value - (second?.value ?? 0));
}

function isConfident(condition: Condition, confidence: number): boolean {
  return confidence >= (CONFIDENCE_THRESHOLDS[condition] ?? 1);
}

function hasClearMargin(condition: Condition, confidence: number, probabilities?: Record<string, number>): boolean {
  if (confidence <= 0) return false;
  const requiredMargin = condition === Condition.HEALTHY ? HEALTHY_CLASSIFICATION_MARGIN : MIN_CLASSIFICATION_MARGIN;
  const margin = probabilityMargin(probabilities, condition);
  return margin >= requiredMargin || confidence >= 0.85;
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

function buildFindingMessage(findings: DiagnosisFinding[]): string {
  const labels = findings.map((finding) => findingMessage(finding.condition));
  return labels.length === 1
    ? `The screening found signs consistent with ${labels[0]}.`
    : `The screening found signs consistent with ${labels[0]} and ${labels[1]}.`;
}

export function arbitrate(detector: DetectorResult, classifier: ClassResult): DiagnosisResult {
  const detectorTop = detector.topCanonicalClass;
  const detectorConfident = isConfident(detectorTop, detector.topConfidence);
  const classifierConfident = isConfident(classifier.condition, classifier.confidence);
  const classifierClear = hasClearMargin(classifier.condition, classifier.confidence, classifier.probabilities);

  if (detectorConfident && detectorTop === Condition.HEALTHY && !classifierConfident) {
    return {
      status: "healthy",
      findings: [],
      message: "No visible signs of the conditions this app screens for.",
      disclaimer: DISCLAIMER,
    };
  }

  if (classifierConfident && !classifierClear) {
    return {
      status: "uncertain",
      findings: [],
      message: "We couldn't confidently identify a specific condition from this photo. This doesn't mean there's nothing there — try a clearer, well-lit close-up, and see a dentist for any concerns.",
      disclaimer: DISCLAIMER,
    };
  }

  const findings: DiagnosisFinding[] = [];
  if (detectorConfident && detectorTop !== Condition.HEALTHY) {
    findings.push({ condition: detectorTop, confidence: detector.topConfidence, boundingBox: detector.topBox, source: "detector" });
  }
  if (classifierConfident && classifierClear) {
    findings.push({ condition: classifier.condition, confidence: classifier.confidence, source: "classifier" });
  }
  if (findings.length > 0) {
    const displayed = findings.sort((first, second) => second.confidence - first.confidence).slice(0, MAX_FINDINGS);
    return { status: "finding", findings: displayed, message: buildFindingMessage(displayed), disclaimer: DISCLAIMER };
  }

  return {
    status: "uncertain",
    findings: [],
    message: "We couldn't confidently identify a specific condition from this photo. This doesn't mean there's nothing there — try a clearer, well-lit close-up, and see a dentist for any concerns.",
    disclaimer: DISCLAIMER,
  };
}
