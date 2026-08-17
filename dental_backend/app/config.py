from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[1]

MODELS_DIR = BASE_DIR / "models"
MULTICLASS_MODEL_PATH = MODELS_DIR / "multiclass" / "dental_mobilenetv3_final.keras"
MULTICLASS_METADATA_PATH = MODELS_DIR / "multiclass" / "metadata.json"

CARIES_MODEL_PATH = MODELS_DIR / "caries" / "best.pt"

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

CLASSIFIER_INPUT_SIZE = (224, 224)
CARIES_INPUT_SIZE = 320

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

CLASSIFIER_CONFIDENCE_THRESHOLD = float(
    os.getenv("CLASSIFIER_CONFIDENCE_THRESHOLD", "0.70")
)

CARIES_CONFIDENCE_THRESHOLD = float(
    os.getenv("CARIES_CONFIDENCE_THRESHOLD", "0.50")
)
