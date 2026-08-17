export async function analyzeImage(file) {
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
