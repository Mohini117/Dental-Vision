import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { scanTeeth } from "../inference/scanTeeth";
import { arbitrate, DISCLAIMER } from "../inference/arbitrate";
import { mapClassifierLabel, mapYoloLabel } from "../inference/canonicalLabels";
import { CONFIDENCE_THRESHOLDS } from "../inference/thresholds";

const LocalInference = registerPlugin("LocalInference");

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

async function imageId(file) {
  if (!crypto?.subtle) return `${file.name}:${file.size}:${file.lastModified}`;
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function adaptResult(raw, gate) {
  const rawDetections = raw?.caries_detections || raw?.detections || [];
  const detections = rawDetections.flatMap((detection) => {
    const condition = mapYoloLabel(detection.class_name || detection.label || "");
    const box = detection.bbox || detection.boundingBox;
    if (!condition || !box) return [];
    return [{
      condition,
      confidence: Math.max(0, Math.min(1, Number(detection.confidence || 0))),
      boundingBox: [Number(box.x1), Number(box.y1), Number(box.x2), Number(box.y2)],
      rawLabel: detection.class_name,
    }];
  });
  const rawClassifier = raw?.classifier || {};
  const classifierLabel = rawClassifier.top_prediction || raw?.classification?.label || "";
  const mappedClassifierCondition = mapClassifierLabel(classifierLabel);
  const classifierCondition = mappedClassifierCondition || "healthy";
  const classifierConfidence = mappedClassifierCondition
    ? Number(rawClassifier.confidence || raw?.classification?.confidence || 0)
    : 0;
  const canonicalProbabilities = Object.entries(rawClassifier.probabilities || {}).reduce(
    (probabilities, [label, probability]) => {
      const condition = mapClassifierLabel(label);
      if (condition) probabilities[condition] = Number(probability);
      return probabilities;
    },
    {}
  );
  const classification = {
    condition: classifierCondition,
    confidence: classifierConfidence,
    probabilities: canonicalProbabilities,
    rawLabel: classifierLabel,
  };
  const topDetection = detections[0];
  const detector = {
    detections,
    topCanonicalClass: topDetection?.condition || "healthy",
    topConfidence: topDetection?.confidence || 0,
    topBox: topDetection?.boundingBox,
  };
  const diagnosis = gate?.diagnosis || arbitrate(detector, classification);
  const primaryFinding = diagnosis.findings?.[0];
  const fallbackConfidence = Math.max(
    detector.topConfidence || 0,
    classification.confidence || 0,
  );
  const quality = {
    ...(raw?.image_quality || {}),
    ...(gate?.metrics || {}),
    acceptable: gate ? gate.passed : raw?.image_quality?.acceptable,
    brightness: gate?.metrics?.meanLuminance ?? raw?.image_quality?.brightness,
    blur_score: gate?.metrics?.blurScore ?? raw?.image_quality?.blur_score,
  };
  return {
    ...diagnosis,
    classifier: {
      ...rawClassifier,
      top_prediction: classifierCondition,
      confidence: classifierConfidence,
      probabilities: canonicalProbabilities,
    },
    caries_detected: detections.length > 0,
    caries_confidence: detections[0]?.confidence || 0,
    caries_detections: detections.map((detection) => ({
      class_name: detection.condition,
      confidence: detection.confidence,
      bbox: {
        x1: detection.boundingBox[0],
        y1: detection.boundingBox[1],
        x2: detection.boundingBox[2],
        y2: detection.boundingBox[3],
      },
    })),
    image_quality: quality,
    screening: {
      primary_condition: primaryFinding?.condition || classifierCondition,
      confidence: primaryFinding?.confidence ?? fallbackConfidence,
      status: diagnosis.status,
    },
  };
}

async function logInference(file, raw, result, gate) {
  try {
    const record = {
      image_id: await imageId(file),
      timestamp: new Date().toISOString(),
      gate,
      raw_top3: {
        detector: (raw?.caries_detections || []).slice(0, 3),
        classifier: Object.entries(raw?.classifier?.probabilities || {})
          .sort(([, first], [, second]) => Number(second) - Number(first)).slice(0, 3),
      },
      thresholds: CONFIDENCE_THRESHOLDS,
      final_result: result,
    };
    const entries = JSON.parse(localStorage.getItem("dental_inference_log") || "[]");
    entries.push(record);
    localStorage.setItem("dental_inference_log", JSON.stringify(entries.slice(-50)));
  } catch {
    // Logging must never prevent a screening result from reaching the user.
  }
}

export async function analyzeImage(file) {
  let raw;

  if (Capacitor.isNativePlatform()) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const imageDataUrl = await readAsBase64(file);
    const imageBase64 = imageDataUrl.replace(/^data:[^;]+;base64,/, "");
    const temporaryPath = `dental-scan-${Date.now()}.jpg`;
    const { uri } = await Filesystem.writeFile({
      path: temporaryPath,
      data: imageBase64,
      directory: Directory.Cache,
    });
    try {
      let rawPromise;
      const getRaw = (crop) => {
        if (!rawPromise) {
          rawPromise = LocalInference.analyze({ imageBase64: crop });
        }
        return rawPromise;
      };
      const result = await scanTeeth(
        { path: uri, width: bitmap.width, height: bitmap.height, source: file },
        {
          runDetector: async (crop) => {
            const raw = await getRaw(crop);
            const adapted = adaptResult(raw, null);
            const detection = adapted.caries_detections[0];
            return {
              detections: adapted.caries_detections,
              topCanonicalClass: detection?.class_name || "healthy",
              topConfidence: detection?.confidence || 0,
              topBox: detection ? [detection.bbox.x1, detection.bbox.y1, detection.bbox.x2, detection.bbox.y2] : undefined,
            };
          },
          runClassifier: async (crop) => {
            const raw = await getRaw(crop);
            const adapted = adaptResult(raw, null);
            return {
              condition: adapted.classifier.top_prediction || "healthy",
              confidence: Number(adapted.classifier.confidence || 0),
              probabilities: adapted.classifier.probabilities,
            };
          },
        },
      );
      const normalized = rawPromise
        ? adaptResult(await rawPromise, { diagnosis: result, passed: true })
        : result;
      await logInference(file, {}, normalized, { passed: true });
      return normalized;
    } finally {
      bitmap.close();
      await Filesystem.deleteFile({ path: temporaryPath, directory: Directory.Cache }).catch(() => {});
    }
  } else {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/predict", { method: "POST", body: formData });
    try {
      raw = await response.json();
    } catch {
      throw new Error("The backend returned an invalid response.");
    }
    if (!response.ok) {
      throw new Error(raw?.detail || raw?.message || `Prediction failed with HTTP ${response.status}.`);
    }
  }

  const result = adaptResult(raw, null);
  await logInference(file, raw, result, null);
  return result;
}
