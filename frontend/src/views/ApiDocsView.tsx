import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Server,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

interface ApiDocsViewProps {
  onNavigate: (route: '/' | '/results' | '/results/x-ray-inspection' | '/lowiqbots/health' | '/lowiqbots/api-docs') => void;
}

export const ApiDocsView: React.FC<ApiDocsViewProps> = ({ onNavigate }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('predict_file');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'python' | 'ts'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const endpoints = [
    {
      id: 'predict_file',
      method: 'POST',
      path: '/predict',
      title: 'Analyze Radiograph (Multipart File)',
      desc: 'Uploads a chest radiograph image (JPEG, PNG). Runs DenseNet-121 inference, extracts Grad-CAM++ topological heatmap, detects affected lesion bounding boxes, and generates structured clinical synthesis.',
      contentType: 'multipart/form-data',
      params: [
        { name: 'file', type: 'binary file', req: true, default: 'Required', desc: 'Chest X-Ray image file (JPEG, PNG, DICOM converted)' },
        { name: 'cam_threshold', type: 'float', req: false, default: '0.35', desc: 'Sensitivity cutoff for Grad-CAM activation segmentation (0.1 - 0.9)' },
        { name: 'min_area_ratio', type: 'float', req: false, default: '0.008', desc: 'Minimum area threshold filter for lesion bounding boxes' },
      ],
      curl: `curl -X POST "http://localhost:8000/predict" \\
  -F "file=@chest_xray.jpeg;type=image/jpeg" \\
  -F "cam_threshold=0.35" \\
  -F "min_area_ratio=0.008"`,
      python: `import requests

url = "http://localhost:8000/predict"
files = {"file": open("chest_xray.jpeg", "rb")}
data = {"cam_threshold": 0.35, "min_area_ratio": 0.008}

response = requests.post(url, files=files, data=data)
result = response.json()
print("Diagnosis:", result["predicted_class"])
print("Certainty:", result["overall_confidence"], "%")
print("Detected Lesions:", len(result["findings"]))`,
      ts: `const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("cam_threshold", "0.35");
formData.append("min_area_ratio", "0.008");

const res = await fetch("http://localhost:8000/predict", {
  method: "POST",
  body: formData,
});

const data = await res.json();
console.log(data.result_headline, data.overall_confidence);`,
      response: `{
  "id": "PXM-2026-60925",
  "predicted_class": "pneumonia",
  "overall_confidence": 97,
  "confidence_category": "higher",
  "result_status": "Pneumonia Detected",
  "result_headline": "PNEUMONIA-RELATED PULMONARY OPACITIES DETECTED",
  "editorial_summary": "FindPneumo identified abnormal consolidation where physiological lung aeration has been replaced by inflammatory exudate.",
  "findings": [
    {
      "id": "spot_1",
      "number": 1,
      "title": "Right Upper Lung Zone (RUZ) Consolidation",
      "anatomicalRegion": "Right Upper Lung Zone (RUZ)",
      "confidence": 96,
      "damageExtent": "4% Total Lung Area",
      "effectDescription": "High-density focal opacity identified where alveolar spaces are compromised by inflammatory exudate.",
      "damageAssessment": "Localized reversible airspace filling.",
      "physicianQuestion": "Does this apical opacity suggest Streptococcus pneumoniae or aspiration?",
      "boundingBox": { "x": 19.6, "y": 12.5, "width": 24.2, "height": 28.5 },
      "heatmapPoint": { "x": 31.7, "y": 26.8, "radius": 14.2, "intensity": 0.98 }
    }
  ],
  "gradcam_image_base64": "data:image/png;base64,iVBORw0KGgo...",
  "timeline": [
    {
      "id": "stage-overview",
      "shortLabel": "Overview",
      "fullTitle": "Thoracic Radiograph Alignment & Overview",
      "activeView": "original",
      "phaseType": "scan"
    }
  ]
}`,
    },
    {
      id: 'predict_b64',
      method: 'POST',
      path: '/predict/base64',
      title: 'Analyze Radiograph (Base64 JSON)',
      desc: 'Submits a Base64-encoded image string in a JSON payload. Useful for client-side canvas snapshots, mobile clients, and embedded web apps.',
      contentType: 'application/json',
      params: [
        { name: 'image_base64', type: 'string', req: true, default: 'Required', desc: 'Base64 data string (with or without data:image/jpeg;base64 header)' },
        { name: 'file_name', type: 'string', req: false, default: 'upload.jpg', desc: 'Original filename for metadata tracing' },
        { name: 'cam_threshold', type: 'float', req: false, default: '0.35', desc: 'Grad-CAM lesion sensitivity cutoff' },
      ],
      curl: `curl -X POST "http://localhost:8000/predict/base64" \\
  -H "Content-Type: application/json" \\
  -d '{"image_base64": "data:image/jpeg;base64,/9j/4AAQSkZ...", "file_name": "patient_scan.jpeg"}'`,
      python: `import requests, base64

with open("chest_xray.jpeg", "rb") as f:
    b64_str = base64.b64encode(f.read()).decode("utf-8")

payload = {"image_base64": b64_str, "file_name": "scan.jpg"}
response = requests.post("http://localhost:8000/predict/base64", json=payload)
print(response.json())`,
      ts: `const payload = {
  image_base64: base64DataUrl,
  file_name: "scan.jpg",
  cam_threshold: 0.35
};

const res = await fetch("http://localhost:8000/predict/base64", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});

const data = await res.json();`,
      response: `{
  "id": "PXM-2026-60925",
  "predicted_class": "pneumonia",
  "overall_confidence": 97,
  "result_status": "Pneumonia Detected",
  "findings": [...]
}`,
    },
    {
      id: 'health',
      method: 'GET',
      path: '/health',
      title: 'Model QA & System Health',
      desc: 'Returns hardware device status, CUDA acceleration, PyTorch runtime version, holdout test metrics, confusion matrix, and training convergence statistics.',
      contentType: 'application/json',
      params: [],
      curl: `curl -X GET "http://localhost:8000/health"`,
      python: `import requests

res = requests.get("http://localhost:8000/health")
health = res.json()
print("Device:", health["device"])
print("Accuracy:", health["holdout_test_accuracy"], "%")
print("Validation ROC-AUC:", health["benchmark_metrics"]["validation"]["roc_auc"])`,
      ts: `const res = await fetch("http://localhost:8000/health");
const health = await res.json();
console.log(health.status, health.device, health.holdout_test_accuracy);`,
      response: `{
  "status": "healthy",
  "model_loaded": true,
  "service": "FindPneumo AI Detection API",
  "architecture": "DenseNet-121 Transfer Learning",
  "device": "cuda",
  "holdout_test_accuracy": 94.0,
  "benchmark_metrics": {
    "validation": { "accuracy": 85.0, "roc_auc": 92.0, "precision": 88.89, "recall": 80.0 },
    "holdout": { "accuracy": 94.0, "roc_auc": 96.8, "precision": 92.3, "recall": 96.0 }
  }
}`,
    },
    {
      id: 'presets',
      method: 'GET',
      path: '/samples/preset/{preset_id}',
      title: 'Load Preset Case Study',
      desc: 'Returns deep learning analysis for clinical reference cases: lobar_pneumonia, interstitial_pattern, or clear_lungs.',
      contentType: 'application/json',
      params: [
        { name: 'preset_id', type: 'string path', req: true, default: 'lobar_pneumonia', desc: 'Preset ID: lobar_pneumonia | interstitial_pattern | clear_lungs' }
      ],
      curl: `curl -X GET "http://localhost:8000/samples/preset/lobar_pneumonia"`,
      python: `import requests

res = requests.get("http://localhost:8000/samples/preset/lobar_pneumonia")
preset = res.json()
print("Preset Diagnosis:", preset["result_status"])`,
      ts: `const res = await fetch("http://localhost:8000/samples/preset/lobar_pneumonia");
const preset = await res.json();`,
      response: `{
  "id": "CASE-LOBAR-01",
  "predicted_class": "pneumonia",
  "overall_confidence": 97,
  "result_status": "Pneumonia Detected",
  "findings": [...]
}`,
    },
    {
      id: 'samples',
      method: 'GET',
      path: '/samples',
      title: 'List Sample Radiographs',
      desc: 'Retrieves an array of all available reference cases with metadata, thumbnail filenames, and clinical ground truth summaries.',
      contentType: 'application/json',
      params: [],
      curl: `curl -X GET "http://localhost:8000/samples"`,
      python: `import requests

res = requests.get("http://localhost:8000/samples")
samples = res.json()
print("Available samples:", len(samples))`,
      ts: `const res = await fetch("http://localhost:8000/samples");
const samples = await res.json();
console.log(samples);`,
      response: `[
  {
    "id": "lobar_pneumonia",
    "name": "Right Upper Lobe Acute Consolidation",
    "category": "Pneumonia",
    "image_url": "/samples/lobar.jpeg"
  },
  {
    "id": "interstitial_pattern",
    "name": "Bilateral Interstitial Opacities",
    "category": "Pneumonia",
    "image_url": "/samples/interstitial.jpeg"
  },
  {
    "id": "clear_lungs",
    "name": "Normal Adult Clear Radiograph",
    "category": "Normal",
    "image_url": "/samples/normal.jpeg"
  }
]`,
    },
  ];

  const currentEp = endpoints.find((e) => e.id === selectedEndpoint) || endpoints[0];

  return (
    <div className="min-h-screen bg-[#F8F8F5] text-black pb-24">
      {/* 1. HERO HEADER */}
      <section className="bg-white border-b-2 border-black pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-3 mb-6 text-xs font-mono">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-black text-white bg-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                LOWIQBOTS
              </span>
              <span className="text-[#71717A]">/</span>
              <span className="font-bold text-[#0E7490]">API DOCS</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/lowiqbots/health')}
                className="font-bold text-black hover:text-[#0E7490] flex items-center gap-1.5 transition-colors uppercase cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#0E7490]" />
                <span>MODEL HEALTH</span>
              </button>
              <span className="text-[#D4D4D8]">|</span>
              <button
                onClick={() => onNavigate('/')}
                className="font-bold text-black hover:underline flex items-center gap-1.5 uppercase cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO SCREENING</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#0E7490] mb-2">
                <Code2 className="w-4 h-4 text-[#0E7490]" />
                <span>HTTP RESTFUL INFERENCE INTERFACE</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
                FindPneumo API Documentation
              </h1>
              <p className="text-sm sm:text-base text-[#52525B] font-medium max-w-2xl mt-1">
                Full documentation for all REST endpoints: radiograph prediction, Grad-CAM generation, health metrics, and preset samples.
              </p>
            </div>

            
          </div>
        </div>
      </section>

      {/* 2. MAIN API EXPLORER */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Endpoint Selector List (4 cols) */}
          <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-3">
            <span className="text-xs font-mono font-bold text-[#52525B] uppercase tracking-wider block mb-2">
              ALL ENDPOINTS ({endpoints.length})
            </span>

            <div className="space-y-2">
              {endpoints.map((ep) => {
                const isSelected = ep.id === selectedEndpoint;
                return (
                  <button
                    key={ep.id}
                    onClick={() => setSelectedEndpoint(ep.id)}
                    className={`w-full p-3 rounded-xl border-2 border-black text-left transition-all cursor-pointer flex flex-col gap-1.5 ${isSelected
                      ? 'bg-black text-white shadow-[3px_3px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-[#F8F8F5] text-black hover:bg-white shadow-[1px_1px_0px_#000]'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${ep.method === 'POST'
                          ? isSelected
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : isSelected
                            ? 'bg-cyan-400 text-black border-cyan-300'
                            : 'bg-cyan-100 text-cyan-900 border-cyan-400'
                          }`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-xs font-mono font-bold">{ep.path}</code>
                    </div>
                    <span className="text-xs font-bold truncate">{ep.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Endpoint Detail & Code Sandbox (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-mono font-black px-2.5 py-1 rounded border-2 border-black ${currentEp.method === 'POST' ? 'bg-emerald-400 text-black' : 'bg-cyan-400 text-black'
                    }`}
                >
                  {currentEp.method}
                </span>
                <code className="text-base sm:text-lg font-mono font-black text-black">
                  {currentEp.path}
                </code>
              </div>
              <span className="text-xs font-mono text-[#52525B] font-bold">
                Content-Type: {currentEp.contentType}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-[#27272A] font-medium leading-relaxed">
              {currentEp.desc}
            </p>

            {/* Parameters Table */}
            {currentEp.params.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-[#52525B]">
                  REQUEST PARAMETERS
                </span>
                <div className="overflow-x-auto border-2 border-black rounded-xl">
                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="p-2.5">PARAMETER</th>
                        <th className="p-2.5">TYPE</th>
                        <th className="p-2.5">REQUIRED</th>
                        <th className="p-2.5">DEFAULT</th>
                        <th className="p-2.5">DESCRIPTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEp.params.map((p, i) => (
                        <tr key={i} className="border-t border-black/20 bg-white">
                          <td className="p-2.5 font-black text-black">{p.name}</td>
                          <td className="p-2.5 text-[#0E7490] font-bold">{p.type}</td>
                          <td className="p-2.5">
                            {p.req ? (
                              <span className="text-rose-600 font-bold">Yes</span>
                            ) : (
                              <span className="text-[#71717A]">Optional</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[#52525B]">{p.default}</td>
                          <td className="p-2.5 text-[#27272A]">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Code Snippets Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#52525B]">
                  CODE EXAMPLES
                </span>
                <div className="flex items-center gap-1 bg-[#F8F8F5] p-1 rounded-lg border border-black text-xs font-mono font-bold">
                  <button
                    onClick={() => setCodeLanguage('curl')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${codeLanguage === 'curl' ? 'bg-black text-white' : 'text-black'
                      }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setCodeLanguage('python')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${codeLanguage === 'python' ? 'bg-black text-white' : 'text-black'
                      }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setCodeLanguage('ts')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${codeLanguage === 'ts' ? 'bg-black text-white' : 'text-black'
                      }`}
                  >
                    TypeScript
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="bg-[#0D1017] text-white p-4 rounded-xl border-2 border-black relative font-mono text-xs overflow-x-auto shadow-[3px_3px_0px_#000]">
                <button
                  onClick={() =>
                    handleCopy(
                      `${currentEp.id}-${codeLanguage}`,
                      codeLanguage === 'curl'
                        ? currentEp.curl
                        : codeLanguage === 'python'
                          ? currentEp.python
                          : currentEp.ts
                    )
                  }
                  className="absolute top-3 right-3 px-2 py-1 rounded bg-white/10 hover:bg-white hover:text-black transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  {copiedKey === `${currentEp.id}-${codeLanguage}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
                <pre className="text-slate-200">
                  {codeLanguage === 'curl'
                    ? currentEp.curl
                    : codeLanguage === 'python'
                      ? currentEp.python
                      : currentEp.ts}
                </pre>
              </div>
            </div>

            {/* Example JSON Response */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#52525B]">
                  EXAMPLE 200 OK RESPONSE
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-400 rounded">
                  STATUS 200 OK
                </span>
              </div>
              <div className="bg-[#0D1017] text-cyan-300 p-4 rounded-xl border-2 border-black font-mono text-xs overflow-x-auto max-h-72 overflow-y-auto shadow-[3px_3px_0px_#000]">
                <pre>{currentEp.response}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HTTP STATUS CODES REFERENCE */}
      <section className="py-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
          <span className="text-xs font-mono font-bold uppercase text-[#0E7490]">
            STANDARD HTTP RESPONSE CODES
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-500">
              <strong className="text-emerald-900 block text-sm font-black">200 OK</strong>
              <span className="text-emerald-800 text-[11px]">Successful inference with Grad-CAM and coordinates.</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-500">
              <strong className="text-amber-900 block text-sm font-black">400 Bad Request</strong>
              <span className="text-amber-800 text-[11px]">Unreadable image file or corrupted base64 buffer.</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-500">
              <strong className="text-rose-900 block text-sm font-black">404 Not Found</strong>
              <span className="text-rose-800 text-[11px]">Requested preset case or sample image not found.</span>
            </div>
            <div className="p-3 bg-neutral-100 rounded-xl border border-black">
              <strong className="text-black block text-sm font-black">503 Unavailable</strong>
              <span className="text-[#52525B] text-[11px]">Inference engine initializing or checkpoint loading.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
