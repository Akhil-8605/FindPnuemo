import os
import sys
import glob
from PIL import Image
import cv2
import numpy as np
import torch
from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src.model import DenseNet121Pneumonia
from src.dataset import get_transforms

def run_evaluation():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    checkpoint_path = os.path.join(BASE_DIR, "weights", "densenet121_pneumonia_best.pth")
    if not os.path.exists(checkpoint_path):
        print(f"Error: checkpoint {checkpoint_path} not found.")
        return

    checkpoint = torch.load(checkpoint_path, map_location=device)
    model = DenseNet121Pneumonia(num_classes=2, pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    _, val_transform = get_transforms(img_size=384)

    test_dir = os.path.join(BASE_DIR, "data", "test")
    norm_files = sorted(glob.glob(os.path.join(test_dir, "normal", "*.*")))
    pneu_files = sorted(glob.glob(os.path.join(test_dir, "pneumonia", "*.*")))

    print(f"Found {len(norm_files)} Normal holdout images and {len(pneu_files)} Pneumonia holdout images.")

    all_files = [(f, 0) for f in norm_files] + [(f, 1) for f in pneu_files]

    results = []

    for fpath, true_label in all_files:
        fname = os.path.basename(fpath).lower()
        is_paed = "paed" in fname
        cohort = "paediatric" if is_paed else "adult"

        # Preprocess with CLAHE matching dataset.py exactly
        img_gray = np.array(Image.open(fpath).convert("L"))
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(img_gray)
        pil_img = Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB))
        tensor_img = val_transform(pil_img).unsqueeze(0).to(device)

        with torch.no_grad():
            outputs = model(tensor_img)
            probs = torch.softmax(outputs, dim=1)[0]
            pred_label = outputs.argmax(dim=1).item()
            prob_pneu = probs[1].item()

        results.append({
            "file": fname,
            "cohort": cohort,
            "true_label": true_label,
            "pred_label": pred_label,
            "prob_pneu": prob_pneu
        })

    def print_metrics(subset, title):
        y_true = [x["true_label"] for x in subset]
        y_pred = [x["pred_label"] for x in subset]
        y_prob = [x["prob_pneu"] for x in subset]

        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()

        acc = accuracy_score(y_true, y_pred) * 100.0
        prec = precision_score(y_true, y_pred, zero_division=0) * 100.0
        sens = recall_score(y_true, y_pred, zero_division=0) * 100.0
        spec = (tn / (tn + fp)) * 100.0 if (tn + fp) > 0 else 0.0
        f1 = f1_score(y_true, y_pred, zero_division=0) * 100.0
        try:
            auc = roc_auc_score(y_true, y_prob) * 100.0
        except Exception:
            auc = 0.0

        print("\n" + "=" * 76)
        print(f"  HOLDOUT EVALUATION REPORT: {title.upper()} (N = {len(subset)})")
        print("=" * 76)
        print(f"  • Overall Accuracy:        {acc:6.2f}%")
        print(f"  • Sensitivity / Recall:    {sens:6.2f}% ({tp}/{tp + fn} Pneumonia cases identified)")
        print(f"  • Specificity:             {spec:6.2f}% ({tn}/{tn + fp} Normal cases identified)")
        print(f"  • Precision / PPV:         {prec:6.2f}%")
        print(f"  • F1-Score:                {f1:6.2f}%")
        print(f"  • ROC-AUC Score:           {auc:6.2f}%")
        print(f"  • Confusion Matrix:        TP = {tp:<3} | FP = {fp:<3} | TN = {tn:<3} | FN = {fn:<3}")
        print("=" * 76)
        return {
            "n": len(subset),
            "accuracy": round(acc, 2),
            "sensitivity": round(sens, 2),
            "specificity": round(spec, 2),
            "precision": round(prec, 2),
            "f1_score": round(f1, 2),
            "auc": round(auc, 2),
            "tp": int(tp),
            "fp": int(fp),
            "tn": int(tn),
            "fn": int(fn)
        }

    adult_subset = [x for x in results if x["cohort"] == "adult"]
    paed_subset = [x for x in results if x["cohort"] == "paediatric"]

    combined_m = print_metrics(results, "Combined Holdout Test Set (Adults + Paediatrics)")
    adult_m = print_metrics(adult_subset, "Adult Subgroup Holdout Test Set")
    paed_m = print_metrics(paed_subset, "Paediatric Subgroup Holdout Test Set")

    return {
        "combined": combined_m,
        "adult": adult_m,
        "paediatric": paed_m
    }

if __name__ == "__main__":
    run_evaluation()
