from fastapi import APIRouter

from app.dependencies import get_inference_service

router = APIRouter(
    prefix="/api",
    tags=["health"],
)


@router.get("/health")
def health():
    try:
        service = get_inference_service()

        return {
            "status": "ok",
            "models_loaded": (
                service.classifier.model is not None
                and service.caries_detector.model is not None
            ),
        }

    except Exception as exc:
        return {
            "status": "degraded",
            "models_loaded": False,
            "error": str(exc),
        }
