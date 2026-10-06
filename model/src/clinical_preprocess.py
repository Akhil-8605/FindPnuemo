import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional


def remove_annotations_and_markers(img_gray: np.ndarray) -> np.ndarray:
    """
    Detects and inpaints non-anatomical markings (arrows, burned-in letter markers 'R'/'L',
    text annotations) using OpenCV morphology and Telea inpainting.
    """
    h, w = img_gray.shape

    # Detect bright artificial markings (intensity > 248)
    _, bright_thresh = cv2.threshold(img_gray, 248, 255, cv2.THRESH_BINARY)

    margin_mask = np.zeros_like(bright_thresh)
    margin_h = int(h * 0.12)
    margin_w = int(w * 0.12)

    margin_mask[:margin_h, :] = 1
    margin_mask[h - margin_h:, :] = 1
    margin_mask[:, :margin_w] = 1
    margin_mask[:, w - margin_w:] = 1

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    grad = cv2.morphologyEx(img_gray, cv2.MORPH_GRADIENT, kernel)
    _, high_grad = cv2.threshold(grad, 120, 255, cv2.THRESH_BINARY)

    candidate_mask = (bright_thresh & margin_mask) | (bright_thresh & high_grad)

    contours, _ = cv2.findContours(candidate_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    inpaint_mask = np.zeros_like(bright_thresh)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 8 <= area <= (h * w * 0.04):
            cv2.drawContours(inpaint_mask, [cnt], -1, 255, thickness=cv2.FILLED)

    if cv2.countNonZero(inpaint_mask) > 0:
        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        inpaint_mask = cv2.dilate(inpaint_mask, kernel_dilate, iterations=1)
        cleaned = cv2.inpaint(img_gray, inpaint_mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
        return cleaned

    return img_gray


def apply_clahe_enhancement(
    img_gray: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid: Tuple[int, int] = (8, 8)
) -> np.ndarray:
    """
    Applies Contrast Limited Adaptive Histogram Equalization (CLAHE).
    Standard radiologist imaging technique to enhance alveolar infiltrates and bronchovascular markings.
    """
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid)
    return clahe.apply(img_gray)


def extract_anatomical_lung_field_mask(img_gray: np.ndarray) -> np.ndarray:
    """
    Dynamically isolates the bilateral pulmonary lung fields and strictly excludes:
    - Shoulders (clavicles, acromions, humeral heads, axillary folds)
    - Arms and lateral soft tissues
    - Upper neck and chin
    - Subdiaphragmatic abdomen
    Returns binary mask (uint8) where 255 = inside pulmonary field, 0 = outside.
    """
    h, w = img_gray.shape

    # 1. Anatomical thoracic bounding box (lungs strictly reside within central thorax)
    # Lungs never reach top 8% (neck), bottom 12% (abdomen), or outer 12% (shoulders/arms)
    y_min, y_max = int(h * 0.08), int(h * 0.88)
    x_min, x_max = int(w * 0.12), int(w * 0.88)

    # 2. Extract internal lung airspaces using adaptive thresholding
    blurred = cv2.GaussianBlur(img_gray, (9, 9), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 41, 4
    )

    # Apply central thoracic bounding box
    bounded = np.zeros_like(thresh)
    bounded[y_min:y_max, x_min:x_max] = thresh[y_min:y_max, x_min:x_max]

    # Morphological closing and dilation to create continuous lung lobes
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(9, int(w * 0.025)), max(9, int(h * 0.025))))
    closed = cv2.morphologyEx(bounded, cv2.MORPH_CLOSE, kernel_close)

    # Find the largest internal components corresponding to left & right lungs
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    lung_mask = np.zeros((h, w), dtype=np.uint8)

    if contours:
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        # Combine the top contours (left & right lung fields)
        total_lung_area = 0
        for cnt in contours[:4]:
            area = cv2.contourArea(cnt)
            if area > (h * w * 0.015):
                # Smooth contour with convex hull
                hull = cv2.convexHull(cnt)
                cv2.drawContours(lung_mask, [hull], -1, 255, thickness=cv2.FILLED)
                total_lung_area += area

    # Fallback to anatomical bilateral lung lobes if contours failed
    if total_lung_area < (h * w * 0.05):
        # Default anatomical lung shape: Left lobe and Right lobe
        # Right lung: x: 14% to 46%, y: 10% to 85%
        cv2.ellipse(lung_mask, (int(w * 0.30), int(h * 0.48)), (int(w * 0.16), int(h * 0.35)), 0, 0, 360, 255, -1)
        # Left lung: x: 54% to 86%, y: 12% to 85%
        cv2.ellipse(lung_mask, (int(w * 0.70), int(h * 0.48)), (int(w * 0.16), int(h * 0.35)), 0, 0, 360, 255, -1)

    # Enforce strict boundary cutoffs: no shoulders, no neck, no abdomen
    lung_mask[:y_min, :] = 0
    lung_mask[y_max:, :] = 0
    lung_mask[:, :x_min] = 0
    lung_mask[:, x_max:] = 0

    return lung_mask


def compute_bone_attenuation_map(img_gray: np.ndarray) -> np.ndarray:
    """
    Extracts high-frequency cortical bone boundaries (ribs, clavicles) using
    morphological Top-Hat and edge gradient filtering.
    Used by Grad-CAM to downweight bone edge artifacts and prioritize soft alveolar consolidations.
    Returns float32 array in [0.0, 1.0].
    """
    kernel_bone = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    top_hat = cv2.morphologyEx(img_gray, cv2.MORPH_TOPHAT, kernel_bone)

    # Sobel gradient for sharp linear cortical edges
    grad_x = cv2.Sobel(img_gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(img_gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = cv2.magnitude(grad_x, grad_y)

    # Normalize to [0, 1]
    top_hat_f = top_hat.astype(np.float32) / 255.0
    grad_norm = grad_mag / (grad_mag.max() + 1e-8)

    # Combined bone edge map
    bone_map = 0.5 * top_hat_f + 0.5 * grad_norm
    bone_map = np.clip(bone_map, 0.0, 1.0)
    return bone_map


def preprocess_clinical_xray(
    image: Image.Image,
    target_size: Tuple[int, int] = (384, 384),
    apply_clahe: bool = True,
    clean_markers: bool = True
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, Image.Image]:
    """
    Complete clinical preprocessing pipeline:
      1. Converts to grayscale.
      2. Removes and inpaints non-anatomical text/arrow markers.
      3. Enhances radiographic texture with CLAHE.
      4. Computes strict pulmonary lung field mask (excludes shoulders/arms/neck).
      5. Computes bone attenuation map.
      6. Returns (resized_enhanced, resized_lung_mask, resized_bone_map, cleaned_pil_rgb).
    """
    # Convert and resize to target_size for high-speed, consistent anatomical processing
    img_gray_orig = np.array(image.convert("L"))
    if clean_markers:
        img_gray_orig = remove_annotations_and_markers(img_gray_orig)

    img_gray = cv2.resize(img_gray_orig, target_size, interpolation=cv2.INTER_AREA)

    if apply_clahe:
        enhanced = apply_clahe_enhancement(img_gray, clip_limit=2.0, tile_grid=(8, 8))
    else:
        enhanced = img_gray

    lung_mask = extract_anatomical_lung_field_mask(enhanced)
    bone_map = compute_bone_attenuation_map(enhanced)

    rgb_arr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)
    cleaned_pil = Image.fromarray(rgb_arr)

    return enhanced, lung_mask, bone_map, cleaned_pil
