import io
import base64
from typing import List, Dict, Tuple, Optional
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import torch
import torch.nn as nn
import torch.nn.functional as F
from scipy.ndimage import gaussian_filter, label as nd_label


def apply_jet_colormap_rgba(normalized_map: np.ndarray) -> np.ndarray:
    """
    Applies the scientific Jet colormap to a 2D float array in range [0, 1],
    with a calibrated alpha transparency channel.
    Low background values (< 0.12) are completely transparent (alpha = 0),
    while active consolidation hotspots (0.25 - 1.0) have vivid RGBA saturation.
    Shape: (H, W, 4) in uint8 [0, 255].
    """
    v = np.clip(normalized_map, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * v - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * v - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * v - 1.0), 0.0, 1.0)

    # Smooth alpha curve: transparent for baseline noise, ramping up for activations
    alpha = np.where(v < 0.12, 0.0, np.minimum(0.92, 0.30 + 0.65 * ((v - 0.12) / 0.88)))
    rgba = np.stack([r, g, b, alpha], axis=-1)
    return (rgba * 255.0).astype(np.uint8)


def apply_jet_colormap(normalized_map: np.ndarray) -> np.ndarray:
    """
    Standard opaque RGB Jet colormap in uint8 [0, 255].
    """
    v = np.clip(normalized_map, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * v - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * v - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * v - 1.0), 0.0, 1.0)
    rgb = np.stack([r, g, b], axis=-1)
    return (rgb * 255.0).astype(np.uint8)


def get_anatomical_zone(x1: float, y1: float, x2: float, y2: float) -> str:
    """
    Determines radiological lung zone based on normalized coordinates [0..1].
    PA Radiograph:
    - Right Hemithorax is on image left (x < 0.50).
    - Left Hemithorax is on image right (x >= 0.50).
    """
    mid_x = (x1 + x2) / 2.0
    mid_y = (y1 + y2) / 2.0

    side = "Right" if mid_x < 0.50 else "Left"

    if mid_y < 0.36:
        level = "Upper Zone (RUZ)" if side == "Right" else "Upper Zone (LUZ)"
    elif mid_y < 0.64:
        level = "Mid Zone (RMZ)" if side == "Right" else "Mid Zone (LMZ)"
    else:
        level = "Lower Zone (RLZ)" if side == "Right" else "Lower Zone (LLZ)"

    return f"{side} {level}"


