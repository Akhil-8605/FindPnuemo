import glob
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from src.inference import PneumoniaInferenceEngine

def main():
    engine = PneumoniaInferenceEngine(os.path.join(current_dir, "weights", "densenet121_pneumonia_best.pth"))

    print("=" * 65)
    print("      Testing All 40 Holdout NORMAL Cases      ")
    print("=" * 65)
    norm_files = sorted(glob.glob(os.path.join(current_dir, "data", "test", "normal", "*.jpeg")))
    norm_correct = 0
    norm_pneu_probs = []

    for f in norm_files:
        r = engine.predict(f)
        p = r["probabilities"]["pneumonia"] * 100
        norm_pneu_probs.append(p)
        if r["prediction"] == "Normal":
            norm_correct += 1
        else:
            print(f"  [Misclassified Normal]: {os.path.basename(f)} -> Pneu: {p:.1f}%, Spots: {r['affected_regions_count']}")

    print(f"\nNormal Holdout Accuracy: {norm_correct}/{len(norm_files)} ({norm_correct/len(norm_files)*100:.1f}%)")
    print(f"Mean Pneumonia Prob on Normal: {sum(norm_pneu_probs)/len(norm_pneu_probs):.1f}%")

    print("\n" + "=" * 65)
    print("      Testing All 40 Holdout PNEUMONIA Cases      ")
    print("=" * 65)
    pneu_files = sorted(glob.glob(os.path.join(current_dir, "data", "test", "pneumonia", "*.jpeg")))
    pneu_correct = 0
    pneu_probs = []

    for f in pneu_files:
        r = engine.predict(f)
        p = r["probabilities"]["pneumonia"] * 100
        pneu_probs.append(p)
        if r["prediction"] == "Pneumonia":
            pneu_correct += 1
        else:
            print(f"  [Misclassified Pneumonia]: {os.path.basename(f)} -> Pneu: {p:.1f}%, Spots: {r['affected_regions_count']}")

    print(f"\nPneumonia Holdout Accuracy: {pneu_correct}/{len(pneu_files)} ({pneu_correct/len(pneu_files)*100:.1f}%)")
    print(f"Mean Pneumonia Prob on Pneumonia: {sum(pneu_probs)/len(pneu_probs):.1f}%")

    # Spot details on first 3 pneumonia
    print("\n--- Spot Details on Sample Pneumonia Cases ---")
    for f in pneu_files[:3]:
        r = engine.predict(f)
        print(f"\n{os.path.basename(f)} ({r['prediction']} - {r['confidence_percentage']}%):")
        for s in r['affected_regions']:
            print(f"   Spot #{s['spot_id']}: {s['anatomical_zone']} Box: {s['coordinates']} Norm: {s['normalized']} Peak: {s['peak_confidence']}")

if __name__ == "__main__":
    main()
