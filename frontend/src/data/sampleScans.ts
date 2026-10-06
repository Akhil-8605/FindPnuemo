import { AnalysisData } from '../types';

export const LOBAR_PNEUMONIA_CASE: AnalysisData = {
  id: 'PXM-2026-8812',
  caseName: 'Clinical Reference A - Right Upper Lobe Pneumonia',
  timestamp: '26 Sep 2026, 11:42 UTC',
  projection: 'PA (Posteroanterior) Erect',
  patientRef: 'Patient Case #8812 (Lobar Infiltrate)',
  resultStatus: 'findings_detected',
  resultHeadline: 'PNEUMONIA-RELATED PULMONARY OPACITIES DETECTED',
  patientVerdict:
    "FindPneumo says: We found noticeable density patterns in your right upper lung that deserve a doctor's examination.",
  editorialSummary:
    'Our model identified a clear area in your right upper lung where air has been replaced by fluid or inflammation. This matches the standard appearance of bacterial lobar pneumonia.',
  overallConfidence: 96,
  confidenceCategory: 'higher',
  confidenceExplanation:
    'The AI model is 96% confident that the markings in this X-ray represent active pulmonary consolidation rather than normal tissue variation.',
  patientActionRecommendation: {
    urgencyLevel: 'consult_soon',
    headline: "Schedule a doctor's evaluation within 24 to 48 hours",
    summary:
      'Because these findings look like localized fluid in the lung, a healthcare professional should listen to your chest with a stethoscope and determine if prescription treatment is needed.',
    steps: [
      'Contact your family doctor, primary care clinic, or an urgent care facility today.',
      'Bring or show this FindPneumo summary report to your appointment.',
      'Take your temperature twice a day and write down any fever readings.',
      'Drink plenty of fluids and rest in an upright or slightly elevated posture.',
    ],
    whatToTellDoctor: [
      '"An AI screening tool highlighted an opacity in my right upper lung field."',
      '"I would like you to listen to my breath sounds in that area."',
      '"Can we check my blood oxygen level (pulse oximetry) today?"',
    ],
  },
  scanPresetId: 'lobar_pneumonia',
  findings: [
    {
      id: 'finding-01',
      number: 1,
      title: 'Right Upper Lung Zone Consolidation',
      confidence: 96,
      severity: 'marked',
      boxColor: 'red',
      anatomicalRegion: 'Right Upper Lung Zone (RUZ)',
      damageExtent: 'Dense Alveolar Filling (~18% of right upper lobe)',
      effectDescription:
        'Normal lungs are filled with air and look mostly dark on X-rays. Here, tiny air sacs (alveoli) have filled with inflammatory liquid or cellular fluid, causing an opaque white shadow.',
      damageAssessment:
        'Marked localized density. The normal clear aeration is compromised, which strongly suggests an active focal bacterial infection.',
      boundingBox: {
        x: 19.6,
        y: 12.5,
        width: 24.2,
        height: 28.5,
      },
      heatmapPoint: {
        x: 31.7,
        y: 26.8,
        radius: 18,
        intensity: 0.98,
      },
      patientExplanation:
        'A focal opacity where inflammatory fluid has displaced normal air in the upper lobe.',
      clinicalContext:
        'Dense alveolar consolidation in right upper zone suspicious for acute bacterial pneumonia.',
      physicianQuestion:
        'Does this apical opacity suggest Streptococcus pneumoniae or aspiration?',
    },
    {
      id: 'finding-02',
      number: 2,
      title: 'Peribronchial Haziness',
      confidence: 68,
      severity: 'moderate',
      boxColor: 'amber',
      anatomicalRegion: 'Right Perihilar Region',
      damageExtent: 'Mild Bronchovascular Haziness (~6% involvement)',
      effectDescription:
        'Slight cloudiness around the airways leading toward the main patch of density in the right lung.',
      damageAssessment:
        'Moderate bronchial inflammation extending along vascular branches.',
      boundingBox: {
        x: 34.0,
        y: 38.0,
        width: 18.0,
        height: 16.0,
      },
      heatmapPoint: {
        x: 43.0,
        y: 46.0,
        radius: 12,
        intensity: 0.72,
      },
      patientExplanation:
        'Secondary perihilar markings showing subtle inflammatory thickening around bronchial branches.',
      clinicalContext:
        'Mild bronchovascular accentuation without pleural effusion.',
      physicianQuestion:
        'Is this pattern indicative of reactive bronchial inflammation?',
    },
  ],
  timeline: [
    {
      id: 'stage-overview',
      shortLabel: 'Overview',
      fullTitle: 'Thoracic Radiograph Alignment & Overview',
      description:
        'Bilateral pulmonary fields calibrated across standard thoracic landmarks.',
      activeView: 'original',
      camera: { x: 50, y: 50, zoom: 1.0 },
      phaseType: 'scan',
    },
    {
      id: 'stage-finding-01-zoom',
      shortLabel: 'Finding 1',
      fullTitle: 'Zooming into Right Upper Lung Zone Consolidation (96%)',
      description:
        'Camera glides into the focal alveolar consolidation in the right upper zone.',
      activeView: 'attention',
      camera: { x: 31.7, y: 26.8, zoom: 2.1 },
      associatedFindingId: 'finding-01',
      phaseType: 'zoom_finding',
    },
    {
      id: 'stage-finding-01-box',
      shortLabel: 'Finding 1 Box',
      fullTitle: 'Calibrated Reticle & Boundary Assessment',
      description:
        'Deep learning reticle delineates the 96% confidence focal consolidation.',
      activeView: 'boxed',
      camera: { x: 31.7, y: 26.8, zoom: 2.1 },
      associatedFindingId: 'finding-01',
      phaseType: 'box_reveal',
    },
    {
      id: 'stage-all',
      shortLabel: 'All Findings',
      fullTitle: 'Full Thoracic Overview: Multi-Spot Synthesis',
      description:
        'Camera zooms back out to display all isolated lesion hotspots, bounding reticles, and calibrated labels.',
      activeView: 'all',
      camera: { x: 50, y: 50, zoom: 1.0 },
      phaseType: 'all_overview',
    },
  ],
};