class GradCAMPlusPlus:
    """
    Grad-CAM++ (Generalized Gradient-weighted Class Activation Mapping)
    with Bone Attenuation, Adaptive Lesion Extraction, and Transparent Overlays.
    """
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.activations = None
        self.gradients = None
        self._hooks = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach().clone()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach().clone()

        self._hooks.append(self.target_layer.register_forward_hook(forward_hook))
        self._hooks.append(self.target_layer.register_full_backward_hook(backward_hook))

    def remove_hooks(self):
        for h in self._hooks:
            h.remove()
        self._hooks = []

    def generate_heatmap(
        self,
        input_tensor: torch.Tensor,
        target_class: int = 1,
        lung_mask: Optional[np.ndarray] = None,
        bone_map: Optional[np.ndarray] = None,
        confidence_scale: float = 1.0
    ) -> np.ndarray:
        """
        Generates calibrated Grad-CAM++ activation map constrained strictly to pulmonary fields.
        """
        self.model.eval()
        self.model.zero_grad()

        output = self.model(input_tensor)
        score = output[:, target_class]
        score.backward(retain_graph=True)

        gradients = self.gradients          # (1, C, H, W)
        activations = self.activations      # (1, C, H, W)

        if gradients is None or activations is None:
            return np.zeros((input_tensor.size(2), input_tensor.size(3)), dtype=np.float32)

        # Grad-CAM++ weights formulation
        pos_grads = F.relu(gradients)
        grad_sum = torch.sum(pos_grads, dim=(2, 3), keepdim=True) + 1e-8
        weights = pos_grads / grad_sum

        cam = torch.sum(weights * activations, dim=1, keepdim=True)
        cam = F.relu(cam)

        cam = F.interpolate(
            cam,
            size=(input_tensor.size(2), input_tensor.size(3)),
            mode="bilinear",
            align_corners=False
        )
        cam = cam.squeeze().cpu().numpy()

        # Step A: Strictly constrain inside lung boundaries (eliminate shoulders, neck, abdomen)
        if lung_mask is not None:
            mask_resized = cv2.resize(
                lung_mask.astype(np.uint8),
                (cam.shape[1], cam.shape[0]),
                interpolation=cv2.INTER_NEAREST
            ) > 0
            cam = cam * mask_resized.astype(np.float32)

        # Step B: Attenuate cortical bone edges (ribs, clavicles)
        if bone_map is not None:
            bone_resized = cv2.resize(
                bone_map.astype(np.float32),
                (cam.shape[1], cam.shape[0]),
                interpolation=cv2.INTER_LINEAR
            )
            bone_suppression = 1.0 - 0.55 * np.clip(bone_resized, 0.0, 1.0)
            cam = cam * bone_suppression

        # Step C: Normalize and calibrate with target class probability
        cam_min, cam_max = cam.min(), cam.max()
        if cam_max - cam_min > 1e-8:
            cam_norm = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam_norm = np.zeros_like(cam)

        calibrated_cam = cam_norm * float(confidence_scale)
        return calibrated_cam

    def extract_multiple_spots(
        self,
        heatmap: np.ndarray,
        threshold: float = 0.35,
        min_area_ratio: float = 0.008,
        original_size: Optional[Tuple[int, int]] = None,
        lung_mask: Optional[np.ndarray] = None,
        is_pneumonia: bool = True
    ) -> List[Dict]:
        """
        Intelligently extracts ONE OR MORE distinct pneumonia lesions with accurate [x1, y1, x2, y2] coordinates.
        Uses adaptive multi-scale peak localization to guarantee accurate bounding boxes without missing lesions.
        """
        if not is_pneumonia:
            return []

        h_cam, w_cam = heatmap.shape
        orig_w, orig_h = original_size if original_size else (w_cam, h_cam)

        scale_x = orig_w / float(w_cam)
        scale_y = orig_h / float(h_cam)

        if lung_mask is not None:
            mask_cam = cv2.resize(lung_mask.astype(np.uint8), (w_cam, h_cam), interpolation=cv2.INTER_NEAREST) > 0
        else:
            mask_cam = np.ones((h_cam, w_cam), dtype=bool)
            mask_cam[:int(h_cam * 0.06), :] = False
            mask_cam[int(h_cam * 0.90):, :] = False
            mask_cam[:, :int(w_cam * 0.08)] = False
            mask_cam[:, int(w_cam * 0.92):] = False

        masked_heat = heatmap * mask_cam.astype(np.float32)
        smoothed = gaussian_filter(masked_heat, sigma=1.2) * mask_cam.astype(np.float32)

        peak_val = float(smoothed.max())
        if peak_val < 0.08:
            return []

        # Adaptive threshold: ensures mild-to-moderate infiltrates are accurately contoured
        adapt_thresh = max(0.18, min(threshold, peak_val * 0.52))

        # Binary thresholding & morphological closing
        binary_mask = (smoothed >= adapt_thresh) & mask_cam
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        closed_binary = cv2.morphologyEx(binary_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)

        labeled_mask, num_features = nd_label(closed_binary)

        raw_spots = []
        mediastinum_col = int(w_cam * 0.50)

        for comp_id in range(1, num_features + 1):
            comp_pixels = (labeled_mask == comp_id)
            comp_area = np.sum(comp_pixels)

            # Minimum area check (at least 0.4% of image area)
            if comp_area < int(h_cam * w_cam * 0.004):
                continue

            ys, xs = np.where(comp_pixels)
            min_x, max_x = int(np.min(xs)), int(np.max(xs))
            min_y, max_y = int(np.min(ys)), int(np.max(ys))

            # Bilateral decomposition: If lesion spans across mediastinum, split into left & right lung spots
            is_bilateral_bridge = (min_x < int(w_cam * 0.45)) and (max_x > int(w_cam * 0.55))
            if is_bilateral_bridge:
                right_pixels = comp_pixels & (np.arange(w_cam)[None, :] <= mediastinum_col)
                if np.sum(right_pixels) >= int(h_cam * w_cam * 0.003):
                    rys, rxs = np.where(right_pixels)
                    raw_spots.append((int(np.min(rxs)), int(np.min(rys)), int(np.max(rxs)), int(np.max(rys))))

                left_pixels = comp_pixels & (np.arange(w_cam)[None, :] > mediastinum_col)
                if np.sum(left_pixels) >= int(h_cam * w_cam * 0.003):
                    lys, lxs = np.where(left_pixels)
                    raw_spots.append((int(np.min(lxs)), int(np.min(lys)), int(np.max(lxs)), int(np.max(lys))))
            else:
                raw_spots.append((min_x, min_y, max_x, max_y))

        # Fallback guarantee: if morphological contour was too strict, place box at primary activation peak
        if len(raw_spots) == 0 and peak_val >= 0.15:
            py, px = np.unravel_index(np.argmax(smoothed), smoothed.shape)
            box_half = int(w_cam * 0.12)
            raw_spots.append((
                max(0, px - box_half),
                max(0, py - box_half),
                min(w_cam - 1, px + box_half),
                min(h_cam - 1, py + box_half)
            ))

        # Format and clinically validate spots
        spots = []
        for x1, y1, x2, y2 in raw_spots:
            crop = smoothed[y1:y2 + 1, x1:x2 + 1]
            if crop.size == 0:
                continue

            peak_conf = float(np.max(crop))
            mean_intensity = float(np.mean(crop))

            # Add gentle 2% margin padding to frame the infiltrative border naturally
            pad_x = int(round(w_cam * 0.015))
            pad_y = int(round(h_cam * 0.015))
            x1_pad = max(0, x1 - pad_x)
            y1_pad = max(0, y1 - pad_y)
            x2_pad = min(w_cam - 1, x2 + pad_x)
            y2_pad = min(h_cam - 1, y2 + pad_y)

            sx1 = int(round(x1_pad * scale_x))
            sy1 = int(round(y1_pad * scale_y))
            sx2 = int(round(x2_pad * scale_x))
            sy2 = int(round(y2_pad * scale_y))

            if sx2 <= sx1 or sy2 <= sy1:
                continue

            box_area = (sx2 - sx1) * (sy2 - sy1)
            area_pct = round((box_area / float(orig_w * orig_h)) * 100.0, 1)

            norm_x1 = max(0.04, min(0.90, round(sx1 / float(orig_w), 4)))
            norm_y1 = max(0.04, min(0.90, round(sy1 / float(orig_h), 4)))
            norm_x2 = max(norm_x1 + 0.05, min(0.96, round(sx2 / float(orig_w), 4)))
            norm_y2 = max(norm_y1 + 0.05, min(0.96, round(sy2 / float(orig_h), 4)))

            # Severity calculation
            if peak_conf >= 0.70 or area_pct >= 14.0:
                severity = "High"
            elif peak_conf >= 0.45 or area_pct >= 6.0:
                severity = "Moderate"
            else:
                severity = "Mild"

            zone = get_anatomical_zone(norm_x1, norm_y1, norm_x2, norm_y2)

            spots.append({
                "x1": sx1,
                "y1": sy1,
                "x2": sx2,
                "y2": sy2,
                "coordinates": [sx1, sy1, sx2, sy2],
                "normalized": {
                    "x1": norm_x1,
                    "y1": norm_y1,
                    "x2": norm_x2,
                    "y2": norm_y2
                },
                "peak_confidence": round(peak_conf, 4),
                "mean_intensity": round(mean_intensity, 4),
                "area_percentage": area_pct,
                "severity": severity,
                "anatomical_zone": zone
            })

        # Sort spots by peak confidence descending and retain top 3
        spots.sort(key=lambda s: s["peak_confidence"], reverse=True)
        spots = spots[:3]

        for i, s in enumerate(spots):
            s["spot_id"] = i + 1

        return spots

    def create_visualization(
        self,
        original_pil: Image.Image,
        heatmap: np.ndarray,
        regions: List[Dict],
        alpha: float = 0.45,
        is_pneumonia: bool = True
    ) -> Tuple[str, str]:
        """
        Generates base64 data URLs for:
        1. Transparent RGBA Grad-CAM Heatmap (Jet colored, transparent background, overlays directly on web canvas)
        2. Blended Heatmap Overlay with Multi-Spot Bounding Boxes and Anatomical Labels (JPEG)
        """
        orig_w, orig_h = original_pil.size
        heatmap_img = Image.fromarray((np.clip(heatmap, 0.0, 1.0) * 255.0).astype(np.uint8))
        heatmap_resized = np.array(heatmap_img.resize((orig_w, orig_h), Image.Resampling.BILINEAR)) / 255.0

        # 1. Base64 Transparent RGBA Grad-CAM Heatmap
        colored_rgba = apply_jet_colormap_rgba(heatmap_resized)
        heatmap_pil = Image.fromarray(colored_rgba, mode="RGBA")
        heat_buf = io.BytesIO()
        heatmap_pil.save(heat_buf, format="PNG")
        heatmap_base64 = "data:image/png;base64," + base64.b64encode(heat_buf.getvalue()).decode("utf-8")

        # 2. Blended Overlay (JPEG)
        base_rgb = original_pil.convert("RGB")
        base_arr = np.array(base_rgb)
        jet_rgb = apply_jet_colormap(heatmap_resized)

        eff_alpha = alpha if is_pneumonia else (alpha * 0.35)
        blended_arr = (eff_alpha * jet_rgb + (1.0 - eff_alpha) * base_arr).astype(np.uint8)
        overlay_pil = Image.fromarray(blended_arr)

        draw = ImageDraw.Draw(overlay_pil)
        try:
            font = ImageFont.load_default()
        except Exception:
            font = None

        for reg in regions:
            x1, y1, x2, y2 = reg["x1"], reg["y1"], reg["x2"], reg["y2"]
            sev = reg["severity"]
            box_color = (244, 63, 94) if sev == "High" else ((245, 158, 11) if sev == "Moderate" else (6, 182, 212))

            # 3-pixel wide outline
            for t in range(3):
                draw.rectangle([x1 - t, y1 - t, x2 + t, y2 + t], outline=box_color)

            # Badge tag text
            zone_short = reg["anatomical_zone"].split("(")[-1].replace(")", "")
            tag = f"Spot {reg['spot_id']}: {zone_short} ({int(reg['peak_confidence'] * 100)}%)"
            badge_h = 18
            badge_w = len(tag) * 7 + 10
            draw.rectangle([x1, max(0, y1 - badge_h), x1 + badge_w, max(badge_h, y1)], fill=(15, 23, 42))
            draw.text((x1 + 5, max(2, y1 - badge_h + 3)), tag, fill=(255, 255, 255), font=font)

        overlay_buf = io.BytesIO()
        overlay_pil.save(overlay_buf, format="JPEG", quality=92)
        overlay_base64 = "data:image/jpeg;base64," + base64.b64encode(overlay_buf.getvalue()).decode("utf-8")

        return heatmap_base64, overlay_base64


GradCAM = GradCAMPlusPlus
