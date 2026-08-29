export enum Condition {
  HEALTHY = "healthy",
  CAVITY_DECAY = "cavity_or_decay",
  FILLING = "filling",
  STAIN = "surface_stain",
  CALCULUS = "calculus",
  GINGIVITIS = "gingivitis",
  MOUTH_ULCER = "mouth_ulcer",
  DISCOLORATION = "discoloration",
  HYPODONTIA = "hypodontia",
}

export type DiagnosisStatus =
  | "no_face"
  | "no_teeth"
  | "not_close_up"
  | "poor_image_quality"
  | "possible_caries"
  | "prediction"
  | "retake_photo"
  | "healthy"
  | "finding"
  | "uncertain";

export type BoundingBox = [number, number, number, number];

export interface Detection {
  condition: Condition;
  confidence: number;
  boundingBox: BoundingBox;
  rawLabel?: string;
}

export interface ClassResult {
  condition: Condition;
  confidence: number;
  probabilities?: Record<string, number>;
  rawLabel?: string;
}

export interface DiagnosisFinding {
  condition: Condition;
  confidence: number;
  boundingBox?: BoundingBox;
  source: "detector" | "classifier" | "both";
}

export interface DiagnosisResult {
  status: DiagnosisStatus;
  findings: DiagnosisFinding[];
  message: string;
  disclaimer: string;
}
