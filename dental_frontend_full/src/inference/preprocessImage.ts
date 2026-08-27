export interface PreprocessTransform {
  sourceWidth: number;
  sourceHeight: number;
  scale: number;
  padX: number;
  padY: number;
  targetSize: number;
}

export interface PreprocessedImage {
  tensor: Float32Array;
  transform: PreprocessTransform;
}

/** Decode an image with EXIF orientation, then letterbox it into RGB NHWC floats. */
export async function preprocessImage(
  imageUri: string,
  targetSize: number,
): Promise<Float32Array> {
  const result = await preprocessImageWithTransform(imageUri, targetSize);
  return result.tensor;
}

export async function preprocessImageWithTransform(
  imageUri: string,
  targetSize: number,
): Promise<PreprocessedImage> {
  if (!Number.isInteger(targetSize) || targetSize <= 0) {
    throw new Error("targetSize must be a positive integer.");
  }

  const bitmap = await createImageBitmap(await fetch(imageUri).then((response) => response.blob()), {
    imageOrientation: "from-image",
  });
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const padX = Math.floor((targetSize - width) / 2);
  const padY = Math.floor((targetSize - height) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("Could not create an image processing context.");
  }

  context.fillStyle = "#000000";
  context.fillRect(0, 0, targetSize, targetSize);
  context.drawImage(bitmap, padX, padY, width, height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, targetSize, targetSize).data;
  const tensor = new Float32Array(targetSize * targetSize * 3);

  for (let pixel = 0, offset = 0; pixel < pixels.length; pixel += 4) {
    tensor[offset++] = pixels[pixel] / 255;
    tensor[offset++] = pixels[pixel + 1] / 255;
    tensor[offset++] = pixels[pixel + 2] / 255;
  }

  return {
    tensor,
    transform: {
      sourceWidth,
      sourceHeight,
      scale,
      padX,
      padY,
      targetSize,
    },
  };
}
