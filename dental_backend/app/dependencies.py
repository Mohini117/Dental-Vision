from functools import lru_cache

from app.services.caries_detector import CariesDetector
from app.services.condition_classifier import ConditionClassifier
from app.services.inference_service import InferenceService


@lru_cache
def get_inference_service() -> InferenceService:
    classifier = ConditionClassifier()
    caries_detector = CariesDetector()

    return InferenceService(
        classifier=classifier,
        caries_detector=caries_detector,
    )
