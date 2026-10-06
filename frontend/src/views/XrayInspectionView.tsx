import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Printer,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Compass,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnalysisData } from '../types';
import { XrayCanvas } from '../components/XrayCanvas';
import { PrintableReportModal } from '../components/PrintableReportModal';
import { useClinicalTourPlayer } from '../components/InteractiveStoryteller';

interface XrayInspectionViewProps {
  analysis: AnalysisData;
  onNavigateBack: () => void;
}

export const XrayInspectionView: React.FC<XrayInspectionViewProps> = ({
  analysis,
  onNavigateBack,
}) => {
  const tourPlayer = useClinicalTourPlayer(analysis, 'boxed');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isManualScanning, setIsManualScanning] = useState<boolean>(false);
  const [customZoom, setCustomZoom] = useState<number | null>(null);

  // Keyboard controls for video experience (Space = play/pause, ArrowLeft/Right = prev/next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is interacting with an input or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        tourPlayer.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCustomZoom(null);
        tourPlayer.handlePrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCustomZoom(null);
        tourPlayer.handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tourPlayer]);

  const handleTriggerScan = () => {
    setIsManualScanning(true);
    setTimeout(() => setIsManualScanning(false), 3200);
  };

  const currentStage = tourPlayer.currentStage;
  const camera = currentStage.camera;

  // Zoom calculation
  const effectiveZoom = customZoom !== null ? customZoom : camera.zoom;
  const activeCamera = { ...camera, zoom: effectiveZoom };

  const handleZoomStep = (delta: number) => {
    setCustomZoom((prev) => {
      const base = prev !== null ? prev : camera.zoom;
      return Math.min(3.0, Math.max(1.0, parseFloat((base + delta).toFixed(2))));
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const associatedFinding = tourPlayer.associatedFinding;

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-[#07090D] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* 1. TOP CINEMA NAVIGATION HEADER */}
      <header className="px-4 py-2.5 sm:px-6 bg-black border-b-2 border-white/20 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateBack}
            className="px-3 py-1.5 rounded-lg bg-white text-black font-mono text-xs font-black hover:bg-slate-200 transition-all flex items-center gap-1.5 border-2 border-white shadow-[2px_2px_0px_#FFF] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>EXIT FULLSCREEN</span>
          </button>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  tourPlayer.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase font-mono">
                CINEMATIC X-RAY INSPECTION TOUR
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 font-bold">
                {tourPlayer.isPlaying ? 'PLAYING' : 'PAUSED'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {analysis.caseName} · {analysis.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Scanwave trigger */}
          <button
            onClick={handleTriggerScan}
            disabled={isManualScanning || tourPlayer.isScanning}
            className={`px-3 py-1.5 rounded-lg border-2 border-cyan-400 font-mono text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#FFF] cursor-pointer ${
              isManualScanning || tourPlayer.isScanning
                ? 'bg-cyan-300 text-black'
                : 'bg-black text-cyan-300 hover:bg-cyan-400 hover:text-black'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">
              {isManualScanning || tourPlayer.isScanning ? 'SCANNING...' : 'SCAN WAVE'}
            </span>
          </button>

          {/* Printable Report */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-white text-black border-2 border-white font-mono text-xs font-black hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#FFF] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#0E7490]" />
            <span className="hidden sm:inline">PRINT / VIEW REPORT</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN FULLSCREEN WORKSTATION STAGE */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-3 sm:p-5 gap-6 relative w-full max-w-7xl mx-auto overflow-hidden min-h-0">
        {/* Central High-Resolution Cinema Canvas (Video Player Frame) */}
        <div
          onClick={tourPlayer.togglePlay}
          className="w-full max-w-md lg:max-w-lg aspect-square max-h-[min(54vh,480px)] relative border-2 border-white/80 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] bg-black shrink-0 overflow-hidden flex items-center justify-center cursor-pointer group"
        >
          <XrayCanvas
            analysis={analysis}
            activeView={tourPlayer.activeView}
            camera={activeCamera}
            activeFindingId={tourPlayer.associatedFinding?.id || null}
            focusedFindingOnly={tourPlayer.focusedFindingOnly}
            onSelectFinding={(fId) => {
              const matchIdx = analysis.timeline.findIndex((s) => s.associatedFindingId === fId);
              if (matchIdx !== -1) tourPlayer.handleStageSelect(matchIdx);
            }}
            showScanline={tourPlayer.isScanning || isManualScanning}
            showGrid={true}
            interactive={true}
            onZoomChange={(newZ) => setCustomZoom(newZ)}
            onResetZoom={() => setCustomZoom(1.0)}
            className="w-full h-full border-none shadow-none"
          />

          {/* Precision Corner Reticles */}
          <span className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
          <span className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
          <span className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
          <span className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

          {/* Subtle Video Hover Overlay (Click to Play/Pause) */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/75 border-2 border-white/80 flex items-center justify-center text-white shadow-lg backdrop-blur-xs">
              {tourPlayer.isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Context HUD Explanatory Card (Scrollable IF AND ONLY IF overflowing) */}
        <div className="w-full lg:w-[460px] flex flex-col gap-3 shrink-0 text-left min-h-0 max-h-[min(54vh,480px)]">
          {/* Chapter Selector Strip */}
          <div className="flex flex-wrap gap-1.5 bg-[#12151D] p-2 rounded-xl border border-white/20 shadow-[2px_2px_0px_#000] shrink-0">
            {analysis.timeline.map((stage, idx) => {
              const isActive = idx === tourPlayer.activeStageIndex;
              return (
                <button
                  key={stage.id}
                  onClick={() => {
                    setCustomZoom(null);
                    tourPlayer.handleStageSelect(idx);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-400 text-black shadow-sm font-black'
                      : 'bg-black text-slate-300 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      stage.associatedFindingId ? 'bg-rose-500' : 'bg-cyan-400'
                    }`}
                  />
                  <span>{stage.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Essential Clinical Explanatory Dossier Card - scrollable if and only if overflowing */}
          <div className="bg-[#12151D] border-2 border-white/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-[4px_4px_0px_#000] overflow-y-auto overscroll-contain flex-1">
            {/* Stage Title and Certainty Header */}
            <div className="flex items-center justify-between border-b border-white/20 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-black text-cyan-300 border border-cyan-400/50 uppercase">
                  {currentStage.shortLabel}
                </span>
                <span className="text-[10px] font-mono text-[#38BDF8] uppercase font-bold">
                  {currentStage.phaseType?.replace('_', ' ').toUpperCase() || 'EVALUATION'}
                </span>
              </div>

              {associatedFinding && (
                <div className="px-2.5 py-0.5 rounded bg-black text-amber-300 font-mono text-xs font-black border border-amber-400/50 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>{associatedFinding.confidence}% CERTAINTY</span>
                </div>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-black text-white tracking-tight uppercase leading-snug">
              {currentStage.fullTitle}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {currentStage.description}
            </p>

            {/* Essential Medical Findings Info (Question To Ask Your Physician removed to reduce card size) */}
            {associatedFinding ? (
              <div className="bg-[#0A0D14] rounded-xl border border-white/20 p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Compass className="w-3.5 h-3.5" />
                    <span>{associatedFinding.anatomicalRegion}</span>
                  </div>
                  <span className="text-white px-2 py-0.5 bg-white/10 rounded font-black text-[10px]">
                    {associatedFinding.damageExtent}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block mb-0.5">
                    What Is Happening In This Area:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {associatedFinding.effectDescription}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block mb-0.5">
                    Damage Assessment:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {associatedFinding.damageAssessment}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#0A0D14] rounded-xl border border-white/20 p-3 text-xs text-slate-300 leading-relaxed">
                <span className="font-mono text-cyan-300 font-bold block mb-1 uppercase text-[10px]">
                  THORACIC CALIBRATION OVERVIEW
                </span>
                Bilateral apical to basal margins calibrated. The deep learning inference engine has
                extracted multi-scale topological activations across the pulmonary parenchymal field.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 3. BOTTOM CINEMATIC VIDEO PLAYER CONSOLE (Video Controls Placed at Bottom) */}
      <footer className="px-4 py-3 sm:px-6 bg-[#0A0C12] border-t-2 border-white/20 flex flex-col gap-2.5 shrink-0 z-20">
        <div className="max-w-7xl w-full mx-auto space-y-2">
          {/* Interactive Multi-Chapter Video Scrubber Bar */}
          <div className="w-full bg-[#1F2430] h-2.5 rounded-full overflow-hidden border border-white/20 relative cursor-pointer flex">
            {analysis.timeline.map((stage, idx) => {
              const isPast = idx < tourPlayer.activeStageIndex;
              const isCurrent = idx === tourPlayer.activeStageIndex;
              const widthPct = (1 / analysis.timeline.length) * 100;

              return (
                <div
                  key={stage.id}
                  onClick={() => {
                    setCustomZoom(null);
                    tourPlayer.handleStageSelect(idx);
                  }}
                  className="h-full relative border-r border-black/40 transition-colors"
                  style={{ width: `${widthPct}%` }}
                  title={`Jump to ${stage.shortLabel}: ${stage.fullTitle}`}
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      isPast
                        ? 'bg-cyan-400'
                        : isCurrent
                        ? 'bg-cyan-300 animate-pulse'
                        : 'bg-transparent'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Main Video Control Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Video Playback Controls (Prev, Big Play/Pause, Next) + Timecode */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#12151D] p-1 rounded-xl border border-white/30 shadow-[2px_2px_0px_#000]">
                {/* Previous Button */}
                <button
                  onClick={() => {
                    setCustomZoom(null);
                    tourPlayer.handlePrev();
                  }}
                  title="Previous chapter (Left Arrow)"
                  className="p-1.5 rounded-lg bg-[#1F2430] hover:bg-white hover:text-black text-white transition-colors cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Big Prominent Video Play/Pause Button */}
                <button
                  onClick={tourPlayer.togglePlay}
                  title={tourPlayer.isPlaying ? 'Pause video (Space)' : 'Play video (Space)'}
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-black border-2 flex items-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#FFF] ${
                    tourPlayer.isPlaying
                      ? 'bg-amber-400 text-black border-amber-400 hover:bg-amber-300'
                      : 'bg-emerald-400 text-black border-emerald-400 hover:bg-emerald-300'
                  }`}
                >
                  {tourPlayer.isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>PLAY</span>
                    </>
                  )}
                </button>

                {/* Next Button */}
                <button
                  onClick={() => {
                    setCustomZoom(null);
                    tourPlayer.handleNext();
                  }}
                  title="Next chapter (Right Arrow)"
                  className="p-1.5 rounded-lg bg-[#1F2430] hover:bg-white hover:text-black text-white transition-colors cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Timecode and Step Information */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-cyan-300 tabular-nums">
                  {formatTime(tourPlayer.secondsElapsed)} / {formatTime(tourPlayer.totalEstSeconds)}
                </span>
                <span className="text-white/30">|</span>
                <span className="text-[11px] font-mono text-slate-300 font-bold uppercase hidden sm:inline">
                  CHAPTER {tourPlayer.activeStageIndex + 1} OF {analysis.timeline.length}:{' '}
                  <span className="text-white font-black">{currentStage.shortLabel}</span>
                </span>
              </div>
            </div>

            {/* Right: Audio Voiceover + Image Layer Tabs + Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Audio Voice Narration Toggle */}
              <button
                onClick={() => tourPlayer.setIsAudioNarrating(!tourPlayer.isAudioNarrating)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  tourPlayer.isAudioNarrating
                    ? 'bg-cyan-400 text-black border-cyan-400 shadow-[1px_1px_0px_#FFF]'
                    : 'bg-black text-neutral-300 border-white/30 hover:text-white'
                }`}
              >
                {tourPlayer.isAudioNarrating ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">VOICE ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span className="text-[10px]">VOICE OFF</span>
                  </>
                )}
              </button>

              {/* Image Layer Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#12151D] p-1 rounded-lg border border-white/25">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold px-1.5 hidden md:inline">
                  LAYER:
                </span>
                <button
                  onClick={() => tourPlayer.setActiveView('original')}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    tourPlayer.activeView === 'original'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  ORIGINAL
                </button>
                <button
                  onClick={() => tourPlayer.setActiveView('attention')}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    tourPlayer.activeView === 'attention'
                      ? 'bg-cyan-400 text-black shadow-sm'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  HEATMAP
                </button>
                <button
                  onClick={() => tourPlayer.setActiveView('boxed')}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    tourPlayer.activeView === 'boxed'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  BOXED
                </button>
                <button
                  onClick={() => tourPlayer.setActiveView('all')}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    tourPlayer.activeView === 'all'
                      ? 'bg-emerald-400 text-black shadow-sm'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  ALL
                </button>
              </div>

              {/* Zoom Selector Controls */}
              <div className="flex items-center gap-1 bg-[#12151D] px-2 py-1 rounded-lg border border-white/30 shadow-[1px_1px_0px_#FFF]">
                <span className="text-[10px] font-mono font-bold text-slate-400 hidden sm:inline">
                  ZOOM:
                </span>
                <button
                  onClick={() => handleZoomStep(-0.25)}
                  title="Zoom Out (-0.25x)"
                  className="w-5 h-5 rounded bg-[#1F2430] hover:bg-white hover:text-black text-white text-xs font-mono font-black flex items-center justify-center transition-colors cursor-pointer"
                >
                  -
                </button>
                <select
                  value={effectiveZoom >= 2.9 ? '3.00' : effectiveZoom.toFixed(2)}
                  onChange={(e) => setCustomZoom(parseFloat(e.target.value))}
                  className="bg-black border border-white/40 rounded px-1.5 py-0.5 text-[10px] font-mono font-black text-white cursor-pointer focus:outline-none"
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
                  className="w-5 h-5 rounded bg-[#1F2430] hover:bg-white hover:text-black text-white text-xs font-mono font-black flex items-center justify-center transition-colors cursor-pointer"
                >
                  +
                </button>
                {customZoom !== null && (
                  <button
                    onClick={() => setCustomZoom(null)}
                    title="Reset to Stage Camera Zoom"
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-white uppercase transition-colors cursor-pointer ml-0.5"
                  >
                    RESET
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Subtitle Strip */}
        <div className="max-w-7xl w-full mx-auto text-[11px] font-mono text-slate-300 bg-[#12151D] px-3 py-1 rounded border border-white/10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
          <span className="truncate">{currentStage.description}</span>
        </div>
      </footer>

      {/* Printable Clinical Report Modal */}
      <PrintableReportModal
        analysis={analysis}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
