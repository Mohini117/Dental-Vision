import type { BoundingBox } from "./types";

export interface FaceLandmark {
  type: string;
  position: { x: number; y: number };
}

export interface FaceLike {
  landmarks?: FaceLandmark[];
}

export function estimateMouthRegion(
  face: FaceLike,
  imageWidth: number,
  imageHeight: number,
): BoundingBox | null {
  const landmarks = face.landmarks?.filter((landmark) =>
    ["mouthLeft", "mouthRight", "mouthBottom", "MOUTH_LEFT", "MOUTH_RIGHT", "MOUTH_BOTTOM"].includes(landmark.type),
  );
  if (!landmarks || landmarks.length < 3 || imageWidth <= 0 || imageHeight <= 0) return null;

  const xs = landmarks.map((landmark) => landmark.position.x);
  const ys = landmarks.map((landmark) => landmark.position.y);
  const mouthWidth = Math.max(...xs) - Math.min(...xs);
  if (mouthWidth <= 0) return null;

  const estimatedHeight = mouthWidth * 0.6;
  return [
    Math.min(...xs) - mouthWidth * 0.2,
    Math.min(...ys) - estimatedHeight * 0.5,
    Math.max(...xs) + mouthWidth * 0.2,
    Math.max(...ys) + estimatedHeight * 0.5,
  ];
}