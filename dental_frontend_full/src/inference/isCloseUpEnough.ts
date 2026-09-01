import type { BoundingBox } from "./types";

// Tune against labeled real photos; this is intentionally a starting point.
export const MOUTH_FRAME_RATIO_THRESHOLD = 0.045;

export function isCloseUpEnough(
  mouthBox: BoundingBox,
  imageWidth: number,
  imageHeight: number,
): boolean {
  const mouthArea = Math.max(0, mouthBox[2] - mouthBox[0]) * Math.max(0, mouthBox[3] - mouthBox[1]);
  return imageWidth > 0 && imageHeight > 0
    && mouthArea / (imageWidth * imageHeight) >= MOUTH_FRAME_RATIO_THRESHOLD;
}