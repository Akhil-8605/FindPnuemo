import os
import sys

# Ensure repository root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import json
import time
import glob
import argparse
from typing import Dict, Tuple

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

from src.model import DenseNet121Pneumonia, DenseNet121MultiSpotPneumonia
from src.dataset import prepare_dataloaders, ChestXRayDataset, get_transforms


from sklearn.metrics import roc_auc_score

def compute_metrics(y_true: torch.Tensor, y_pred: torch.Tensor, y_prob: torch.Tensor) -> Dict[str, float]:
    """
    Computes Accuracy, Sensitivity (Recall for Pneumonia), Specificity, Precision, F1-score, and ROC-AUC.
    """
    y_true_np = y_true.numpy()
    y_pred_np = y_pred.numpy()
    y_prob_np = y_prob.numpy()

    tp = int(((y_pred == 1) & (y_true == 1)).sum().item())
    tn = int(((y_pred == 0) & (y_true == 0)).sum().item())
    fp = int(((y_pred == 1) & (y_true == 0)).sum().item())
    fn = int(((y_pred == 0) & (y_true == 1)).sum().item())

    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    f1 = 2 * (precision * sensitivity) / (precision + sensitivity) if (precision + sensitivity) > 0 else 0.0

    try:
        auc = roc_auc_score(y_true_np, y_prob_np) * 100.0
    except Exception:
        auc = 0.0

    return {
        "accuracy": round(accuracy * 100.0, 2),
        "sensitivity": round(sensitivity * 100.0, 2),
        "specificity": round(specificity * 100.0, 2),
        "precision": round(precision * 100.0, 2),
        "f1_score": round(f1 * 100.0, 2),
        "auc_roc": round(auc, 2),
        "tp": tp, "tn": tn, "fp": fp, "fn": fn
    }


