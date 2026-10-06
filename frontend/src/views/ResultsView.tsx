import React, { useState } from 'react';
import {
  Printer,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  FileText,
  AlertOctagon,
  Maximize2,
  ShieldCheck,
  ArrowRight,
  Zap,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { AnalysisData, Finding } from '../types';
import { XrayCanvas } from '../components/XrayCanvas';
import { RadialConfidenceGauge } from '../components/RadialConfidenceGauge';
import {
  ClinicalDocumentaryConsole,
  TourChaptersPanel,
  useClinicalTourPlayer,
} from '../components/InteractiveStoryteller';
import { FindingCard } from '../components/FindingCard';
import { PrintableReportModal } from '../components/PrintableReportModal';
import { downloadAnalysisPdf } from '../utils/pdfExport';

interface ResultsViewProps {
  analysis: AnalysisData;
  onStartNewScan: () => void;
  onNavigateToFullscreenInspection: () => void;
}

/**
 * Clean Aesthetic Brutalism highlighter renderer:
 * - If positive pneumonia: ONLY highlights "DETECTED" with vibrant rose brutalist badge
 * - If negative normal: ONLY highlights "NO" or "NOT DETECTED" with vibrant emerald brutalist badge
 * (Ensures "DETECTED" is never highlighted on clear scans where "NO" is present)
 */
function renderBrutalistHighlightedHeadline(headline: string, isPneumonia: boolean) {
  const pattern = isPneumonia ? /(DETECTED)/gi : /(\bNO\b|NOT DETECTED)/gi;
  const parts = headline.split(pattern);

  return (
    <span>
      {parts.map((part, index) => {
        const upper = part.toUpperCase();
        if (isPneumonia && upper === 'DETECTED') {
          return (
            <span
              key={index}
              className="relative inline-block px-3 py-0.5 mx-1.5 font-black text-white bg-rose-600 border-2 border-black shadow-[3px_3px_0px_#000] rounded-sm -rotate-1 align-baseline uppercase tracking-wide select-none"
            >
              {part}
            </span>
          );
        } else if (!isPneumonia && (upper === 'NO' || upper === 'NOT DETECTED')) {
          return (
            <span
              key={index}
              className="relative inline-block px-3 py-0.5 mx-1.5 font-black text-white bg-emerald-600 border-2 border-black shadow-[3px_3px_0px_#000] rounded-sm -rotate-1 align-baseline uppercase tracking-wide select-none"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  analysis,
  onStartNewScan,
  onNavigateToFullscreenInspection,
}) => {
  const tourPlayer = useClinicalTourPlayer(analysis, 'boxed');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isManualScanning, setIsManualScanning] = useState<boolean>(false);
  const [customZoom, setCustomZoom] = useState<number | null>(null);

  const handleTriggerScan = () => {
    setIsManualScanning(true);
    setTimeout(() => setIsManualScanning(false), 3200);
  };

  const currentStage = tourPlayer.currentStage;
  const camera = currentStage.camera;

  // Zoom control
  const effectiveZoom = customZoom !== null ? customZoom : camera.zoom;
  const activeCamera = { ...camera, zoom: effectiveZoom };

  const handleZoomStep = (delta: number) => {
    setCustomZoom((prev) => {
      const base = prev !== null ? prev : camera.zoom;
      return Math.min(3.0, Math.max(1.0, parseFloat((base + delta).toFixed(2))));
    });
  };

  const handleStageSelect = (index: number) => {
    setCustomZoom(null); // Reset manual zoom to glide with stage camera
    tourPlayer.handleStageSelect(index);
  };

  const handleSelectFinding = (findingId: string) => {
    setCustomZoom(null);
    const matchingStageIdx = analysis.timeline.findIndex(
      (s) => s.associatedFindingId === findingId
    );
    if (matchingStageIdx !== -1) {
      tourPlayer.handleStageSelect(matchingStageIdx);
    }
    document.getElementById('workstation-viewer')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadAnalysisPdf(analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const isHighConfidence = analysis.confidenceCategory === 'higher';
  const isModerateConfidence = analysis.confidenceCategory === 'moderate';

  return (
    <div className="min-h-screen bg-[#F8F8F5] pb-20 text-black">
      {/* 1. CLINICAL VERDICT HERO SECTION — Elevated Professional Dossier Presentation */}
      <section className="bg-white border-b-2 border-black pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Metadata Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-3 mb-6 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="font-black text-white bg-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                SCREENING REPORT
              </span>
              <span className="text-[#71717A]">/</span>
              <span className="font-bold text-black">{analysis.id}</span>
              <span className="text-[#71717A]">/</span>
              <span className="text-[#71717A]">{analysis.projection}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="font-bold text-black hover:text-[#0E7490] flex items-center gap-1.5 transition-colors uppercase cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#0E7490]" />
                <span>PRINT / VIEW REPORT</span>
              </button>
              <span className="text-[#D4D4D8]">|</span>
              <button
                onClick={onStartNewScan}
                className="font-bold text-black hover:underline flex items-center gap-1.5 uppercase cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>NEW SCAN</span>
              </button>
            </div>
          </div>

          {/* Clinical Verdict & Explanation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* Verdict Ribbon (High-Impact Medical Status Bar) */}
              <div
                className={`p-4 sm:p-5 rounded-xl border-l-4 transition-all ${isHighConfidence
                    ? 'border-l-rose-500 bg-rose-50/70 border border-rose-200/80 text-rose-950 shadow-xs'
                    : isModerateConfidence
                      ? 'border-l-amber-500 bg-amber-50/70 border border-amber-200/80 text-amber-950 shadow-xs'
                      : 'border-l-emerald-500 bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 shadow-xs'
                  }`}
              >
                <div className="flex items-center gap-2 font-mono text-[11px] font-black uppercase mb-1.5 tracking-wider">
                  {isHighConfidence ? (
                    <>
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-rose-800">
                        CLINICAL VERDICT · HIGH-CONFIDENCE PNEUMONIA FINDINGS DETECTED
                      </span>
                    </>
                  ) : isModerateConfidence ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-amber-800">
                        CLINICAL ADVISORY · MODERATE INTERSTITIAL PATTERNS ({analysis.overallConfidence}%)
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800">
                        NORMAL STUDY · CLEAR BILATERAL LUNG FIELDS ({analysis.overallConfidence}%)
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold leading-relaxed text-black/90">
                  {isHighConfidence
                    ? `FindPneumo identified clear alveolar consolidation matching pneumonia patterns with ${analysis.overallConfidence}% certainty. In-person clinical review by a physician is advised within 24 to 48 hours.`
                    : isModerateConfidence
                      ? `FindPneumo detected diffuse or interstitial haziness that could indicate early bronchitis, viral infection, or reactive inflammation.`
                      : `No focal airspace opacities, pleural fluid, or lobar consolidation detected. Both lung fields appear normally aerated.`}
                </p>
              </div>

              {/* Consultation Title & Headline with Realistic Notebook Highlighter */}
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#52525B] mb-2">
                  <Stethoscope className="w-4 h-4 text-[#0E7490]" />
                  <span>WHAT FINDPNEUMO SAYS ABOUT YOUR SCAN</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tight leading-tight uppercase">
                  {renderBrutalistHighlightedHeadline(
                    analysis.resultHeadline,
                    isHighConfidence || isModerateConfidence
                  )}
                </h1>
              </div>

              {/* Plain Language Summary (Refined Clinical Dossier Statement) */}
              <div className="relative pl-5 py-3.5 border-l-3 border-[#0E7490] bg-[#F8F8F5]/80 rounded-r-xl space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] font-black text-[#0E7490] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Clinical Summary Translation</span>
                </div>
                <p className="text-sm sm:text-base text-[#1E293B] leading-relaxed font-medium">
                  {analysis.editorialSummary}
                </p>
              </div>

              {/* Patient Safety Note (Refined Medical Footnote) */}
              <div className="flex items-start gap-2.5 text-xs text-[#52525B] pt-2 border-t border-black/10 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#0E7490] shrink-0 mt-0.5" />
                <p className="font-medium">
                  <strong className="text-black font-bold uppercase font-mono mr-1">
                    Patient Safety Advisory:
                  </strong>
                  FindPneumo highlights where lung tissue looks cloudier than expected. It is an assistive screening tool, not a final medical diagnosis. A doctor combines this scan with your clinical symptoms to decide on treatment.
                </p>
              </div>
            </div>

            {/* Right: Radial Confidence Score Gauge */}
            <div className="lg:col-span-4 w-full">
              <RadialConfidenceGauge
                targetScore={analysis.overallConfidence}
                status={analysis.resultStatus}
                category={analysis.confidenceCategory}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE WORKSTATION: MASTER VIEWPORT & CLINICAL DOCUMENTARY */}
      <section id="workstation-viewer" className="py-12 border-b-2 border-black bg-[#F8F8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#52525B] block mb-1 font-bold">
                DOCUMENTED CLINICAL WALKTHROUGH
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase">
                Interactive X-Ray Inspection Video
              </h2>
              <p className="text-xs sm:text-sm text-[#52525B] mt-0.5 font-medium">
                Watch the camera tour through each detected spot, view isolated Grad-CAM heatmaps, and inspect precision percentage boxes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={onNavigateToFullscreenInspection}
                className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-2 cursor-pointer uppercase"
              >
                <Maximize2 className="w-4 h-4 text-cyan-300" />
                <span>FULLSCREEN CINEMA</span>
              </button>

              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-2 cursor-pointer uppercase"
              >
                <Printer className="w-4 h-4 text-[#0E7490]" />
                <span>PRINT / VIEW REPORT</span>
              </button>
            </div>
          </div>

          {/* Master Workstation: Left Column (Viewport + Clinical Documentary) | Right Column (Tour Chapters + Dossier) */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): VIEWPORT on top, CLINICAL DOCUMENTARY directly at bottom */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* 1. Viewport Card */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] relative">
                {/* Viewport Header Toolbar */}
                <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-3 mb-4 gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2.5 font-bold text-black">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="tracking-wider">VIEWPORT: {currentStage.shortLabel.toUpperCase()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Scanwave trigger */}
                    {/* <button
                      onClick={handleTriggerScan}
                      disabled={isManualScanning || tourPlayer.isScanning}
                      className={`px-2.5 py-1 rounded-md border-2 border-black text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isManualScanning || tourPlayer.isScanning
                          ? 'bg-cyan-400 text-black shadow-[1px_1px_0px_#000]'
                          : 'bg-[#F8F8F5] text-black hover:bg-black hover:text-white shadow-[1px_1px_0px_#000]'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-cyan-500 fill-current" />
                      <span>{isManualScanning || tourPlayer.isScanning ? 'SCANNING...' : 'SCAN WAVE'}</span>
                    </button> */}

                    {/* Tour small buttons: Prev, Pause/Resume, Next */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setCustomZoom(null);
                          tourPlayer.handlePrev();
                        }}
                        title="Previous finding"
                        className="p-1 rounded hover:bg-black hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={tourPlayer.togglePlay}
                        title={tourPlayer.isPlaying ? "Pause tour" : "Resume tour"}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border border-black flex items-center gap-1 transition-all cursor-pointer ${tourPlayer.isPlaying
                            ? 'bg-amber-400 text-black'
                            : 'bg-emerald-400 text-black'
                          }`}
                      >
                        {tourPlayer.isPlaying ? (
                          <>
                            <Pause className="w-2.5 h-2.5 fill-current" />
                            <span className="hidden sm:inline">PAUSE</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span className="hidden sm:inline">RESUME</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setCustomZoom(null);
                          tourPlayer.handleNext();
                        }}
                        title="Next finding"
                        className="p-1 rounded hover:bg-black hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Working Interactive Zoom Selector as <select> Options */}
                    <div className="flex items-center gap-1.5 ">
                      <span className="text-[10px] font-mono font-bold text-[#52525B] hidden sm:inline">
                        ZOOM:
                      </span>
                      <button
                        onClick={() => handleZoomStep(-0.25)}
                        title="Zoom Out (-0.25x)"
                        className="w-5 h-5 rounded bg-white hover:bg-black hover:text-white border border-black text-xs font-mono font-black flex items-center justify-center transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <select
                        value={effectiveZoom >= 2.9 ? "3.00" : effectiveZoom.toFixed(2)}
                        onChange={(e) => setCustomZoom(parseFloat(e.target.value))}
                        className="bg-white border border-black rounded px-1.5 py-0.5 text-[10px] font-mono font-black text-black cursor-pointer focus:outline-none"
                      >
                        <option value="1.00">1.0X</option>
                        <option value="1.25">1.25X</option>
                        <option value="1.50">1.50X</option>
                        <option value="1.75">1.75X</option>
                        <option value="2.00">2.00X</option>
                        <option value="2.50">2.50X</option>
                        <option value="3.00">3.00X</option>
                      </select>
                      <button
                        onClick={() => handleZoomStep(0.25)}
                        title="Zoom In (+0.25x)"
                        className="w-5 h-5 rounded bg-white hover:bg-black hover:text-white border border-black text-xs font-mono font-black flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                      {customZoom !== null && (
                        <button
                          onClick={() => setCustomZoom(null)}
                          title="Reset to Stage Camera Zoom"
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-neutral-200 hover:bg-neutral-300 rounded text-neutral-800 uppercase transition-colors cursor-pointer ml-0.5"
                        >
                          RESET
                        </button>
                      )}
                    </div>

                    <button
                      onClick={onNavigateToFullscreenInspection}
                      title="Enter Fullscreen Cinema"
                      className="p-1 rounded-md bg-black text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Canvas Viewport */}
                <div className="w-full max-h-[480px] rounded-xl flex items-center justify-center bg-black overflow-hidden border-2 border-black">
                  <XrayCanvas
                    analysis={analysis}
                    activeView={tourPlayer.activeView}
                    camera={activeCamera}
                    activeFindingId={tourPlayer.associatedFinding?.id || null}
                    focusedFindingOnly={tourPlayer.focusedFindingOnly}
                    onSelectFinding={handleSelectFinding}
                    showScanline={tourPlayer.isScanning || isManualScanning}
                    showGrid={true}
                    interactive={true}
                    onZoomChange={(newZ) => setCustomZoom(newZ)}
                    onResetZoom={() => setCustomZoom(1.0)}
                    className="w-full h-full max-h-[480px] border-none shadow-none"
                  />
                </div>

                {/* Sub-bar showing active layers */}
                <div className="mt-3.5 pt-2.5 border-t-2 border-black flex flex-wrap items-center justify-between text-xs font-mono text-[#52525B] gap-2">
                  <div className="flex items-center gap-3 font-bold text-black">
                    <span>Active Layer:</span>
                    <span className="px-2.5 py-0.5 rounded bg-black text-white text-[10px] uppercase font-mono tracking-wider">
                      {tourPlayer.activeView}
                    </span>
                    {/* <span className="text-[#D4D4D8]">|</span> */}
                    {/* <span className="text-[#0E7490]">{analysis.caseName}</span> */}
                  </div>
                  <button
                    onClick={onNavigateToFullscreenInspection}
                    className="text-black font-bold hover:underline flex items-center gap-1 uppercase cursor-pointer"
                  >
                    <span>OPEN FULLSCREEN CINEMA</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Black Card (CLINICAL DOCUMENTARY) Directly at Bottom of Viewport */}
              <ClinicalDocumentaryConsole
                analysis={analysis}
                activeStageIndex={tourPlayer.activeStageIndex}
                totalStages={analysis.timeline.length}
                isPlaying={tourPlayer.isPlaying}
                onTogglePlay={tourPlayer.togglePlay}
                onRestart={() => {
                  setCustomZoom(null);
                  tourPlayer.handleRestart();
                }}
                onPrev={() => {
                  setCustomZoom(null);
                  tourPlayer.handlePrev();
                }}
                onNext={() => {
                  setCustomZoom(null);
                  tourPlayer.handleNext();
                }}
                playbackSpeed={tourPlayer.playbackSpeed}
                onToggleSpeed={tourPlayer.toggleSpeed}
                secondsElapsed={tourPlayer.secondsElapsed}
                totalEstSeconds={tourPlayer.totalEstSeconds}
                isAudioNarrating={tourPlayer.isAudioNarrating}
                onToggleAudio={() => tourPlayer.setIsAudioNarrating(!tourPlayer.isAudioNarrating)}
                activeView={tourPlayer.activeView}
                onViewChange={tourPlayer.setActiveView}
                onNavigateToFullscreen={onNavigateToFullscreenInspection}
                currentStageSubtitle={tourPlayer.currentStage.description}
              />
            </div>

            {/* Right Column (5 cols): TOUR CHAPTERS & Finding Clinical Dossier */}
            <div className="lg:col-span-5">
              <TourChaptersPanel
                analysis={analysis}
                activeStageIndex={tourPlayer.activeStageIndex}
                onStageSelect={handleStageSelect}
                isPlaying={tourPlayer.isPlaying}
                currentStage={tourPlayer.currentStage}
                associatedFinding={tourPlayer.associatedFinding}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. INDIVIDUAL FINDINGS BREAKDOWN */}
      <section className="py-14 border-b-2 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-[#0E7490] block mb-1 font-bold">
              REGIONAL SPOT BREAKDOWN
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase">
              Identified Pulmonary Spots
            </h2>
            <p className="text-xs sm:text-sm text-[#52525B] mt-1 font-medium">
              Click any finding below to inspect its synchronized X-ray preview, exact confidence percentage, and suggested question for your doctor.
            </p>
          </div>

          {analysis.findings.length === 0 ? (
            <div className="p-8 bg-[#F8F8F5] rounded-xl border-2 border-black text-center max-w-xl mx-auto shadow-[3px_3px_0px_#000]">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-black text-lg text-black uppercase">
                Clear Bilateral Lung Fields
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] mt-1.5 leading-relaxed font-medium">
                FindPneumo did not identify localized consolidation, pleural effusion, or active airspace opacity in this chest radiograph.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysis.findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  analysis={analysis}
                  isSelected={tourPlayer.associatedFinding?.id === finding.id}
                  onSelect={() => handleSelectFinding(finding.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Printable Clinical Report Modal */}
      <PrintableReportModal
        analysis={analysis}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
