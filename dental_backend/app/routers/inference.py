from fastapi import APIRouter, File, HTTPException, UploadFile

from app.dependencies import get_inference_service
from app.exceptions import ImageValidationError, InferenceError
from app.schemas import PredictionResponse
from app.utils.image_validation import (
    TAKE_TEETH_IMAGE_MESSAGE,
    assess_image_quality,
    load_rgb_image,
    preprocess_for_inference,
    validate_upload,
)

router = APIRouter(
    prefix="/api",
    tags=["inference"],
)


@router.post(
    "/predict",
    response_model=PredictionResponse,
)
async def predict(
    file: UploadFile = File(...),
):
    content = await file.read()

    try:
        validate_upload(
            filename=file.filename,
            content_type=file.content_type,
            content=content,
        )

        image = load_rgb_image(content)
        preprocessed = preprocess_for_inference(image)

        service = get_inference_service()

        result = service.analyze(
            preprocessed.image,
            quality=preprocessed.quality,
            crop_box=preprocessed.crop_box,
        )

        return result

    except ImageValidationError as exc:
        if str(exc) == TAKE_TEETH_IMAGE_MESSAGE:
            quality = assess_image_quality(load_rgb_image(content))
            return {
                "status": "no_teeth",
                "screening": {
                    "primary_condition": None,
                    "confidence": 0.0,
                    "status": "no_teeth",
                },
                "classifier": None,
                "caries_detected": False,
                "caries_confidence": 0.0,
                "caries_detections": [],
                "image_quality": quality,
                "processing_time_ms": 0.0,
                "message": TAKE_TEETH_IMAGE_MESSAGE,
            }
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except InferenceError as exc:
        raise HTTPException(
            status_code=500,
            detail="Inference failed.",
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unexpected server error.",
        ) from exc
