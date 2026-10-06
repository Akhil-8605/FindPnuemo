export interface BoundingBox {
  x: number; // percentage from left (0 - 100)
  y: number; // percentage from top (0 - 100)
  width: number; // percentage width (0 - 100)
  height: number; // percentage height (0 - 100)
}

export interface HeatmapPoint {
  x: number; // center percentage X
  y: number; // center percentage Y
  radius: number; // radius in percentage
  intensity: number; // 0.0 to 1.0
  color?: string;
}

export interface Finding {
  id: string;
  number: number;
  title: string;
  confidence: number; // 0 - 100
  severity: 'mild' | 'moderate' | 'marked';
  boxColor: 'red' | 'green' | 'white' | 'amber';
  anatomicalRegion: string;
  damageExtent: string; // e.g. "Localized Alveolar Filling (~15% of lower lobe)"
  effectDescription: string; // What is happening in plain English
  damageAssessment: string; // Assessment of tissue inflammation/airway restriction
  boundingBox: BoundingBox;
  heatmapPoint: HeatmapPoint;
  patientExplanation: string;
  clinicalContext: string;
  physicianQuestion: string;
}

export interface TimelineStage {
  id: string;
  shortLabel: string;
  fullTitle: string;
  description: string;
  activeView: 'original' | 'attention' | 'boxed' | 'all';
  camera: {
    x: number; // target center X (0 - 100)
    y: number; // target center Y (0 - 100)
    zoom: number; // 1.0 (full view) to 2.4 (close-up)
  };
  associatedFindingId?: string;
  phaseType?: 'scan' | 'zoom_finding' | 'heat_bloom' | 'box_reveal' | 'all_overview';
}

export type ScanPresetId = 'lobar_pneumonia' | 'interstitial_pattern' | 'clear_lungs';

export interface AnalysisData {
  id: string;
  caseName: string;
  timestamp: string;
  projection: string;
  patientRef: string;
  resultStatus: 'findings_detected' | 'unremarkable';
  resultHeadline: string;
  patientVerdict: string; // Direct patient statement: "FindPneumo says: We found patterns that warrant a doctor's review"
  editorialSummary: string;
  overallConfidence: number; // 0 - 100
  confidenceCategory: 'higher' | 'moderate' | 'lower';
  confidenceExplanation: string;
  patientActionRecommendation: {
    urgencyLevel: 'consult_soon' | 'routine_followup' | 'emergency_if_symptoms';
    headline: string;
    summary: string;
    steps: string[];
    whatToTellDoctor: string[];
  };
  findings: Finding[];
  timeline: TimelineStage[];
  customImageUri?: string;
  gradcamUri?: string;
  overlayUri?: string;
  scanPresetId: ScanPresetId | 'custom_upload';
}