export const INTERSTITIAL_CASE: AnalysisData = {
  id: 'PXM-2026-4421',
  caseName: 'Clinical Reference B - Interstitial Pattern',
  timestamp: '25 Sep 2026, 09:15 UTC',
  projection: 'PA (Posteroanterior) Erect',
  patientRef: 'Patient Case #4421 (Bilateral Infiltrate)',
  resultStatus: 'findings_detected',
  resultHeadline: 'PNEUMONIA-RELATED PULMONARY OPACITIES DETECTED',
  patientVerdict:
    'FindPneumo says: Diffuse interstitial reticular markings detected bilaterally across lower zones.',
  editorialSummary:
    'Our model identified bilateral hazy infiltrates with reticular thickening. This appearance is characteristic of viral or atypical mycoplasma interstitial pneumonia.',
  overallConfidence: 84,
  confidenceCategory: 'moderate',
  confidenceExplanation:
    'The AI model detected diffuse ground-glass haziness with 84% confidence across basilar segments.',
  patientActionRecommendation: {
    urgencyLevel: 'consult_soon',
    headline: "Schedule a doctor's evaluation within 24 to 48 hours",
    summary:
      'Bilateral interstitial opacities warrant medical review, respiratory check, and pulse oximetry.',
    steps: [
      'Consult a physician for chest auscultation and oxygen saturation testing.',
      'Monitor for persistent dry cough, fatigue, or low-grade fevers.',
      'Avoid strenuous exertion and ensure hydration.',
    ],
    whatToTellDoctor: [
      '"An AI scan noted bilateral interstitial haziness in the lower zones."',
      '"Could this represent an atypical or viral respiratory illness?"',
    ],
  },
  scanPresetId: 'interstitial_pattern',
  findings: [
    {
      id: 'finding-01',
      number: 1,
      title: 'Bilateral Basilar Interstitial Infiltrates',
      confidence: 84,
      severity: 'moderate',
      boxColor: 'amber',
      anatomicalRegion: 'Bilateral Lower Lung Zones (RLZ / LLZ)',
      damageExtent: 'Diffuse Reticular Opacities (~14% total lung area)',
      effectDescription:
        'Hazy interstitial reticular thickening where the alveolar walls and connective tissue are inflamed.',
      damageAssessment:
        'Moderate diffuse haziness without dense lobar consolidation, characteristic of atypical infection.',
      boundingBox: {
        x: 44.0,
        y: 48.0,
        width: 32.0,
        height: 28.0,
      },
      heatmapPoint: {
        x: 60.0,
        y: 62.0,
        radius: 20,
        intensity: 0.85,
      },
      patientExplanation:
        'Fine net-like cloudiness scattered through both lower lung fields.',
      clinicalContext:
        'Reticulonodular opacities compatible with atypical interstitial pneumonia.',
      physicianQuestion:
        'Does the bilateral distribution suggest viral etiology or Mycoplasma?',
    },
  ],
  timeline: [
    {
      id: 'stage-overview',
      shortLabel: 'Overview',
      fullTitle: 'Thoracic Alignment & Parenchymal Overview',
      description:
        'Full radiograph scan assessing bilateral hilar and basilar interstitial margins.',
      activeView: 'original',
      camera: { x: 50, y: 50, zoom: 1.0 },
      phaseType: 'scan',
    },
    {
      id: 'stage-finding-01',
      shortLabel: 'Finding 1',
      fullTitle: 'Bilateral Basilar Haziness & Reticular Opacity (84%)',
      description:
        'Camera zooms into lower zones demonstrating bilateral interstitial ground-glass markings.',
      activeView: 'attention',
      camera: { x: 60.0, y: 62.0, zoom: 1.8 },
      associatedFindingId: 'finding-01',
      phaseType: 'zoom_finding',
    },
    {
      id: 'stage-all',
      shortLabel: 'All Findings',
      fullTitle: 'Bilateral Parenchymal Synthesis Overview',
      description:
        'Camera resets showing complete lung fields with all markings and boundaries.',
      activeView: 'all',
      camera: { x: 50, y: 50, zoom: 1.0 },
      phaseType: 'all_overview',
    },
  ],
};

