import { FaceDetection, LandmarkMode, PerformanceMode } from "@capacitor-mlkit/face-detection";
import { estimateMouthRegion } from "./estimateMouthRegion";
import { isCloseUpEnough } from "./isCloseUpEnough";
import type { BoundingBox, ClassResult, Detection, DiagnosisResult } from "./types";
import { arbitrate, DISCLAIMER } from "./arbitrate";

export interface ScanPhoto {
  path: string;
  width: number;
  height: number;
  source: Blob;
}

export interface DetectorResult {
  detections: Detection[];
  topCanonicalClass: Detection["condition"];
  topConfidence: number;
  topBox?: BoundingBox;
}

export interface ScanRunners {
  runDetector: (crop: string) => Promise<DetectorResult>;
  runClassifier: (crop: string) => Promise<ClassResult>;
}

const NO_FACE_MESSAGE = "No face detected. Please take a clear photo of your teeth or mouth.";
const NOT_CLOSE_UP_MESSAGE = "Please capture a close-up of your teeth — move closer or zoom in.";

function retake(status: "no_face" | "not_close_up", message: string): DiagnosisResult {
  return { status, findings: [], message, disclaimer: DISCLAIMER };
}

async function cropWithPadding(source: Blob, box: BoundingBox, paddingRatio: number): Promise<string> {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  const paddingX = (box[2] - box[0]) * paddingRatio;
  const paddingY = (box[3] - box[1]) * paddingRatio;
  const x = Math.max(0, Math.floor(box[0] - paddingX));
  const y = Math.max(0, Math.floor(box[1] - paddingY));
  const right = Math.min(bitmap.width, Math.ceil(box[2] + paddingX));
  const bottom = Math.min(bitmap.height, Math.ceil(box[3] + paddingY));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, right - x);
  canvas.height = Math.max(1, bottom - y);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not create an image processing context.");
  }
  context.drawImage(bitmap, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.95);
}

export async function scanTeeth(photo: ScanPhoto, runners: ScanRunners): Promise<DiagnosisResult> {
  let faces;
  try {
    ({ faces } = await FaceDetection.processImage({
      path: photo.path,
      performanceMode: PerformanceMode.Accurate,
      landmarkMode: LandmarkMode.All,
      minFaceSize: 0.02,
    }));
  } catch {
    return retake("no_face", NO_FACE_MESSAGE);
  }
  if (faces.length === 0) return retake("no_face", NO_FACE_MESSAGE);

  const mouthBox = estimateMouthRegion(faces[0], photo.width, photo.height);
  if (!mouthBox || !isCloseUpEnough(mouthBox, photo.width, photo.height)) {
    return retake("not_close_up", NOT_CLOSE_UP_MESSAGE);
  }

  const crop = await cropWithPadding(photo.source, mouthBox, 0.35);
  const [detectorResult, classifierResult] = await Promise.all([
    runners.runDetector(crop),
    runners.runClassifier(crop),
  ]);
  return arbitrate(detectorResult, classifierResult);
}