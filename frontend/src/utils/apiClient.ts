import { AnalysisData, ScanPresetId } from '../types';

/**
 * Returns the configured backend API base URL.
 * Defaults to http://localhost:8000 as configured in .env.
 */
export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env && process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BASE_URL) {
    return (import.meta as any).env.VITE_BASE_URL;
  }
  return 'http://localhost:8000';
}

/**
 * Analyzes a Chest X-Ray using the live DenseNet-121 Deep Learning model.
 * Accepts either a File object from user upload or a base64 Data URI.
 * Returns the 100% dynamic, truthful AnalysisData synthesized directly by the model.
 */
export async function analyzeChestXRay(
  input: File | string,
  fileName?: string
): Promise<AnalysisData> {
  const baseUrl = getApiBaseUrl();

  try {
    let response: Response;

    if (input instanceof File) {
      const formData = new FormData();
      formData.append('file', input, input.name);
      formData.append('cam_threshold', '0.35');
      formData.append('min_area_ratio', '0.008');

      response = await fetch(`${baseUrl}/predict`, {
        method: 'POST',
        body: formData,
      });
    } else {
      // Base64 Data URI
      response = await fetch(`${baseUrl}/predict/base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: input,
          file_name: fileName || 'uploaded_scan.jpeg',
          cam_threshold: 0.35,
          min_area_ratio: 0.008,
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Inference engine error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    if (!data.analysis) {
      throw new Error('DL model returned response without clinical analysis synthesis.');
    }

    const analysis: AnalysisData = data.analysis;
    return analysis;
  } catch (error) {
    console.error('[FindPneumo DL Client] API Inference Failed:', error);
    throw error;
  }
}

/**
 * Fetches authentic Deep Learning prediction and Grad-CAM for one of the verified sample cases.
 */
export async function loadPresetAnalysis(presetId: ScanPresetId): Promise<AnalysisData> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/samples/preset/${presetId}`);
    if (!response.ok) {
      throw new Error(`Preset load failed (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    if (!data.analysis) {
      throw new Error('Preset analysis missing from API response.');
    }

    const analysis: AnalysisData = data.analysis;
    analysis.scanPresetId = presetId;
    return analysis;
  } catch (error) {
    console.error(`[FindPneumo DL Client] Failed loading preset '${presetId}':`, error);
    throw error;
  }
}