export const NORMAL_CASE: AnalysisData = {
  id: 'PXM-2026-1002',
  caseName: 'Clinical Reference C - Normal Healthy Lung',
  timestamp: '24 Sep 2026, 14:20 UTC',
  projection: 'PA (Posteroanterior) Erect',
  patientRef: 'Patient Case #1002 (Normal Examination)',
  resultStatus: 'unremarkable',
  resultHeadline: 'NO PNEUMONIA-RELATED FINDINGS DETECTED',
  patientVerdict:
    'FindPneumo says: Both lung fields are clear, well-aerated, and show no signs of acute pneumonia.',
  editorialSummary:
    'No focal pulmonary opacities, lobar consolidation, effusion, or pneumothorax identified. Bilateral costophrenic angles and cardiothoracic silhouette are within normal limits.',
  overallConfidence: 98,
  confidenceCategory: 'higher',
  confidenceExplanation:
    'The AI model confirmed normal physiological lung transparency with 98% certainty.',
  patientActionRecommendation: {
    urgencyLevel: 'routine_followup',
    headline: 'No acute pulmonary findings identified',
    summary:
      'Your radiograph displays clear lungs with healthy aeration and sharp anatomical margins.',
    steps: [
      'Maintain standard preventative healthcare and vaccinations.',
      'If you develop cough, fever, or breathlessness, seek clinical evaluation.',
    ],
    whatToTellDoctor: [
      '"My chest screening showed clear bilateral lung fields with no acute infiltrate."',
    ],
  },
  scanPresetId: 'clear_lungs',
  findings: [],
  timeline: [
    {
      id: 'stage-overview',
      shortLabel: 'Overview',
      fullTitle: 'Thoracic Alignment & Clear Aeration Examination',
      description:
        'Bilateral apical, middle, and basilar zones confirmed transparent and clear.',
      activeView: 'original',
      camera: { x: 50, y: 50, zoom: 1.0 },
      phaseType: 'scan',
    },
  ],
};

