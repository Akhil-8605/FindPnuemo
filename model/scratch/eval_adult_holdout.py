import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import glob
import numpy as np
import torch
from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

from src.inference import PneumoniaInferenceEngine

def main():
    engine = PneumoniaInferenceEngine("weights/densenet121_pneumonia_best.pth")
    
    norm_files = sorted(glob.glob("data/test/normal/*.jpeg"))
    pneu_files = sorted(glob.glob("data/test/pneumonia/*.jpeg"))
    
    print(f"Holdout Normal files: {len(norm_files)}, Holdout Pneumonia files: {len(pneu_files)}")
    
    all_files = [(f, 0) for f in norm_files] + [(f, 1) for f in pneu_files]
    
    y_true = []
    y_pred = []
    y_prob = []
    
    norm_spots_count = []
    pneu_spots_count = []
    
    for f, label in all_files:
        res = engine.predict(f)
        pneu_prob = res['probabilities']['pneumonia']
        pred_label = 1 if res['prediction'] == 'Pneumonia' else 0
        
        y_true.append(label)
        y_pred.append(pred_label)
        y_prob.append(pneu_prob)
        
        spots = res.get('affected_regions', [])
        if label == 0:
            norm_spots_count.append(len(spots))
        else:
            pneu_spots_count.append(len(spots))
            
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_prob = np.array(y_prob)
    
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    acc = accuracy_score(y_true, y_pred) * 100.0
    sens = recall_score(y_true, y_pred) * 100.0
    spec = tn / (tn + fp) * 100.0
    prec = precision_score(y_true, y_pred) * 100.0
    f1 = f1_score(y_true, y_pred) * 100.0
    auc = roc_auc_score(y_true, y_prob) * 100.0
    
    print("\n" + "="*50)
    print("      ADULT HOLDOUT TEST SET PERFORMANCE (N=50)    ")
    print("="*50)
    print(f"Confusion Matrix: TP={tp}, TN={tn}, FP={fp}, FN={fn}")
    print(f"Accuracy:         {acc:.2f}%")
    print(f"Sensitivity:      {sens:.2f}%")
    print(f"Specificity:      {spec:.2f}%")
    print(f"Precision:        {prec:.2f}%")
    print(f"F1-Score:         {f1:.2f}%")
    print(f"ROC-AUC:          {auc:.2f}%")
    print(f"Mean spots on Normal:    {np.mean(norm_spots_count):.2f} (should be near 0)")
    print(f"Mean spots on Pneumonia: {np.mean(pneu_spots_count):.2f}")
    print("="*50)

if __name__ == "__main__":
    main()
