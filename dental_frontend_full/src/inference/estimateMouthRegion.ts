import type { BoundingBox } from "./types";

export interface FaceLandmark {
  type: string | number;
  position: { x: number; y: number };
}

export interface FaceLike {
  landmarks?: FaceLandmark[];
  bounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

const MOUTH_LANDMARKS = new Set([
  "mouthleft",
  "mouthright",
  "mouthbottom",
]);

function boundingBoxMouthRegion(
  face: FaceLike,
  imageWidth: number,
  imageHeight: number,
): BoundingBox | null {
  const box = face.bounds;
  if (!box) return null;
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  if (width <= 0 || height <= 0) return null;

  const left = Math.max(0, box.left);
  const right = Math.min(imageWidth, box.right);
  const top = Math.max(0, box.top + height * 0.58);
  const bottom = Math.min(imageHeight, box.top + height * 0.92);
  return right > left && bottom > top ? [left, top, right, bottom] : null;
}

export function estimateMouthRegion(
  face: FaceLike,
  imageWidth: number,
  imageHeight: number,
): BoundingBox | null {
  if (imageWidth <= 0 || imageHeight <= 0) return null;

  const landmarks = face.landmarks?.filter((landmark) =>
    MOUTH_LANDMARKS.has(String(landmark.type).toLowerCase().replaceAll("_", ""))
      || landmark.type === 0
      || landmark.type === 5
      || landmark.type === 11,
  );
  if (!landmarks || landmarks.length < 3) {
    return boundingBoxMouthRegion(face, imageWidth, imageHeight);
  }

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