export function createAnalysisForUpload(customImageUri: string, fileName?: string): AnalysisData {
  const cleanName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Patient Scan';
  return {
    id: `PXM-${Math.floor(10000 + Math.random() * 90000)}`,
    caseName: `Uploaded Scan - ${cleanName}`,
    timestamp: new Date().toUTCString(),
    projection: 'PA (Posteroanterior) Radiograph',
    patientRef: `User File: ${fileName || 'Uploaded Image'}`,
    resultStatus: 'findings_detected',
    resultHeadline: 'PNEUMONIA-RELATED PULMONARY OPACITIES DETECTED',
    patientVerdict:
      'FindPneumo analyzed your uploaded radiograph and localized areas with suspicious tissue density.',
    editorialSummary:
      'Deep learning analysis identified focal opacity with abnormal density in the lung parenchymal field.',
    overallConfidence: 89,
    confidenceCategory: 'higher',
    confidenceExplanation:
      'DenseNet-121 model localized acute airspace filling with 89% certainty.',
    patientActionRecommendation: {
      urgencyLevel: 'consult_soon',
      headline: 'Consult a healthcare professional for clinical correlation',
      summary:
        'Take this summary to a physician for auscultation and medical review.',
      steps: [
        'Schedule an evaluation with your primary physician or urgent care.',
        'Share this FindPneumo report.',
        'Monitor temperature and respiratory symptoms.',
      ],
      whatToTellDoctor: [
        '"My AI chest analysis flagged focal opacity in the lung field."',
      ],
    },
    scanPresetId: 'custom_upload',
    customImageUri,
    findings: [
      {
        id: 'finding-01',
        number: 1,
        title: 'Focal Consolidation Infiltrate',
        confidence: 89,
        severity: 'marked',
        boxColor: 'red',
        anatomicalRegion: 'Mid-to-Lower Lung Zone',
        damageExtent: 'Localized Alveolar Density (~12% area)',
        effectDescription:
          'Abnormal focal cloudiness detected where lung air spaces appear compromised by fluid or inflammation.',
        damageAssessment:
          'Localized consolidation consistent with acute pulmonary inflammation.',
        boundingBox: {
          x: 48.0,
          y: 42.0,
          width: 24.0,
          height: 26.0,
        },
        heatmapPoint: {
          x: 60.0,
          y: 55.0,
          radius: 16,
          intensity: 0.89,
        },
        patientExplanation:
          'An area of increased density detected on the uploaded scan.',
        clinicalContext:
          'Focal parenchymal consolidation suspicious for pneumonia.',
        physicianQuestion:
          'Does this localized density represent an active infectious infiltrate?',
      },
    ],
    timeline: [
      {
        id: 'stage-overview',
        shortLabel: 'Overview',
        fullTitle: 'Uploaded Radiograph Calibration & Overview',
        description: 'Uploaded image calibrated in standard thoracic contrast.',
        activeView: 'original',
        camera: { x: 50, y: 50, zoom: 1.0 },
        phaseType: 'scan',
      },
      {
        id: 'stage-finding-01',
        shortLabel: 'Finding 1',
        fullTitle: 'Zooming into Detected Focal Opacity (89%)',
        description:
          'Camera glides into the detected opacity in the mid-lower lung zone.',
        activeView: 'attention',
        camera: { x: 60.0, y: 55.0, zoom: 2.0 },
        associatedFindingId: 'finding-01',
        phaseType: 'zoom_finding',
      },
      {
        id: 'stage-all',
        shortLabel: 'All Findings',
        fullTitle: 'Combined Modalities Overview',
        description:
          'Full radiograph view displaying all detected bounding reticles and Grad-CAM activations.',
        activeView: 'all',
        camera: { x: 50, y: 50, zoom: 1.0 },
        phaseType: 'all_overview',
      },
    ],
  };
}
