import { Condition } from "./types";

// Starting values only: tune independently against a labeled validation set.
export const CONFIDENCE_THRESHOLDS: Record<Condition, number> = {
  [Condition.HEALTHY]: 0.4,
  [Condition.CAVITY_DECAY]: 0.55,
  [Condition.FILLING]: 0.5,
  [Condition.STAIN]: 0.5,
  [Condition.CALCULUS]: 0.5,
  [Condition.GINGIVITIS]: 0.5,
  [Condition.MOUTH_ULCER]: 0.5,
  [Condition.DISCOLORATION]: 0.45,
  [Condition.HYPODONTIA]: 0.5,
};

export const MAX_FINDINGS = 2;
