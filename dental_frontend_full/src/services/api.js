import { Capacitor, registerPlugin } from "@capacitor/core";

const LocalInference = registerPlugin("LocalInference");

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

export async function analyzeImage(file) {
  if (Capacitor.isNativePlatform()) {
    return LocalInference.analyze({
      imageBase64: await readAsBase64(file),
    });
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/predict", {
    method: "POST",
    body: formData,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    throw new Error("The backend returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      `Prediction failed with HTTP ${response.status}.`
    );
  }

  return data;
}
