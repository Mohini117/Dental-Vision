import { FaceDetection, LandmarkMode, PerformanceMode } from "@capacitor-mlkit/face-detection";
import { estimateMouthRegion } from "./estimateMouthRegion";
import { isCloseUpEnough } from "./isCloseUpEnough";
import type { BoundingBox, ClassResult, Detection, DiagnosisResult } from "./types";
import { arbitrate, DISCLAIMER } from "./arbitrate";
import { runPreInferenceGate } from "./preInferenceGate";

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

export interface CropTransform {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface ScanRunners {
  runDetector: (crop: string, transform: CropTransform) => Promise<DetectorResult>;
  runClassifier: (crop: string, transform: CropTransform) => Promise<ClassResult>;
}

const TAKE_TEETH_IMAGE_MESSAGE = "Please take or upload a clear close-up photo of teeth.";
const NOT_CLOSE_UP_MESSAGE = "Please capture a closer, well-lit photo focused on the teeth.";

function retake(
  status: "no_face" | "not_close_up" | "no_teeth",
  message: string,
): DiagnosisResult {
  return { status, findings: [], message, disclaimer: DISCLAIMER };
}

function faceArea(face: { bounds?: { left: number; top: number; right: number; bottom: number } }): number {
  const bounds = face.bounds;
  if (!bounds) return 0;
  return Math.max(0, bounds.right - bounds.left) * Math.max(0, bounds.bottom - bounds.top);
}

async function cropWithPadding(
  source: Blob,
  box: BoundingBox,
  paddingRatio: number,
): Promise<{ dataUrl: string; transform: CropTransform }> {
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
  const transform = {
    offsetX: x,
    offsetY: y,
    width: canvas.width,
    height: canvas.height,
    sourceWidth: bitmap.width,
    sourceHeight: bitmap.height,
  };
  bitmap.close();
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.95), transform };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error("Could not prepare the cropped image.");
  }
  return response.blob();
}

async function runModels(
  crop: { dataUrl: string; transform: CropTransform },
  runners: ScanRunners,
): Promise<DiagnosisResult> {
  const [detectorResult, classifierResult] = await Promise.all([
    runners.runDetector(crop.dataUrl, crop.transform),
    runners.runClassifier(crop.dataUrl, crop.transform),
  ]);
  return arbitrate(detectorResult, classifierResult);
}

export async function scanTeeth(photo: ScanPhoto, runners: ScanRunners): Promise<DiagnosisResult> {
  let faces: any[] = [];
  try {
    ({ faces } = await FaceDetection.processImage({
      path: photo.path,
      performanceMode: PerformanceMode.Accurate,
      landmarkMode: LandmarkMode.All,
      minFaceSize: 0.02,
    }));
  } catch {
    faces = [];
  }

  if (faces.length > 0) {
    const face = [...faces].sort((first, second) => faceArea(second) - faceArea(first))[0];
    const mouthBox = estimateMouthRegion(face, photo.width, photo.height);
    if (mouthBox && isCloseUpEnough(mouthBox, photo.width, photo.height)) {
      const crop = await cropWithPadding(photo.source, mouthBox, 0.35);
      const gate = await runPreInferenceGate(await dataUrlToBlob(crop.dataUrl));
      if (!gate.passed) {
        return gate.diagnosis || retake("no_teeth", TAKE_TEETH_IMAGE_MESSAGE);
      }
      return runModels(crop, runners);
    }
    // A face was detected but the mouth region is too small relative to the
    // frame — the photo was taken from too far away (e.g. a normal selfie
    // distance). Ask for a closer shot instead of silently falling back to
    // analyzing the whole, uncropped face/body photo.
    return retake("not_close_up", NOT_CLOSE_UP_MESSAGE);
  }

  // No face detected at all — likely an existing close-up intraoral photo
  // with no face in frame (e.g. a photo already cropped to the mouth by the
  // user, or a dentist-taken close-up). Fall back to analyzing the full image.
  const gate = await runPreInferenceGate(photo.source);
  if (gate.passed) {
    const crop = await cropWithPadding(photo.source, [0, 0, photo.width, photo.height], 0);
    return runModels(crop, runners);
  }

  return retake("no_teeth", TAKE_TEETH_IMAGE_MESSAGE);
}