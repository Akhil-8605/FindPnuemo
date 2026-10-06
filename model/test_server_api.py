import os
import sys
import base64
import glob

# Ensure repo root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi.testclient import TestClient
from api.main import app


def run_api_tests():
    print("=" * 65)
    print("      Testing FindPneumo FastAPI Server Endpoints            ")
    print("=" * 65)

    with TestClient(app) as client:
        # 1. Test Root UI & API Info
        print("\n[1] Testing GET / (HTML UI) and GET /api (JSON) ...")
        resp_ui = client.get("/")
        assert resp_ui.status_code == 200, f"Expected 200, got {resp_ui.status_code}"
        assert "<!DOCTYPE html>" in resp_ui.text

        resp_api = client.get("/api")
        assert resp_api.status_code == 200
        print("API Overview:", resp_api.json())

        # Test Samples endpoint
        resp_samples = client.get("/samples")
        assert resp_samples.status_code == 200
        print("Test samples count:", {k: len(v) for k, v in resp_samples.json().items()})

        # 2. Test Health Check
        print("\n[2] Testing GET /health ...")
        resp = client.get("/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        health_data = resp.json()
        print("Health status:", health_data)
        assert health_data["status"] == "healthy"
        assert health_data["model_loaded"] is True

        # Find sample image
        pneumonia_imgs = glob.glob(os.path.join(current_dir, "data", "pneumonia", "*.jpeg"))
        assert len(pneumonia_imgs) > 0, "No sample pneumonia images found"
        sample_img_path = pneumonia_imgs[0]
        print(f"\nUsing sample image: {os.path.basename(sample_img_path)}")

        # 3. Test Multipart File Upload: POST /predict
        print("\n[3] Testing POST /predict (Multipart Upload) ...")
        with open(sample_img_path, "rb") as f:
            file_bytes = f.read()

        files = {"file": (os.path.basename(sample_img_path), file_bytes, "image/jpeg")}
        data = {"cam_threshold": "0.38", "min_area_ratio": "0.01"}
        resp = client.post("/predict", files=files, data=data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        pred_data = resp.json()

        print(f"Status:                 {pred_data['status']}")
        print(f"Prediction:             {pred_data['prediction']}")
        print(f"Confidence:             {pred_data['confidence_percentage']}%")
        print(f"Pneumonia Probability:  {pred_data['probabilities']['pneumonia'] * 100:.2f}%")
        print(f"Normal Probability:     {pred_data['probabilities']['normal'] * 100:.2f}%")
        print(f"Affected Lesions Count: {pred_data['affected_regions_count']}")

        for spot in pred_data["affected_regions"]:
            print(f"  Spot #{spot['spot_id']}: Bounding Box = {spot['coordinates']}")
            print(f"         Normalized = {spot['normalized']}")
            print(f"         Peak Confidence = {spot['peak_confidence']}, Severity = {spot['severity']}")

        assert len(pred_data["visualizations"]["heatmap_base64"]) > 100
        assert len(pred_data["visualizations"]["overlay_base64"]) > 100
        print("[OK] Multipart POST /predict returned valid confidence, coordinates, and visualizations!")

        # 4. Test Base64 Upload: POST /predict/base64
        print("\n[4] Testing POST /predict/base64 (JSON Payload) ...")
        b64_str = "data:image/jpeg;base64," + base64.b64encode(file_bytes).decode("utf-8")
        payload = {
            "image_base64": b64_str,
            "cam_threshold": 0.40,
            "min_area_ratio": 0.012
        }
        resp = client.post("/predict/base64", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        b64_res = resp.json()
        print(f"Base64 endpoint prediction: {b64_res['prediction']} ({b64_res['confidence_percentage']}%)")
        print(f"Affected spots: {b64_res['affected_regions_count']}")
        print("[OK] Base64 POST /predict/base64 passed successfully!")

    print("\n" + "=" * 65)
    print("         ALL FASTAPI SERVER ENDPOINT TESTS PASSED!           ")
    print("=" * 65)


if __name__ == "__main__":
    run_api_tests()
