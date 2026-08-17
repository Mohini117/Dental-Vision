from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.config import HOST, PORT
from app.dependencies import get_inference_service
from app.exceptions import ModelInitializationError
from app.routers.health import router as health_router
from app.routers.inference import router as inference_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load both models once during application startup.
    try:
        get_inference_service()
    except ModelInitializationError:
        raise

    yield


app = FastAPI(
    title="Dental Screening API",
    description=(
        "Research/screening API for intraoral image analysis "
        "using a six-class Keras classifier and YOLO caries detector."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(inference_router)


@app.get("/")
def root():
    return {
        "name": "Dental Screening API",
        "status": "running",
        "docs": "/docs",
        "predict_endpoint": "/api/predict",
        "host": HOST,
        "port": PORT,
    }


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error."
        },
    )
