import { Condition } from "./types";

export const YOLO_LABEL_MAP: Record<string, Condition> = {
  cavity_or_decay: Condition.CAVITY_DECAY,
  "cavity or decay": Condition.CAVITY_DECAY,
  surface_stain: Condition.STAIN,
  "surface stain": Condition.STAIN,
  cavities: Condition.CAVITY_DECAY,
  primary_caries: Condition.CAVITY_DECAY,
  permanent_caries: Condition.CAVITY_DECAY,
  cavity: Condition.CAVITY_DECAY,
  decay: Condition.CAVITY_DECAY,
  decaycavity: Condition.CAVITY_DECAY,
  "decayed tooth": Condition.CAVITY_DECAY,
  earlydecay: Condition.CAVITY_DECAY,
  tooth_decay: Condition.CAVITY_DECAY,
  filling: Condition.FILLING,
  "black stain": Condition.STAIN,
  healthytooth: Condition.HEALTHY,
  normal: Condition.HEALTHY,
};

const CANONICAL_LABEL_MAP: Record<string, Condition> = {
  healthy: Condition.HEALTHY,
  cavity_or_decay: Condition.CAVITY_DECAY,
  filling: Condition.FILLING,
  surface_stain: Condition.STAIN,
  calculus: Condition.CALCULUS,
  gingivitis: Condition.GINGIVITIS,
  mouth_ulcer: Condition.MOUTH_ULCER,
  discoloration: Condition.DISCOLORATION,
  tooth_discoloration: Condition.DISCOLORATION,
  hypodontia: Condition.HYPODONTIA,
};

// TODO: verify against ground-truth images before treating index order as certain.
export const CLASSIFIER_LABEL_MAP: Record<string, Condition> = {
  Calculus: Condition.CALCULUS,
  "Dental Caries": Condition.CAVITY_DECAY,
  Gingivitis: Condition.GINGIVITIS,
  "Mouth Ulcer": Condition.MOUTH_ULCER,
  "Tooth Discoloration": Condition.DISCOLORATION,
  Caries: Condition.CAVITY_DECAY,
  Ulcers: Condition.MOUTH_ULCER,
  Hypodontia: Condition.HYPODONTIA,
  class_5: Condition.HYPODONTIA,
};

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replaceAll("-", "_");
}

function normalizeCanonicalLabel(value: string): string {
  return normalizeLabel(value).replaceAll(" ", "_");
}

export function mapYoloLabel(label: string): Condition | undefined {
  return YOLO_LABEL_MAP[normalizeLabel(label)]
    || YOLO_LABEL_MAP[normalizeCanonicalLabel(label)]
    || CANONICAL_LABEL_MAP[normalizeCanonicalLabel(label)];
}

export function isCavityOrDecayLabel(label: string | undefined | null): boolean {
  if (!label) return false;
  const condition = mapYoloLabel(label);
  if (!condition) return false;
  return condition === Condition.CAVITY_DECAY;
}

export function mapClassifierLabel(label: string): Condition | undefined {
  const trimmed = label.trim();
  return CANONICAL_LABEL_MAP[normalizeCanonicalLabel(trimmed)]
    || CLASSIFIER_LABEL_MAP[trimmed]
    || CLASSIFIER_LABEL_MAP[
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    ];
}

export function mapCanonicalLabel(
  label: string,
  source: "detector" | "classifier"
): Condition | undefined {
  return source === "detector"
    ? mapYoloLabel(label)
    : mapClassifierLabel(label);
}
