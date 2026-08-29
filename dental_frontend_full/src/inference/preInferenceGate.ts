import { DiagnosisResult } from "./types";
import { DISCLAIMER } from "./arbitrate";

export interface GateMetrics {
  blurScore: number;
  meanLuminance: number;
  subjectScore: number;
  toothScore: number;
  gumScore: number;
  edgeScore: number;
}

export interface GateResult {
  passed: boolean;
  metrics: GateMetrics;
  diagnosis?: DiagnosisResult;
}

const MIN_BLUR_VARIANCE = 18;
const MIN_LUMINANCE = 22;
const MAX_LUMINANCE = 238;
const MIN_SUBJECT_SCORE = 0.055;
const MIN_EDGE_SCORE = 10;
const TAKE_TEETH_IMAGE_MESSAGE = "Please take or upload a clear close-up photo of teeth.";

function failedResult(
  status: "no_face" | "not_close_up" | "no_teeth",
  message: string,
): DiagnosisResult {
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
      metrics: {
        blurScore: 0,
        meanLuminance: 0,
        subjectScore: 0,
        toothScore: 0,
        gumScore: 0,
        edgeScore: 0,
      },
      diagnosis: failedResult("not_close_up", TAKE_TEETH_IMAGE_MESSAGE),
    };
  }

  context.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const { data } = context.getImageData(0, 0, size, size);
  const luminance = new Float32Array(size * size);
  let total = 0;
  let subjectPixels = 0;
  let toothPixels = 0;
  let gumPixels = 0;

  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const value = 0.299 * red + 0.587 * green + 0.114 * blue;
    luminance[index] = value;
    total += value;

    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;
    const toothLike = value > 135 && value < 252 && saturation < 0.42 && red > 95 && green > 90 && blue > 80;
    const gumLike = red > 95 && red > green * 1.04 && green >= blue * 0.75 && blue < red * 0.92;

    if (toothLike) toothPixels += 1;
    if (gumLike) gumPixels += 1;
    if (toothLike || gumLike) subjectPixels += 1;
  }

  const meanLuminance = total / luminance.length;
  let blurScore = 0;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const index = y * size + x;
      const laplacian = 4 * luminance[index]
        - luminance[index - 1]
        - luminance[index + 1]
        - luminance[index - size]
        - luminance[index + size];
      blurScore += laplacian * laplacian;
    }
  }
  blurScore /= (size - 2) * (size - 2);

  const subjectScore = subjectPixels / luminance.length;
  const toothScore = toothPixels / luminance.length;
  const gumScore = gumPixels / luminance.length;
  const edgeScore = Math.sqrt(blurScore);
  const metrics = { blurScore, meanLuminance, subjectScore, toothScore, gumScore, edgeScore };

  if (meanLuminance < MIN_LUMINANCE || meanLuminance > MAX_LUMINANCE || blurScore < MIN_BLUR_VARIANCE) {
    return {
      passed: false,
      metrics,
      diagnosis: failedResult("not_close_up", TAKE_TEETH_IMAGE_MESSAGE),
    };
  }

  if (subjectScore < MIN_SUBJECT_SCORE || toothScore < 0.025 || edgeScore < MIN_EDGE_SCORE) {
    return {
      passed: false,
      metrics,
      diagnosis: failedResult("no_teeth", TAKE_TEETH_IMAGE_MESSAGE),
    };
  }

  return { passed: true, metrics };
}
