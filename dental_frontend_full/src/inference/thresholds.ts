import { Condition } from "./types";

// Starting values only: tune independently against a labeled validation set.
export const CONFIDENCE_THRESHOLDS: Record<Condition, number> = {
  [Condition.HEALTHY]: 0.45,
  [Condition.CAVITY_DECAY]: 0.6,
  [Condition.FILLING]: 0.58,
  [Condition.STAIN]: 0.58,
  [Condition.CALCULUS]: 0.58,
  [Condition.GINGIVITIS]: 0.58,
  [Condition.MOUTH_ULCER]: 0.58,
  [Condition.DISCOLORATION]: 0.5,
  [Condition.HYPODONTIA]: 0.58,
};

export const MIN_CLASSIFICATION_MARGIN = 0.12;
export const HEALTHY_CLASSIFICATION_MARGIN = 0.18;
export const MAX_FINDINGS = 2;
