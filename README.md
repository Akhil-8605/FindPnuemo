# FindPneumo - AI-assisted chest X-ray screening

> powered by **CheXNet DenseNet-121** and **Grad-CAM multi-spot lesion localization**.


## Quick Start

### 1-Click Launch (Windows)
Double-click `launch.bat` in the project root. It will check dependencies, start both backend and frontend, and open your browser automatically.

```cmd
launch.bat
```

### Manual Setup

```bash
# 1. Start Deep Learning Backend (Port 8000)
cd model
pip install -r requirements.txt
python server.py --port 8000

# 2. Start Frontend Web App (Port 3000)
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## How It Works

```
Radiograph (Upload / DICOM)
   │
   ▼
[1] OpenCV Preprocessing   ──► Telea inpainting (strips text) + CLAHE contrast normalization
   │
   ▼
[2] DenseNet-121 (CheXNet) ──► 384×384 input + Global Average Pooling (GAP)
   │
   ▼
[3] Grad-CAM Localization ──► Denseblock4 gradients + bone edge suppression + multi-spot reticles
   │
   ▼
[4] Clinical UI & Export   ──► Cinematic video player + zone classification + A4 PDF report
```

---

## Project Structure

```
FindPneumo/
├── launch.bat             # 1-click master launcher (Backend + Frontend)
├── README.md              # Project documentation
│
├── frontend/              # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── views/         # LandingView, ResultsView, XrayInspectionView, ModelHealthView, ApiDocsView
│   │   ├── components/    # XrayCanvas, FindingCard, TeamSection, PrintableReportModal, etc.
│   │   ├── utils/         # apiClient.ts, pdfExport.ts
│   │   └── data/          # sampleScans.ts (validated clinical presets)
│   └── package.json
│
└── model/                 # FastAPI + PyTorch DenseNet-121 Backend
    ├── api/               # main.py (REST routes), schemas.py (Pydantic models)
    ├── src/               # model.py, gradcam.py, inference.py, dataset.py, train.py
    ├── weights/           # densenet121_pneumonia_best.pth (pre-trained checkpoint)
    ├── data/              # Clean clinical dataset (normal, pneumonia, holdout test)
    ├── server.py          # Uvicorn entrypoint (Port 8000)
    └── requirements.txt
```

---

## API Snapshot

### Predict Endpoint (`POST /predict`)

```bash
curl -X POST "http://localhost:8000/predict" \
  -F "file=@chest_xray.jpeg"
```

**Response:**
```json
{
  "status": "success",
  "prediction": "Pneumonia",
  "is_pneumonia": true,
  "confidence_percentage": 97.99,
  "affected_regions_count": 2,
  "affected_regions": [
    {
      "spot_id": 1,
      "normalized": { "x1": 0.06, "y1": 0.06, "x2": 0.18, "y2": 0.19 },
      "peak_confidence": 0.95,
      "severity": "High",
      "anatomical_zone": "Right Upper Zone (RUZ)"
    }
  ],
  "visualizations": {
    "heatmap_base64": "data:image/png;base64,...",
    "overlay_base64": "data:image/jpeg;base64,..."
  }
}
```

---

## Team

Created by **Team LowIQBots**:
- **Akhilesh** 
- **Kshitija** 
- **Gouri** 
- **Shruti**

---

## Disclaimer

*FindPneumo is an AI research prototype built for educational and demonstration purposes. It is not an FDA-cleared diagnostic device.*
