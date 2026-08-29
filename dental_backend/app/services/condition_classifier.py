import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image

from app.config import (
    CLASSIFIER_CONFIDENCE_THRESHOLD,
    CLASSIFIER_INPUT_SIZE,
    MULTICLASS_METADATA_PATH,
    MULTICLASS_MODEL_PATH,
)
from app.exceptions import ModelInitializationError, InferenceError


def load_compatible_model(model_path: Path):
    dense_init = tf.keras.layers.Dense.__init__

    def compatible_dense_init(self, *args, **kwargs):
        kwargs.pop("quantization_config", None)
        dense_init(self, *args, **kwargs)

    tf.keras.layers.Dense.__init__ = compatible_dense_init
    try:
        return tf.keras.models.load_model(model_path, compile=False)
    finally:
        tf.keras.layers.Dense.__init__ = dense_init


class ConditionClassifier:
    def __init__(
        self,
        model_path: Path = MULTICLASS_MODEL_PATH,
        metadata_path: Path = MULTICLASS_METADATA_PATH,
    ):
        if not model_path.exists():
            raise ModelInitializationError(
                f"Classifier model not found: {model_path}"
            )

        if not metadata_path.exists():
            raise ModelInitializationError(
                f"Classifier metadata not found: {metadata_path}"
            )

        try:
            self.model = load_compatible_model(model_path)

            with metadata_path.open("r", encoding="utf-8") as f:
                metadata = json.load(f)

            self.classes = metadata["classes"]

            if len(self.classes) != self.model.output_shape[-1]:
                raise ModelInitializationError(
                    "Number of classes in metadata does not match "
                    "classifier output dimension."
                )

        except Exception as exc:
            if isinstance(exc, ModelInitializationError):
                raise
            raise ModelInitializationError(
                f"Failed to initialize classifier: {exc}"
            ) from exc

    def predict(self, image: Image.Image) -> dict:
        try:
            resized = image.resize(CLASSIFIER_INPUT_SIZE)

            x = np.asarray(
                resized,
                dtype=np.float32,
            )[None, ...]

            probabilities = self.model.predict(
                x,
                verbose=0,
            )[0]

            probabilities = np.asarray(
                probabilities,
                dtype=np.float32,
            )

            if not np.all(np.isfinite(probabilities)):
                raise InferenceError(
                    "Classifier returned non-finite values."
                )

            # The Keras model was evaluated with these outputs as probabilities.
            probabilities = np.clip(
                probabilities,
                0.0,
                1.0,
            )

            total = float(probabilities.sum())
            if total > 0:
                probabilities = probabilities / total

            index = int(np.argmax(probabilities))
            confidence = float(probabilities[index])

            top_prediction = self.classes[index]

            status = (
                "prediction"
                if confidence >= CLASSIFIER_CONFIDENCE_THRESHOLD
                else "uncertain"
            )

            return {
                "top_prediction": top_prediction,
                "confidence": confidence,
                "status": status,
                "probabilities": {
                    name: float(probability)
                    for name, probability in zip(
                        self.classes,
                        probabilities,
                    )
                },
            }

        except InferenceError:
            raise
        except Exception as exc:
            raise InferenceError(
                f"Classifier inference failed: {exc}"
            ) from exc
