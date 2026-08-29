from dataclasses import dataclass
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


TAKE_TEETH_IMAGE_MESSAGE = (
    "Please take or upload a clear close-up photo of teeth."
)
MIN_MOUTH_FRAME_RATIO = 0.03


@dataclass(frozen=True)
class PreprocessedImage:
    image: Image.Image
    quality: dict
    crop_box: tuple[int, int, int, int] | None
    relevance: dict


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


def _face_cascade():
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if cascade.empty():
        raise ImageValidationError("Face detection is unavailable.")
    return cascade


def detect_faces(image: Image.Image) -> list[tuple[int, int, int, int]]:
    gray = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2GRAY)
    faces = _face_cascade().detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(64, 64),
    )
    return [
        (int(x), int(y), int(x + width), int(y + height))
        for x, y, width, height in faces
    ]


def contains_face(image: Image.Image) -> bool:
    return len(detect_faces(image)) > 0


def _clamp_box(
    box: tuple[float, float, float, float],
    width: int,
    height: int,
) -> tuple[int, int, int, int] | None:
    x1, y1, x2, y2 = box
    left = max(0, min(width, int(np.floor(x1))))
    top = max(0, min(height, int(np.floor(y1))))
    right = max(0, min(width, int(np.ceil(x2))))
    bottom = max(0, min(height, int(np.ceil(y2))))
    if right <= left or bottom <= top:
        return None
    return left, top, right, bottom


def estimate_mouth_region(
    face_box: tuple[int, int, int, int],
    image_width: int,
    image_height: int,
) -> tuple[int, int, int, int] | None:
    left, top, right, bottom = face_box
    width = right - left
    height = bottom - top
    if width <= 0 or height <= 0:
        return None
    return _clamp_box(
        (
            left,
            top + height * 0.58,
            right,
            top + height * 0.92,
        ),
        image_width,
        image_height,
    )


def _is_close_up_enough(
    box: tuple[int, int, int, int],
    image_width: int,
    image_height: int,
) -> bool:
    area = max(0, box[2] - box[0]) * max(0, box[3] - box[1])
    return (
        image_width > 0
        and image_height > 0
        and area / float(image_width * image_height) >= MIN_MOUTH_FRAME_RATIO
    )


def _crop_with_padding(
    image: Image.Image,
    box: tuple[int, int, int, int],
    padding_ratio: float,
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    width, height = image.size
    x1, y1, x2, y2 = box
    padding_x = (x2 - x1) * padding_ratio
    padding_y = (y2 - y1) * padding_ratio
    crop_box = _clamp_box(
        (
            x1 - padding_x,
            y1 - padding_y,
            x2 + padding_x,
            y2 + padding_y,
        ),
        width,
        height,
    )
    if crop_box is None:
        raise ImageValidationError(TAKE_TEETH_IMAGE_MESSAGE)
    return image.crop(crop_box), crop_box


def assess_dental_subject(image: Image.Image) -> dict:
    sample = image.resize((96, 96))
    rgb = np.asarray(sample, dtype=np.float32)
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]
    luminance = 0.299 * red + 0.587 * green + 0.114 * blue
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = np.divide(
        maximum - minimum,
        np.maximum(maximum, 1.0),
    )

    tooth_like = (
        (luminance > 135)
        & (luminance < 252)
        & (saturation < 0.42)
        & (red > 95)
        & (green > 90)
        & (blue > 80)
    )
    gum_like = (
        (red > 95)
        & (red > green * 1.04)
        & (green >= blue * 0.75)
        & (blue < red * 0.92)
    )

    gray = luminance.astype(np.uint8)
    edge_score = float(np.sqrt(cv2.Laplacian(gray, cv2.CV_64F).var()))
    tooth_score = float(tooth_like.mean())
    gum_score = float(gum_like.mean())
    subject_score = float(np.logical_or(tooth_like, gum_like).mean())

    closeup_like = (
        subject_score >= 0.055
        and tooth_score >= 0.025
        and edge_score >= 10.0
    )

    return {
        "subject_score": subject_score,
        "tooth_score": tooth_score,
        "gum_score": gum_score,
        "edge_score": edge_score,
        "closeup_like": closeup_like,
    }


def preprocess_for_inference(image: Image.Image) -> PreprocessedImage:
    quality = assess_image_quality(image)
    width, height = image.size
    faces = detect_faces(image)

    if faces:
        face_box = max(
            faces,
            key=lambda box: (box[2] - box[0]) * (box[3] - box[1]),
        )
        mouth_box = estimate_mouth_region(face_box, width, height)
        if mouth_box and _is_close_up_enough(mouth_box, width, height):
            crop, crop_box = _crop_with_padding(image, mouth_box, 0.35)
            quality["inference_crop"] = {
                "x1": crop_box[0],
                "y1": crop_box[1],
                "x2": crop_box[2],
                "y2": crop_box[3],
            }
            quality["relevance"] = {
                "mode": "face_mouth_crop",
                "faces": len(faces),
            }
            return PreprocessedImage(
                image=crop,
                quality=quality,
                crop_box=crop_box,
                relevance=quality["relevance"],
            )

    dental_subject = assess_dental_subject(image)
    if dental_subject["closeup_like"]:
        quality["relevance"] = {
            "mode": "teeth_closeup",
            "faces": len(faces),
            **dental_subject,
        }
        return PreprocessedImage(
            image=image,
            quality=quality,
            crop_box=None,
            relevance=quality["relevance"],
        )

    raise ImageValidationError(TAKE_TEETH_IMAGE_MESSAGE)


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

    min_dimension = min(
        width,
        height
    )

    if min_dimension < 160:
        warnings.append(
            "Image resolution is too low."
        )

    elif min_dimension < 320:
        warnings.append(
            "Image resolution is somewhat low."
        )

    if brightness < 25:
        warnings.append(
            "Image appears too dark."
        )

    elif brightness > 235:
        warnings.append(
            "Image appears too bright."
        )

    if blur_score < 40:
        warnings.append(
            "Image may be blurry."
        )

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
