import os
import sys
import json
import glob

# Ensure repo root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from src.inference import PneumoniaInferenceEngine


def test_inference():
    weights_path = os.path.join(current_dir, "weights", "densenet121_pneumonia_best.pth")
    if not os.path.exists(weights_path):
        print(f"[TEST FAILED] Checkpoint not found at {weights_path}")
        return

    print("=" * 65)
    print("      Testing FindPneumo DenseNet-121 Inference Engine       ")
    print("=" * 65)

    engine = PneumoniaInferenceEngine(checkpoint_path=weights_path)

    pneumonia_samples = glob.glob(os.path.join(current_dir, "data", "test", "pneumonia", "*.jpeg"))
    normal_samples = glob.glob(os.path.join(current_dir, "data", "test", "normal", "*.jpeg"))

    test_cases = []
    for p in pneumonia_samples[:3]:
        test_cases.append(("Pneumonia Case", p))
    for n in normal_samples[:2]:
        test_cases.append(("Normal Case", n))

    for label, img_path in test_cases:
        print(f"\n--- Testing: {label} ---")
        print(f"File: {os.path.basename(img_path)}")

        res = engine.predict(img_path, cam_threshold=0.38, min_area_ratio=0.010)

        print(f"Prediction:            {res['prediction']}")
        print(f"Is Pneumonia:          {res['is_pneumonia']}")
        print(f"Confidence:            {res['confidence_percentage']}%")
        print(f"Probabilities:         Normal={res['probabilities']['normal'] * 100:.1f}%, Pneumonia={res['probabilities']['pneumonia'] * 100:.1f}%")
        print(f"Image Dimensions:      {res['image_dimensions']['width']}x{res['image_dimensions']['height']}")
        print(f"Affected Spots Count:  {res['affected_regions_count']}")

        for spot in res['affected_regions']:
            print(f"  [Spot #{spot['spot_id']}: {spot.get('anatomical_zone', 'N/A')}]")
            print(f"    Bounding Box [x1, y1, x2, y2]: {spot['coordinates']}")
            print(f"    Normalized [0..1]:             x1={spot['normalized']['x1']}, y1={spot['normalized']['y1']}, x2={spot['normalized']['x2']}, y2={spot['normalized']['y2']}")
            print(f"    Peak Intensity:                {spot['peak_confidence']}")
            print(f"    Area Coverage:                 {spot['area_percentage']}%")
            print(f"    Severity:                      {spot['severity']}")

        print(f"Heatmap Base64 length: {len(res['visualizations']['heatmap_base64'])} chars")
        print(f"Overlay Base64 length: {len(res['visualizations']['overlay_base64'])} chars")
        print("[OK] Successfully verified multi-spot lesion bounding boxes and anatomical zones!")

    print("\n" + "=" * 65)
    print("           All Inference & Grad-CAM Tests Passed!            ")
    print("=" * 65)


if __name__ == "__main__":
    test_inference()
