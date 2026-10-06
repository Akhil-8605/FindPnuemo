import requests
import json

url = "http://localhost:8000/predict"

print("--- Testing Adult Pneumonia Sample 002 ---")
with open("data/test/pneumonia/adult_test_pneumonia_002.jpeg", "rb") as f:
    res_pneu = requests.post(url, files={"file": f}, data={"cam_threshold": 0.40})
pneu_json = res_pneu.json()
print("Prediction:", pneu_json.get("prediction"))
print("Confidence:", pneu_json.get("confidence"))
print("Probabilities:", pneu_json.get("probabilities"))
print("Spots Count:", len(pneu_json.get("affected_regions", [])))
for i, s in enumerate(pneu_json.get("affected_regions", [])):
    print(f"  Spot {i+1}: coordinates={s.get('coordinates')} | Zone: {s.get('anatomical_zone')} | Intensity: {s.get('peak_confidence')} | Severity: {s.get('severity')}")

print("\n--- Testing Adult Normal Sample 002 ---")
with open("data/test/normal/adult_test_normal_002.jpeg", "rb") as f:
    res_norm = requests.post(url, files={"file": f}, data={"cam_threshold": 0.40})
norm_json = res_norm.json()
print("Prediction:", norm_json.get("prediction"))
print("Confidence:", norm_json.get("confidence"))
print("Probabilities:", norm_json.get("probabilities"))
print("Spots Count:", len(norm_json.get("affected_regions", [])))