def evaluate_test_set(model: nn.Module, data_dir: str, device: torch.device, img_size: int = 384) -> Dict:
    """
    Evaluates the model on unseen holdout test set (both adults and paediatrics) in data/test/.
    """
    test_dir = os.path.join(data_dir, "test")
    if not os.path.exists(test_dir):
        return {}

    valid_exts = {".jpg", ".jpeg", ".png", ".bmp"}
    norm_files = sorted([f for f in glob.glob(os.path.join(test_dir, "normal", "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])
    pneu_files = sorted([f for f in glob.glob(os.path.join(test_dir, "pneumonia", "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])
    if not pneu_files:
        pneu_files = sorted([f for f in glob.glob(os.path.join(test_dir, "pnuemonia", "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])

    if not norm_files and not pneu_files:
        return {}

    test_samples = [(f, 0) for f in norm_files] + [(f, 1) for f in pneu_files]
    _, val_transform = get_transforms(img_size=img_size)
    test_dataset = ChestXRayDataset(test_samples, transform=val_transform)
    test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False, num_workers=0)

    model.eval()
    all_labels, all_preds, all_probs, all_paths = [], [], [], []
    with torch.no_grad():
        for images, labels, paths in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)[:, 1]
            preds = outputs.argmax(dim=1)
            all_labels.append(labels.cpu())
            all_preds.append(preds.cpu())
            all_probs.append(probs.cpu())
            all_paths.extend(paths)

    y_true = torch.cat(all_labels)
    y_pred = torch.cat(all_preds)
    y_prob = torch.cat(all_probs)
    is_paed = torch.tensor(["paed" in str(p).lower() for p in all_paths], dtype=torch.bool)

    combined_res = compute_metrics(y_true, y_pred, y_prob)
    combined_res["total_samples"] = len(y_true)

    report = {"combined": combined_res}
    if is_paed.any() and (~is_paed).any():
        adult_res = compute_metrics(y_true[~is_paed], y_pred[~is_paed], y_prob[~is_paed])
        adult_res["total_samples"] = int((~is_paed).sum().item())
        paed_res = compute_metrics(y_true[is_paed], y_pred[is_paed], y_prob[is_paed])
        paed_res["total_samples"] = int(is_paed.sum().item())
        report["adult"] = adult_res
        report["paediatric"] = paed_res

    return report


def train_model(
    data_dir: str,
    output_dir: str,
    dataset_type: str = "combined",
    epochs: int = 15,
    batch_size: int = 16,
    lr: float = 3e-4,
    device_name: str = "cuda" if torch.cuda.is_available() else "cpu"
) -> Tuple[nn.Module, Dict]:
    """
    Executes transfer learning on DenseNet-121 using two-phase fine-tuning.
    Phase 1: Feature extractor warm-up (classifier only)
    Phase 2: End-to-end fine-tuning with CosineAnnealingLR schedule
    """
    os.makedirs(output_dir, exist_ok=True)
    device = torch.device(device_name)
    gpu_desc = torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'
    print(f"\n==========================================================================")
    print(f"      FindPneumo AI - DenseNet-121 Neural Network Training               ")
    print(f"==========================================================================")
    print(f"  Target Cohort:    {dataset_type.upper()}")
    print(f"  Compute Device:   {device} ({gpu_desc})")
    print(f"  Planned Epochs:   {epochs}")
    print(f"  Batch Size:       {batch_size} | Learning Rate: {lr}")
    print(f"==========================================================================")

    train_loader, val_loader, stats = prepare_dataloaders(
        data_dir=data_dir,
        dataset_type=dataset_type,
        batch_size=batch_size,
        val_ratio=0.2,
        seed=42
    )

    print(f"[FindPneumo] Dataset Summary: Total {stats['total_images']} images | "
          f"Train: {stats['train_count']} | Val: {stats['val_count']}")

    model = DenseNet121MultiSpotPneumonia(num_classes=2, pretrained=True, dropout_rate=0.35).to(device)

    # Label smoothing prevents overconfidence on smaller medical imaging datasets
    criterion = nn.CrossEntropyLoss(label_smoothing=0.02)

    # Two-phase transfer learning setup
    # Warm-up phase: freeze backbone features for the first 2 epochs
    for param in model.densenet.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True

    optimizer = AdamW(model.classifier.parameters(), lr=lr, weight_decay=1e-4)

    best_val_acc = 0.0
    best_val_loss = float("inf")
    best_epoch = 0
    best_metrics = {}
    checkpoint_path = os.path.join(output_dir, "densenet121_pneumonia_best.pth")

    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
        "val_sensitivity": [],
        "val_specificity": [],
        "val_auc": [],
        "val_f1": []
    }

    print("\n--- Starting Phase 1: Classifier Warm-up (2 epochs) ---")
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        # Unfreeze backbone from epoch 3 onwards
        if epoch == 3:
            print("\n--- Starting Phase 2: End-to-End Fine-Tuning ---")
            for param in model.densenet.parameters():
                param.requires_grad = True

            # Differential learning rates: lower for pretrained backbone, higher for classifier
            optimizer = AdamW([
                {"params": model.densenet.parameters(), "lr": lr * 0.12},
                {"params": model.classifier.parameters(), "lr": lr}
            ], weight_decay=1e-4)

            scheduler = CosineAnnealingLR(optimizer, T_max=epochs - 2, eta_min=1e-6)
        elif epoch > 3:
            scheduler.step()

        # Training Step
        model.train()
        train_loss = 0.0
        train_correct = 0
        total_train = 0

        total_batches = len(train_loader)
        for batch_idx, (images, labels, _) in enumerate(train_loader, 1):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            preds = outputs.argmax(dim=1)
            train_correct += (preds == labels).sum().item()
            total_train += labels.size(0)

            # Live intra-epoch visual progress display
            pct = int((batch_idx / total_batches) * 20)
            bar = "=" * pct + ">" + " " * (20 - pct)
            current_acc = (train_correct / total_train) * 100.0
            current_loss = train_loss / total_train
            print(f"\r  --> Epoch [{epoch:02d}/{epochs:02d}] [{bar}] Batch {batch_idx:02d}/{total_batches:02d} | Loss: {current_loss:.4f} | Acc: {current_acc:.1f}%", end="", flush=True)

        epoch_train_loss = train_loss / total_train
        epoch_train_acc = (train_correct / total_train) * 100.0

        # Validation Step
        model.eval()
        val_loss = 0.0
        all_labels = []
        all_preds = []
        all_probs = []
        all_paths = []

        with torch.no_grad():
            for images, labels, paths in val_loader:
                images = images.to(device)
                labels = labels.to(device)

                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)

                probs = torch.softmax(outputs, dim=1)[:, 1]
                preds = outputs.argmax(dim=1)

                all_labels.append(labels.cpu())
                all_preds.append(preds.cpu())
                all_probs.append(probs.cpu())
                all_paths.extend(paths)

        val_total = len(all_labels)
        epoch_val_loss = val_loss / len(val_loader.dataset)
        val_true = torch.cat(all_labels)
        val_pred = torch.cat(all_preds)
        val_prob = torch.cat(all_probs)

        metrics = compute_metrics(val_true, val_pred, val_prob)
        epoch_val_acc = metrics["accuracy"]

        # Subgroup validation breakdown (Adult vs Paediatric)
        is_paed_val = torch.tensor(["paed" in str(p).lower() for p in all_paths], dtype=torch.bool)
        if is_paed_val.any() and (~is_paed_val).any():
            metrics["adult_validation"] = compute_metrics(val_true[~is_paed_val], val_pred[~is_paed_val], val_prob[~is_paed_val])
            metrics["paediatric_validation"] = compute_metrics(val_true[is_paed_val], val_pred[is_paed_val], val_prob[is_paed_val])

        history["train_loss"].append(round(epoch_train_loss, 4))
        history["train_acc"].append(round(epoch_train_acc, 2))
        history["val_loss"].append(round(epoch_val_loss, 4))
        history["val_acc"].append(round(epoch_val_acc, 2))
        history["val_sensitivity"].append(metrics["sensitivity"])
        history["val_specificity"].append(metrics["specificity"])
        history["val_auc"].append(metrics["auc_roc"])
        history["val_f1"].append(metrics["f1_score"])

        # Clear progress line and print complete epoch validation summary
        print(f"\rEpoch [{epoch:02d}/{epochs:02d}] "
              f"Train Loss: {epoch_train_loss:.4f} Acc: {epoch_train_acc:.1f}% | "
              f"Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc:.1f}% | "
              f"Sens: {metrics['sensitivity']:.1f}% Spec: {metrics['specificity']:.1f}% | AUC: {metrics['auc_roc']:.1f}%     ")

        # Save Best Checkpoint
        is_best = (epoch_val_acc > best_val_acc) or (epoch_val_acc == best_val_acc and epoch_val_loss < best_val_loss)
        if is_best:
            best_val_acc = epoch_val_acc
            best_val_loss = epoch_val_loss
            best_epoch = epoch
            best_metrics = metrics

            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": best_val_acc,
                "val_loss": best_val_loss,
                "metrics": metrics,
                "model_architecture": "DenseNet-121",
                "classes": ChestXRayDataset.CLASS_NAMES
            }, checkpoint_path)
            print(f"  --> Saved new best checkpoint (Val Acc: {best_val_acc:.1f}%) to {checkpoint_path}")

        # Update both summary files after each epoch
        live_summary = {
            "best_epoch": best_epoch,
            "best_val_acc": best_val_acc,
            "best_val_loss": round(best_val_loss, 4),
            "current_epoch": epoch,
            "total_epochs": epochs,
            "dataset_type": dataset_type,
            "device": device_name,
            "dataset_stats": stats,
            "best_metrics": best_metrics,
            "history": history
        }
        # Update summary file after each epoch
        try:
            with open(os.path.join(output_dir, "training_summary.json"), "w", encoding="utf-8") as f:
                json.dump(live_summary, f, indent=2)
        except Exception:
            pass

    elapsed = round(time.time() - start_time, 1)

    # Load best checkpoint weights for final holdout testing on unseen data
    try:
        best_ckpt = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(best_ckpt["model_state_dict"])
    except Exception:
        pass

    print("\n  [Evaluating Best Checkpoint on Unseen Holdout Test Dataset...]")
    holdout_test_results = evaluate_test_set(model, data_dir, device)

    # Save final comprehensive summary report
    final_summary = {
        "best_epoch": best_epoch,
        "best_val_acc": best_val_acc,
        "best_val_loss": round(best_val_loss, 4),
        "total_epochs": epochs,
        "training_time_seconds": elapsed,
        "dataset_type": dataset_type,
        "device": device_name,
        "dataset_stats": stats,
        "best_metrics": best_metrics,
        "holdout_test": holdout_test_results,
        "history": history
    }

    with open(os.path.join(output_dir, "training_summary.json"), "w", encoding="utf-8") as f:
        json.dump(final_summary, f, indent=2)

    # Rich Command Prompt Terminal Display of all training results
    print("\n" + "=" * 80)
    print("              FINDPNEUMO AI - MODEL TRAINING COMPLETE REPORT             ")
    print("=" * 80)
    print(f"  Target Cohort:           {dataset_type.upper()} ({stats['total_images']} Images)")
    print(f"  Training Time:           {elapsed} seconds")
    print(f"  Total Epochs Completed:  {epochs}")
    print(f"  Best Checkpoint Epoch:   Epoch {best_epoch}")
    print("-" * 80)
    print("  FINAL OPTIMAL VALIDATION PERFORMANCE (Stratified):")
    print(f"    [*] Combined Accuracy:   {best_val_acc:.2f}%")
    print(f"    [*] Cross-Entropy Loss:  {best_val_loss:.4f}")
    print(f"    [*] Sensitivity (Recall):{best_metrics.get('sensitivity', 0.0):.2f}%")
    print(f"    [*] Specificity:         {best_metrics.get('specificity', 0.0):.2f}%")
    print(f"    [*] Precision (PPV):     {best_metrics.get('precision', 0.0):.2f}%")
    print(f"    [*] F1-Score:            {best_metrics.get('f1_score', 0.0):.2f}%")
    print(f"    [*] ROC-AUC:             {best_metrics.get('auc_roc', 0.0):.2f}%")
    
    if "adult_validation" in best_metrics:
        av = best_metrics["adult_validation"]
        print(f"    --> Adult Cohort Val:    Acc: {av['accuracy']:.1f}% | Sens: {av['sensitivity']:.1f}% | Spec: {av['specificity']:.1f}% | AUC: {av['auc_roc']:.1f}%")
    if "paediatric_validation" in best_metrics:
        pv = best_metrics["paediatric_validation"]
        print(f"    --> Paediatric Cohort Val: Acc: {pv['accuracy']:.1f}% | Sens: {pv['sensitivity']:.1f}% | Spec: {pv['specificity']:.1f}% | AUC: {pv['auc_roc']:.1f}%")

    print("-" * 80)
    print("  CONFUSION MATRIX (Holdout Validation):")
    print(f"    True Positives (TP):   {best_metrics.get('tp', 0):<5} | False Positives (FP):  {best_metrics.get('fp', 0)}")
    print(f"    True Negatives (TN):   {best_metrics.get('tn', 0):<5} | False Negatives (FN):  {best_metrics.get('fn', 0)}")

    if holdout_test_results and "combined" in holdout_test_results:
        tc = holdout_test_results["combined"]
        print("-" * 80)
        print(f"  HOLDOUT TEST SET EVALUATION (Unseen Cohort, N={tc.get('total_samples', 100)}):")
        print(f"    [*] Combined Test Acc:   {tc.get('accuracy', 0.0):.2f}%")
        print(f"    [*] Sensitivity (Recall):{tc.get('sensitivity', 0.0):.2f}%")
        print(f"    [*] Specificity:         {tc.get('specificity', 0.0):.2f}%")
        print(f"    [*] Precision (PPV):     {tc.get('precision', 0.0):.2f}%")
        print(f"    [*] ROC-AUC:             {tc.get('auc_roc', 0.0):.2f}%")
        print(f"    [*] Test Confusion Matrix: TP: {tc.get('tp', 0)}, TN: {tc.get('tn', 0)}, FP: {tc.get('fp', 0)}, FN: {tc.get('fn', 0)}")

        if "adult" in holdout_test_results:
            ta = holdout_test_results["adult"]
            print(f"    --> Adult Test Cohort (N={ta.get('total_samples', 50)}):     Acc: {ta.get('accuracy', 0.0):.1f}% | Sens: {ta.get('sensitivity', 0.0):.1f}% | Spec: {ta.get('specificity', 0.0):.1f}% | AUC: {ta.get('auc_roc', 0.0):.1f}%")
        if "paediatric" in holdout_test_results:
            tp = holdout_test_results["paediatric"]
            print(f"    --> Paediatric Test Cohort (N={tp.get('total_samples', 50)}): Acc: {tp.get('accuracy', 0.0):.1f}% | Sens: {tp.get('sensitivity', 0.0):.1f}% | Spec: {tp.get('specificity', 0.0):.1f}% | AUC: {tp.get('auc_roc', 0.0):.1f}%")

    print("-" * 80)
    print("  SAVED ARTIFACTS & CHECKPOINTS:")
    print(f"    [OK] Model Weights:    {checkpoint_path}")
    print(f"    [OK] Training Summary: {os.path.join(output_dir, 'training_summary.json')}")
    print("=" * 80 + "\n")

    return model, final_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train DenseNet-121 for Pneumonia Detection")
    parser.add_argument("--data_dir", type=str, default="data", help="Path to data folder")
    parser.add_argument("--output_dir", type=str, default="weights", help="Folder to save trained model")
    parser.add_argument("--dataset", type=str, default="combined", choices=["adult", "paediatric", "pediatric", "combined"], help="Cohort type")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    args = parser.parse_args()

    train_model(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        dataset_type=args.dataset,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr
    )
