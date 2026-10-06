import os
import sys

# Ensure repository root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import io
from typing import Union, Dict, Any, Optional
from PIL import Image
import torch
from torchvision import transforms

from src.model import DenseNet121Pneumonia
from src.gradcam import GradCAM
from src.clinical_preprocess import preprocess_clinical_xray
from src.clinical_synthesis import synthesize_clinical_analysis


class PneumoniaInferenceEngine:
    """
    High-performance inference engine for Pneumonia detection using DenseNet-121.
    Performs classification, Grad-CAM localization with bone suppression,
    and multi-spot pulmonary lesion extraction.
    """
    def __init__(self, checkpoint_path: str, device: Optional[str] = None):
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        self.checkpoint_path = checkpoint_path
        self.model = DenseNet121Pneumonia(num_classes=2, pretrained=False).to(self.device)

        if os.path.exists(checkpoint_path):
            checkpoint = torch.load(checkpoint_path, map_location=self.device)
            state_dict = checkpoint.get("model_state_dict", checkpoint)
            self.model.load_state_dict(state_dict)
            self.val_acc = checkpoint.get("val_acc", None)
            print(f"[FindPneumo] Loaded checkpoint from {checkpoint_path} (Val Acc: {self.val_acc}%) on {self.device}")
        else:
            print(f"[FindPneumo] WARNING: Checkpoint not found at {checkpoint_path}. Using initial weights.")
            self.val_acc = None

        self.model.eval()
        self.cam_target = self.model.get_cam_target_layer()

        self.transform = transforms.Compose([
            transforms.Resize((384, 384)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict(
        self,
        image_input: Union[Image.Image, bytes, str],
        cam_threshold: float = 0.35,
        min_area_ratio: float = 0.008,
        file_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs complete clinical analysis on a chest X-ray image:
        - Classification (Normal vs Pneumonia)
        - Confidence score & Class probabilities
        - Anatomical lung field segmentation (eliminates shoulders/arms)
        - Bone ridge attenuation (suppresses rib & clavicle artifacts)
        - Multiple affected lesion coordinates [x1, y1, x2, y2]
        - Calibrated Base64 Heatmap & Bounding Box Overlay
        """
        # Load image into PIL
        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, str):
            image = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            image = image_input.convert("RGB")
        else:
            raise ValueError(f"Unsupported image type: {type(image_input)}")

        orig_w, orig_h = image.size

        # Clinical Preprocessing: Telea inpainting, CLAHE, Lung Field Mask, and Bone Map
        enhanced_arr, lung_mask, bone_map, cleaned_pil = preprocess_clinical_xray(
            image=image,
            target_size=(384, 384),
            apply_clahe=True,
            clean_markers=True
        )

        tensor = self.transform(cleaned_pil).unsqueeze(0).to(self.device)

        # Forward Pass
        with torch.set_grad_enabled(True):
            tensor.requires_grad = True
            gradcam = GradCAM(self.model, self.cam_target)

            outputs = self.model(tensor)
            probs = torch.softmax(outputs, dim=1).detach().squeeze().cpu().numpy()

            normal_prob = float(probs[0])
            pneumonia_prob = float(probs[1])
            is_pneumonia = pneumonia_prob >= 0.50

            label = "Pneumonia" if is_pneumonia else "Normal"
            confidence = pneumonia_prob if is_pneumonia else normal_prob

            # Grad-CAM++ heatmap: constrained to lung fields, bone edges attenuated, scaled by probability
            heatmap = gradcam.generate_heatmap(
                input_tensor=tensor,
                target_class=1,
                lung_mask=lung_mask,
                bone_map=bone_map,
                confidence_scale=pneumonia_prob
            )

            # Extract multiple pneumonia spots inside lung fields
            regions = gradcam.extract_multiple_spots(
                heatmap=heatmap,
                threshold=cam_threshold,
                min_area_ratio=min_area_ratio,
                original_size=(orig_w, orig_h),
                lung_mask=lung_mask,
                is_pneumonia=is_pneumonia
            )

            # Generate base64 visualization images
            heatmap_b64, overlay_b64 = gradcam.create_visualization(
                original_pil=cleaned_pil,
                heatmap=heatmap,
                regions=regions,
                alpha=0.45,
                is_pneumonia=is_pneumonia
            )

            gradcam.remove_hooks()

        # Deep clinical radiological synthesis for frontend consumption
        analysis_data = synthesize_clinical_analysis(
            is_pneumonia=is_pneumonia,
            confidence=confidence,
            normal_prob=normal_prob,
            pneumonia_prob=pneumonia_prob,
            spots=regions,
            image_pil=cleaned_pil,
            heatmap_base64=heatmap_b64,
            overlay_base64=overlay_b64,
            file_name=file_name
        )

        return {
            "prediction": label,
            "is_pneumonia": is_pneumonia,
            "confidence": round(confidence, 4),
            "confidence_percentage": round(confidence * 100.0, 2),
            "probabilities": {
                "normal": round(normal_prob, 4),
                "pneumonia": round(pneumonia_prob, 4)
            },
            "affected_regions_count": len(regions),
            "affected_regions": regions,
            "image_dimensions": {
                "width": orig_w,
                "height": orig_h
            },
            "visualizations": {
                "heatmap_base64": heatmap_b64,
                "overlay_base64": overlay_b64
            },
            "analysis": analysis_data,
            "model_metadata": {
                "architecture": "DenseNet-121 Transfer Learning",
                "device": str(self.device),
                "checkpoint": os.path.basename(self.checkpoint_path),
                "val_accuracy": self.val_acc
            }
        }
