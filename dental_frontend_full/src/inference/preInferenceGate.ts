import { DiagnosisResult } from "./types";
import { DISCLAIMER } from "./arbitrate";

export interface GateMetrics {
  blurScore: number;
  meanLuminance: number;
  subjectScore: number;
}

export interface GateResult {
  passed: boolean;
  metrics: GateMetrics;
  diagnosis?: DiagnosisResult;
}

const MIN_BLUR_VARIANCE = 18;
const MIN_LUMINANCE = 22;
const MAX_LUMINANCE = 238;
const MIN_SUBJECT_SCORE = 0.08;

function failedResult(status: "no_teeth" | "retake_photo", message: string): DiagnosisResult {
  return { status, findings: [], message, disclaimer: DISCLAIMER };
}

export async function runPreInferenceGate(file: Blob): Promise<GateResult> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  const size = 96;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return {
      passed: false,
      metrics: { blurScore: 0, meanLuminance: 0, subjectScore: 0 },
      diagnosis: failedResult("retake_photo", "We couldn't inspect this image. Please retake the photo."),
    };
  }

  context.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const { data } = context.getImageData(0, 0, size, size);
  const luminance = new Float32Array(size * size);
  let total = 0;
  let subjectPixels = 0;

  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    const value = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
    luminance[index] = value;
    total += value;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    if (value > 125 && value < 250 && red >= green * 0.8 && red <= green * 1.35 && blue <= green * 1.2) {
      subjectPixels += 1;
    }
  }

  const meanLuminance = total / luminance.length;
  let blurScore = 0;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const index = y * size + x;
      const laplacian = 4 * luminance[index] - luminance[index - 1] - luminance[index + 1] - luminance[index - size] - luminance[index + size];
      blurScore += laplacian * laplacian;
    }
  }
  blurScore /= (size - 2) * (size - 2);
  const subjectScore = subjectPixels / luminance.length;
  const metrics = { blurScore, meanLuminance, subjectScore };

  if (meanLuminance < MIN_LUMINANCE || meanLuminance > MAX_LUMINANCE || blurScore < MIN_BLUR_VARIANCE) {
    return {
      passed: false,
      metrics,
      diagnosis: failedResult("retake_photo", "This image is too dark, bright, or blurry. Please retake the photo with even lighting and better focus."),
    };
  }

  if (subjectScore < MIN_SUBJECT_SCORE) {
    return {
      passed: false,
      metrics,
      diagnosis: failedResult("no_teeth", "Please provide a teeth-related image to continue."),
    };
  }

  return { passed: true, metrics };
}
