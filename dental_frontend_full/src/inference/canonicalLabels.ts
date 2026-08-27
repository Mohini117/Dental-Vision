import { Condition } from "./types";

export const YOLO_LABEL_MAP: Record<string, Condition> = {
  cavity_or_decay: Condition.CAVITY_DECAY,
  "cavity or decay": Condition.CAVITY_DECAY,
  surface_stain: Condition.STAIN,
  "surface stain": Condition.STAIN,
  cavities: Condition.CAVITY_DECAY,
  cavity: Condition.CAVITY_DECAY,
  decay: Condition.CAVITY_DECAY,
  decaycavity: Condition.CAVITY_DECAY,
  "decayed tooth": Condition.CAVITY_DECAY,
  earlydecay: Condition.CAVITY_DECAY,
  "tooth-decay": Condition.CAVITY_DECAY,
  filling: Condition.FILLING,
  "black stain": Condition.STAIN,
  healthytooth: Condition.HEALTHY,
  normal: Condition.HEALTHY,
};

// TODO: verify against ground-truth images before treating index order as certain.
export const CLASSIFIER_LABEL_MAP: Record<string, Condition> = {
  Calculus: Condition.CALCULUS,
  "Dental Caries": Condition.CAVITY_DECAY,
  Gingivitis: Condition.GINGIVITIS,
  "Mouth Ulcer": Condition.MOUTH_ULCER,
  "Tooth Discoloration": Condition.DISCOLORATION,
};

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replaceAll("-", "_");
}

export function mapYoloLabel(label: string): Condition | undefined {
  return YOLO_LABEL_MAP[normalizeLabel(label)];
}

export function mapClassifierLabel(label: string): Condition | undefined {
  return CLASSIFIER_LABEL_MAP[label.trim()];
}

export function mapCanonicalLabel(
  label: string,
  source: "detector" | "classifier"
): Condition | undefined {
  return source === "detector"
    ? mapYoloLabel(label)
    : mapClassifierLabel(label);
}
