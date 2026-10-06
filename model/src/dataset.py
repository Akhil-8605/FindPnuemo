import os
import glob
import random
from typing import Tuple, List, Dict
from PIL import Image
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms


class ChestXRayDataset(Dataset):
    """
    Dataset for Pneumonia Chest X-Ray detection.
    Loads images from normal and pneumonia folders.
    Class 0: Normal
    Class 1: Pneumonia
    """
    CLASS_NAMES = ["Normal", "Pneumonia"]

    def __init__(self, samples: List[Tuple[str, int]], transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, str]:
        img_path, label = self.samples[idx]
        # Clinical preprocessing: CLAHE enhancement for clear lung infiltration visibility
        img_gray = np.array(Image.open(img_path).convert("L"))
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(img_gray)
        image = Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB))

        if self.transform:
            image = self.transform(image)
        return image, label, img_path


def get_transforms(img_size: int = 384):
    """
    Returns high-performance data augmentations for chest radiography at 384x384 resolution.
    """
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std = [0.229, 0.224, 0.225]

    train_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=8),
        transforms.RandomAffine(degrees=0, translate=(0.04, 0.04), scale=(0.95, 1.05)),
        transforms.ColorJitter(brightness=0.12, contrast=0.12),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std)
    ])

    val_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std)
    ])

    return train_transform, val_transform


def prepare_dataloaders(
    data_dir: str,
    dataset_type: str = "adult",
    batch_size: int = 16,
    val_ratio: float = 0.2,
    seed: int = 42,
    img_size: int = 384,
    num_workers: int = 0
) -> Tuple[DataLoader, DataLoader, Dict]:
    """
    Scans normal and pneumonia folders, performs stratified train/validation split,
    and returns DataLoader objects with data statistics.
    Supports dataset_type: 'adult', 'paediatric' (or 'pediatric'), 'combined'.
    """
    random.seed(seed)
    torch.manual_seed(seed)

    valid_exts = {".jpg", ".jpeg", ".png", ".bmp"}
    dtype = dataset_type.lower().strip()

    if dtype in ("paediatric", "pediatric"):
        # Pure Paediatric cohort
        norm_dir = os.path.join(data_dir, "paediatric", "normal")
        pneu_dir = os.path.join(data_dir, "paediatric", "pneumonia")
        norm_files = sorted(list(set([f for f in glob.glob(os.path.join(norm_dir, "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))
        pneu_files = sorted(list(set([f for f in glob.glob(os.path.join(pneu_dir, "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))
        random.shuffle(norm_files)
        random.shuffle(pneu_files)

        n_val_norm = int(len(norm_files) * val_ratio)
        n_val_pneu = int(len(pneu_files) * val_ratio)
        val_samples = [(p, 0) for p in norm_files[:n_val_norm]] + [(p, 1) for p in pneu_files[:n_val_pneu]]
        train_samples = [(p, 0) for p in norm_files[n_val_norm:]] + [(p, 1) for p in pneu_files[n_val_pneu:]]
        total_norm_count = len(norm_files)
        total_pneu_count = len(pneu_files)
    elif dtype in ("adult",):
        # Pure Adult cohort
        norm_dir = os.path.join(data_dir, "normal")
        pneu_dir = os.path.join(data_dir, "pneumonia")
        norm_files = sorted(list(set([f for f in glob.glob(os.path.join(norm_dir, "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))
        pneu_files = sorted(list(set([f for f in glob.glob(os.path.join(pneu_dir, "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))
        random.shuffle(norm_files)
        random.shuffle(pneu_files)

        n_val_norm = int(len(norm_files) * val_ratio)
        n_val_pneu = int(len(pneu_files) * val_ratio)
        val_samples = [(p, 0) for p in norm_files[:n_val_norm]] + [(p, 1) for p in pneu_files[:n_val_pneu]]
        train_samples = [(p, 0) for p in norm_files[n_val_norm:]] + [(p, 1) for p in pneu_files[n_val_pneu:]]
        total_norm_count = len(norm_files)
        total_pneu_count = len(pneu_files)
    else:
        # Default & Combined: Balanced Adult + Paediatric Cohort
        # Subgroup 1: Adult
        adult_norm = sorted(list(set([f for f in glob.glob(os.path.join(data_dir, "normal", "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))
        adult_pneu_dir = os.path.join(data_dir, "pneumonia")
        adult_pneu = sorted(list(set([f for f in glob.glob(os.path.join(adult_pneu_dir, "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))

        # Subgroup 2: Paediatric
        paed_norm = sorted(list(set([f for f in glob.glob(os.path.join(data_dir, "paediatric", "normal", "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))
        paed_pneu_dir = os.path.join(data_dir, "paediatric", "pneumonia")
        paed_pneu = sorted(list(set([f for f in glob.glob(os.path.join(paed_pneu_dir, "*.*")) if os.path.splitext(f)[1].lower() in valid_exts])))

        random.shuffle(adult_norm)
        random.shuffle(adult_pneu)
        random.shuffle(paed_norm)
        random.shuffle(paed_pneu)

        # Proportional stratified split across both adult and paediatric subgroups
        n_val_an = int(len(adult_norm) * val_ratio)
        n_val_ap = int(len(adult_pneu) * val_ratio)
        n_val_pn = int(len(paed_norm) * val_ratio)
        n_val_pp = int(len(paed_pneu) * val_ratio)

        val_samples = (
            [(p, 0) for p in adult_norm[:n_val_an]] +
            [(p, 0) for p in paed_norm[:n_val_pn]] +
            [(p, 1) for p in adult_pneu[:n_val_ap]] +
            [(p, 1) for p in paed_pneu[:n_val_pp]]
        )
        train_samples = (
            [(p, 0) for p in adult_norm[n_val_an:]] +
            [(p, 0) for p in paed_norm[n_val_pn:]] +
            [(p, 1) for p in adult_pneu[n_val_ap:]] +
            [(p, 1) for p in paed_pneu[n_val_pp:]]
        )
        total_norm_count = len(adult_norm) + len(paed_norm)
        total_pneu_count = len(adult_pneu) + len(paed_pneu)

    random.shuffle(train_samples)
    random.shuffle(val_samples)

    train_transform, val_transform = get_transforms(img_size=img_size)

    train_dataset = ChestXRayDataset(train_samples, transform=train_transform)
    val_dataset = ChestXRayDataset(val_samples, transform=val_transform)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available()
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available()
    )

    stats = {
        "total_images": total_norm_count + total_pneu_count,
        "normal_images": total_norm_count,
        "pneumonia_images": total_pneu_count,
        "train_count": len(train_samples),
        "val_count": len(val_samples),
        "batch_size": batch_size,
        "classes": ChestXRayDataset.CLASS_NAMES
    }

    return train_loader, val_loader, stats
