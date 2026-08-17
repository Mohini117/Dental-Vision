import time

from app.config import (
    CARIES_CONFIDENCE_THRESHOLD,
    CLASSIFIER_CONFIDENCE_THRESHOLD,
)
from app.services.caries_detector import CariesDetector
from app.services.condition_classifier import ConditionClassifier
from app.utils.image_validation import assess_image_quality


class InferenceService:
    def __init__(
        self,
        classifier: ConditionClassifier,
        caries_detector: CariesDetector,
    ):
        self.classifier = classifier
        self.caries_detector = caries_detector

    def analyze(self, image):
        start = time.perf_counter()

        quality = assess_image_quality(image)

        # ---------------------------------------------------------
        # Run both models
        # ---------------------------------------------------------
        classifier_result = self.classifier.predict(image)

        all_caries_detections = (
            self.caries_detector.predict(image)
        )

        # ---------------------------------------------------------
        # Keep only detections above the configured threshold
        # ---------------------------------------------------------
        valid_caries_detections = [
            detection
            for detection in all_caries_detections
            if detection["confidence"]
            >= CARIES_CONFIDENCE_THRESHOLD
        ]

        # Strongest valid caries detection
        strongest_caries = None

        if valid_caries_detections:
            strongest_caries = max(
                valid_caries_detections,
                key=lambda d: d["confidence"],
            )

        caries_detected = (
            strongest_caries is not None
        )

        caries_confidence = (
            strongest_caries["confidence"]
            if strongest_caries
            else 0.0
        )

        classifier_confident = (
            classifier_result["confidence"]
            >= CLASSIFIER_CONFIDENCE_THRESHOLD
        )

        # ---------------------------------------------------------
        # PRIMARY RESULT PRIORITY
        #
        # 1. Image quality failure
        # 2. Caries detector
        # 3. General classifier
        # 4. Uncertain
        # ---------------------------------------------------------

        if not quality["acceptable"]:

            overall_status = "poor_image_quality"
            primary_condition = None
            primary_confidence = 0.0

            message = (
                "The image quality may reduce reliability. "
                "Please retake the photograph with better "
                "lighting, focus, and framing."
            )

        elif caries_detected:

            # IMPORTANT:
            # Caries takes priority over the general classifier.
            overall_status = "possible_caries"

            primary_condition = "Possible Caries"

            primary_confidence = caries_confidence

            message = (
                "Possible caries was detected by the "
                "localized caries model. Professional "
                "dental assessment is recommended."
            )

        elif classifier_confident:

            overall_status = "prediction"

            primary_condition = (
                classifier_result["top_prediction"]
            )

            primary_confidence = (
                classifier_result["confidence"]
            )

            message = (
                "This is an AI-assisted screening result, "
                "not a definitive dental diagnosis."
            )

        else:

            overall_status = "uncertain"

            primary_condition = None

            primary_confidence = (
                classifier_result["confidence"]
            )

            message = (
                "The models could not determine the "
                "condition reliably from this image."
            )

        elapsed_ms = (
            time.perf_counter() - start
        ) * 1000.0

        # ---------------------------------------------------------
        # Return BOTH model outputs
        # ---------------------------------------------------------
        return {
            "status": overall_status,

            "screening": {
                "primary_condition": primary_condition,
                "confidence": primary_confidence,
                "status": overall_status,
            },

            "classifier": classifier_result,

            "caries_detected": caries_detected,

            "caries_confidence": caries_confidence,

            "caries_detections": valid_caries_detections,

            "image_quality": quality,

            "processing_time_ms": round(
                elapsed_ms,
                2,
            ),

            "message": message,
        }