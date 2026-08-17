from io import BytesIO
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.config import (
    ALLOWED_CONTENT_TYPES,
    ALLOWED_EXTENSIONS,
    MAX_UPLOAD_SIZE_BYTES,
)
from app.exceptions import ImageValidationError


def validate_upload(
    filename: str | None,
    content_type: str | None,
    content: bytes,
) -> None:
    if not content:
        raise ImageValidationError("Uploaded file is empty.")

    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise ImageValidationError(
            f"Image is too large. Maximum size is "
            f"{MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
        )

    suffix = Path(filename or "").suffix.lower()
    if suffix and suffix not in ALLOWED_EXTENSIONS:
        raise ImageValidationError(
            f"Unsupported file extension: {suffix}"
        )

    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise ImageValidationError(
            f"Unsupported content type: {content_type}"
        )

    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageValidationError(
            "The uploaded file is not a valid image."
        ) from exc


def load_rgb_image(content: bytes) -> Image.Image:
    try:
        return Image.open(BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageValidationError(
            "Could not decode the uploaded image."
        ) from exc


def assess_image_quality(image: Image.Image) -> dict:
    rgb = np.asarray(image)

    height, width = rgb.shape[:2]

    gray = cv2.cvtColor(
        rgb,
        cv2.COLOR_RGB2GRAY,
    )

    brightness = float(gray.mean())

    blur_score = float(
        cv2.Laplacian(
            gray,
            cv2.CV_64F
        ).var()
    )

    warnings = []

    # ---------------------------------------------------------
    # Resolution
    # ---------------------------------------------------------

    min_dimension = min(
        width,
        height
    )

    # Very tiny image → reject
    if min_dimension < 160:
        warnings.append(
            "Image resolution is too low."
        )

    # Moderate resolution → warning only
    elif min_dimension < 320:
        warnings.append(
            "Image resolution is somewhat low."
        )

    # ---------------------------------------------------------
    # Brightness
    # ---------------------------------------------------------

    if brightness < 25:
        warnings.append(
            "Image appears too dark."
        )

    elif brightness > 235:
        warnings.append(
            "Image appears too bright."
        )

    # ---------------------------------------------------------
    # Blur
    # ---------------------------------------------------------

    if blur_score < 40:
        warnings.append(
            "Image may be blurry."
        )

    # ---------------------------------------------------------
    # Hard rejection rules
    # ---------------------------------------------------------

    hard_quality_failure = (
        min_dimension < 160
        or brightness < 20
        or brightness > 245
        or blur_score < 25
    )

    return {
        "width": width,
        "height": height,
        "brightness": brightness,
        "blur_score": blur_score,
        "warnings": warnings,
        "acceptable": not hard_quality_failure,
    }