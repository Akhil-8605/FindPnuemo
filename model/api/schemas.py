from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class NormalizedCoords(BaseModel):
    x1: float = Field(..., description="Normalized top-left X in range [0, 1]")
    y1: float = Field(..., description="Normalized top-left Y in range [0, 1]")
    x2: float = Field(..., description="Normalized bottom-right X in range [0, 1]")
    y2: float = Field(..., description="Normalized bottom-right Y in range [0, 1]")


class AffectedRegion(BaseModel):
    spot_id: int = Field(..., description="Sequential lesion spot ID (1, 2, ...)")
    x1: int = Field(..., description="Pixel coordinate x1 (top-left)")
    y1: int = Field(..., description="Pixel coordinate y1 (top-left)")
    x2: int = Field(..., description="Pixel coordinate x2 (bottom-right)")
    y2: int = Field(..., description="Pixel coordinate y2 (bottom-right)")
    coordinates: List[int] = Field(..., description="List of [x1, y1, x2, y2] coordinates")
    normalized: NormalizedCoords = Field(..., description="Normalized bounding box coordinates for responsive web/Next.js overlay")
    peak_confidence: float = Field(..., description="Maximum lesion activation intensity [0, 1]")
    mean_intensity: float = Field(..., description="Mean activation score within bounding box [0, 1]")
    area_percentage: float = Field(..., description="Percentage of lung area covered by this lesion")
    severity: str = Field(..., description="Severity level: High, Moderate, or Mild")
    anatomical_zone: Optional[str] = Field(None, description="Radiological lung zone (e.g. Right Lower Zone RLZ, Left Mid Zone LMZ)")


class ImageDimensions(BaseModel):
    width: int
    height: int


class Visualizations(BaseModel):
    heatmap_base64: str = Field(..., description="Pure Grad-CAM JET heatmap as base64 PNG data URI")
    overlay_base64: str = Field(..., description="Original image blended with heatmap & bounding boxes as base64 JPEG")


class PredictionResponse(BaseModel):
    status: str = "success"
    prediction: str = Field(..., description="'Pneumonia' or 'Normal'")
    is_pneumonia: bool = Field(..., description="True if pneumonia is detected, False otherwise")
    confidence: float = Field(..., description="Confidence score [0.0, 1.0]")
    confidence_percentage: float = Field(..., description="Confidence score in percent (e.g. 96.50)")
    probabilities: Dict[str, float] = Field(..., description="Raw probability distribution for Normal and Pneumonia")
    affected_regions_count: int = Field(..., description="Total number of detected pneumonia lesions")
    affected_regions: List[AffectedRegion] = Field(..., description="List of bounding boxes and lesion coordinates")
    image_dimensions: ImageDimensions = Field(..., description="Input image width and height")
    visualizations: Visualizations = Field(..., description="Base64 encoded visualization images")
    analysis: Optional[Dict[str, Any]] = Field(None, description="Complete dynamic clinical AnalysisData object for frontend consumption")
    model_metadata: Dict[str, Any] = Field(..., description="Model architecture, checkpoint and execution device")


class Base64PredictionRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded chest x-ray image (with or without data URI scheme)")
    file_name: Optional[str] = Field(None, description="Optional filename of the radiograph")
    cam_threshold: Optional[float] = Field(0.35, ge=0.1, le=0.9, description="Grad-CAM activation threshold for lesion contouring")
    min_area_ratio: Optional[float] = Field(0.008, ge=0.001, le=0.2, description="Minimum lesion area ratio filter")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    architecture: str
    device: str
    gpu_name: Optional[str] = None
    val_accuracy: Optional[float] = None
    classes: List[str]
