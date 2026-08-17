from pathlib import Path
import numpy as np
from PIL import Image
from ultralytics import YOLO

from app.config import (
    CARIES_CONFIDENCE_THRESHOLD,
    CARIES_MODEL_PATH,
)
from app.exceptions import ModelInitializationError, InferenceError


class CariesDetector:
    def __init__(
        self,
        model_path: Path = CARIES_MODEL_PATH,
    ):
        if not model_path.exists():
            raise ModelInitializationError(
                f"Caries model not found: {model_path}"
            )

        try:
            self.model = YOLO(str(model_path))

            names = self.model.names
            if not names:
                raise ModelInitializationError(
                    "Caries YOLO model has no class mapping."
                )

            self.class_names = {
                int(index): str(name)
                for index, name in names.items()
            }

        except Exception as exc:
            if isinstance(exc, ModelInitializationError):
                raise
            raise ModelInitializationError(
                f"Failed to initialize caries model: {exc}"
            ) from exc

    def predict(self, image: Image.Image) -> list[dict]:
        try:
            results = self.model.predict(
                source=np.asarray(image),
                imgsz=320,
                conf=CARIES_CONFIDENCE_THRESHOLD,
                verbose=False,
            )

            if not results:
                return []

            result = results[0]

            if result.boxes is None or len(result.boxes) == 0:
                return []

            detections = []

            for index in range(len(result.boxes)):
                class_id = int(
                    result.boxes.cls[index].item()
                )

                confidence = float(
                    result.boxes.conf[index].item()
                )

                coordinates = (
                    result.boxes.xyxy[index]
                    .cpu()
                    .numpy()
                    .astype(float)
                    .tolist()
                )

                x1, y1, x2, y2 = coordinates

                detections.append(
                    {
                        "class_name": self.class_names.get(
                            class_id,
                            f"class_{class_id}",
                        ),
                        "confidence": max(
                            0.0,
                            min(1.0, confidence),
                        ),
                        "bbox": {
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2,
                        },
                    }
                )

            return detections

        except Exception as exc:
            raise InferenceError(
                f"Caries inference failed: {exc}"
            ) from exc
