import os
import io
import base64
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
from PIL import Image

from api.schemas import (
    PredictionResponse,
    Base64PredictionRequest,
    HealthResponse
)
from src.inference import PneumoniaInferenceEngine
from api.health_view import get_full_health_metrics


# Checkpoint file path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CHECKPOINT = os.path.join(BASE_DIR, "weights", "densenet121_pneumonia_best.pth")

inference_engine: Optional[PneumoniaInferenceEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global inference_engine
    print(f"[FindPneumo API] Initializing inference engine...")
    inference_engine = PneumoniaInferenceEngine(checkpoint_path=DEFAULT_CHECKPOINT)
    yield
    print(f"[FindPneumo API] Shutting down.")


from fastapi.responses import JSONResponse, FileResponse

TEST_DATA_DIR = os.path.join(BASE_DIR, "data", "test")

app = FastAPI(
    title="FindPneumo AI - DenseNet-121 Pneumonia Detection Server",
    description="State-of-the-art Deep Learning API for detecting Pneumonia in Chest X-Rays with Grad-CAM multiple lesion coordinates",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Info"])
@app.get("/api", tags=["Info"])
async def root():
    return {
        "service": "FindPneumo AI Detection API",
        "model": "DenseNet-121 Transfer Learning",
        "status": "online",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "endpoints": {
            "health": "/health",
            "samples": "/samples",
            "predict_upload": "POST /predict",
            "predict_base64": "POST /predict/base64",
            "docs": "/docs"
        }
    }


@app.get("/samples", tags=["Samples"])
async def list_samples():
    """Returns list of test images available for instant demo in UI."""
    samples = {"pneumonia": [], "normal": []}
    pneu_dir = os.path.join(TEST_DATA_DIR, "pneumonia")
    norm_dir = os.path.join(TEST_DATA_DIR, "normal")

    if os.path.exists(pneu_dir):
        samples["pneumonia"] = [f for f in os.listdir(pneu_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))]
    if os.path.exists(norm_dir):
        samples["normal"] = [f for f in os.listdir(norm_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))]

    return samples


@app.get("/samples/image/{category}/{filename}", tags=["Samples"])
async def get_sample_image(category: str, filename: str):
    """Streams a sample image file from the test dataset."""
    safe_filename = os.path.basename(filename)
    if category not in ("pneumonia", "normal"):
        raise HTTPException(status_code=400, detail="Invalid category. Use 'pneumonia' or 'normal'.")

    file_path = os.path.join(TEST_DATA_DIR, category, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample image not found.")

    return FileResponse(file_path, media_type="image/jpeg")


@app.get("/health", tags=["Health"])
@app.get("/health/json", tags=["Health"])
async def health():
    """Returns comprehensive hardware health and validation metrics in JSON format."""
    return get_full_health_metrics()


@app.get("/samples/preset/{preset_id}", response_model=PredictionResponse, tags=["Samples"])
async def get_preset_analysis(preset_id: str):
    """
    Returns authentic Deep Learning analysis for the specified preset scan:
    - 'lobar_pneumonia'
    - 'interstitial_pattern'
    - 'clear_lungs'
    """
    if not inference_engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference engine is not initialized"
        )

    preset_map = {
        "lobar_pneumonia": os.path.join(TEST_DATA_DIR, "pneumonia", "adult_test_pneumonia_001.jpeg"),
        "interstitial_pattern": os.path.join(TEST_DATA_DIR, "pneumonia", "adult_test_pneumonia_004.jpeg"),
        "clear_lungs": os.path.join(TEST_DATA_DIR, "normal", "adult_test_normal_001.jpeg")
    }

    file_path = preset_map.get(preset_id)
    if not file_path or not os.path.exists(file_path):
        # Fallback to first available file in corresponding directory
        if "normal" in preset_id or preset_id == "clear_lungs":
            norm_dir = os.path.join(TEST_DATA_DIR, "normal")
            files = [f for f in os.listdir(norm_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))]
            file_path = os.path.join(norm_dir, files[0]) if files else None
        else:
            pneu_dir = os.path.join(TEST_DATA_DIR, "pneumonia")
            files = [f for f in os.listdir(pneu_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))]
            file_path = os.path.join(pneu_dir, files[0]) if files else None

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Preset image not found for '{preset_id}'")

    try:
        pil_image = Image.open(file_path)
        result = inference_engine.predict(
            image_input=pil_image,
            cam_threshold=0.35,
            min_area_ratio=0.008,
            file_name=os.path.basename(file_path)
        )
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing preset: {str(e)}"
        )


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict_file(
    file: UploadFile = File(..., description="Chest X-Ray image file (JPEG, PNG)"),
    cam_threshold: float = Form(0.35, description="Activation threshold for Grad-CAM spots (0.1 - 0.9)"),
    min_area_ratio: float = Form(0.008, description="Minimum lesion area ratio filter (0.001 - 0.2)")
):
    """
    Receives a chest X-Ray image via multipart upload, runs DenseNet-121 inference,
    calculates confidence score, detects multiple affected lesions [x1, y1, x2, y2],
    and generates authentic Grad-CAM visualizations and complete clinical AnalysisData.
    """
    if not inference_engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference engine is not initialized"
        )

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read image file. Ensure valid JPEG/PNG: {str(e)}"
        )

    try:
        result = inference_engine.predict(
            image_input=pil_image,
            cam_threshold=cam_threshold,
            min_area_ratio=min_area_ratio,
            file_name=file.filename
        )
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during deep learning inference: {str(e)}"
        )


@app.post("/predict/base64", response_model=PredictionResponse, tags=["Inference"])
async def predict_base64(payload: Base64PredictionRequest):
    """
    Receives a Base64 encoded chest X-ray image and returns detection results with bounding boxes.
    """
    if not inference_engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference engine is not initialized"
        )

    try:
        raw_b64 = payload.image_base64
        # Strip header if present (e.g. data:image/jpeg;base64,...)
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(raw_b64)
        pil_image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image data: {str(e)}"
        )

    try:
        result = inference_engine.predict(
            image_input=pil_image,
            cam_threshold=payload.cam_threshold or 0.35,
            min_area_ratio=payload.min_area_ratio or 0.008,
            file_name=payload.file_name
        )
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during deep learning inference: {str(e)}"
        )
