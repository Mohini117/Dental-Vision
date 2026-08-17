from fastapi import APIRouter, File, HTTPException, UploadFile

from app.dependencies import get_inference_service
from app.exceptions import ImageValidationError, InferenceError
from app.schemas import PredictionResponse
from app.utils.image_validation import (
    load_rgb_image,
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

        service = get_inference_service()

        result = service.analyze(
            image
        )

        return result

    except ImageValidationError as exc:
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
