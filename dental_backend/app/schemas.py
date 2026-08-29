from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class CariesDetection(BaseModel):
    class_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: BoundingBox


class ClassifierResult(BaseModel):
    top_prediction: str
    confidence: float = Field(ge=0.0, le=1.0)
    status: str
    probabilities: Dict[str, float]


class ImageQuality(BaseModel):
    width: int
    height: int
    brightness: float
    blur_score: float
    warnings: List[str]
    acceptable: bool


class ScreeningResult(BaseModel):
    primary_condition: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    status: str


class PredictionResponse(BaseModel):
    status: str
    screening: ScreeningResult
    classifier: Optional[ClassifierResult] = None
    caries_detected: bool
    caries_confidence: float = Field(ge=0.0, le=1.0)
    caries_detections: List[CariesDetection]
    image_quality: ImageQuality
    processing_time_ms: float
    message: str
