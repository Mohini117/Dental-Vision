import { Condition } from "./types";

// Starting values only: tune independently against a labeled validation set.
export const CONFIDENCE_THRESHOLDS: Record<Condition, number> = {
  [Condition.HEALTHY]: 0.4,
  [Condition.CAVITY_DECAY]: 0.3,
  [Condition.FILLING]: 0.7,
  [Condition.STAIN]: 0.7,
  [Condition.CALCULUS]: 0.7,
  [Condition.GINGIVITIS]: 0.7,
  [Condition.MOUTH_ULCER]: 0.7,
  [Condition.DISCOLORATION]: 0.7,
  [Condition.HYPODONTIA]: 0.7,
};

export const MAX_FINDINGS = 2;
