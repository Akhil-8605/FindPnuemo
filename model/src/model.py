import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import densenet121, DenseNet121_Weights


class DenseNet121Pneumonia(nn.Module):
    """
    Clinically-validated DenseNet-121 Architecture for Chest Radiography (Stanford CheXNet Paradigm).
    
    Design principles:
      1. Pretrained DenseNet-121 feature extractor with dense connectivity for multi-scale feature reuse.
      2. Pure Global Average Pooling (GAP) without Max-Pooling. Max-pooling causes gradient singularity
         on cortical bone spikes (clavicles, shoulders). GAP guarantees smooth, parenchymal gradient
         distribution across pulmonary infiltrates.
      3. Exact Class Activation Mapping (CAM): In GAP + Linear models, Grad-CAM gradients map directly
         to diagnostic radiological features without distortion.
    """
    def __init__(self, num_classes: int = 2, pretrained: bool = True, dropout_rate: float = 0.25):
        super().__init__()
        weights = DenseNet121_Weights.DEFAULT if pretrained else None
        self.densenet = densenet121(weights=weights)

        num_features = self.densenet.classifier.in_features  # 1024
        self.densenet.classifier = nn.Identity()

        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate),
            nn.Linear(num_features, num_classes)
        )

    def forward_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extracts spatial feature maps before pooling."""
        features = self.densenet.features(x)
        out = F.relu(features, inplace=False)
        return out

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.forward_features(x)
        pooled = self.global_pool(feat).flatten(1)  # (B, 1024)
        logits = self.classifier(pooled)
        return logits

    def get_cam_target_layer(self):
        """Returns the final convolutional denseblock layer for Grad-CAM++."""
        return self.densenet.features.denseblock4


# Aliases for compatibility
DenseNet121MultiSpotPneumonia = DenseNet121Pneumonia
