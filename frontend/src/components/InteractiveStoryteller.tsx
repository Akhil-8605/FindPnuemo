import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Compass,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { AnalysisData, Finding, TimelineStage } from '../types';

export interface ClinicalPlayerState {
  activeStageIndex: number;
  setActiveStageIndex: (index: number) => void;
  activeView: 'original' | 'attention' | 'boxed' | 'all';
  setActiveView: (view: 'original' | 'attention' | 'boxed' | 'all') => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  subPhase: number;
  playbackSpeed: number;
  toggleSpeed: () => void;
  secondsElapsed: number;
  totalEstSeconds: number;
  isAudioNarrating: boolean;
  setIsAudioNarrating: (narrating: boolean) => void;
  handleStageSelect: (index: number) => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleRestart: () => void;
  currentStage: TimelineStage;
  associatedFinding?: Finding;
  focusedFindingOnly: string | null;
  isScanning: boolean;
}

export function useClinicalTourPlayer(
  analysis: AnalysisData,
  initialView: 'original' | 'attention' | 'boxed' | 'all' = 'boxed'
): ClinicalPlayerState {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [activeView, setActiveView] = useState<'original' | 'attention' | 'boxed' | 'all'>(initialView);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isAudioNarrating, setIsAudioNarrating] = useState<boolean>(false);
  const [subPhase, setSubPhase] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStage = analysis.timeline[activeStageIndex] || analysis.timeline[0];
  const associatedFinding: Finding | undefined = analysis.findings.find(
    (f) => f.id === currentStage.associatedFindingId
  );

  const isOverview = activeStageIndex === 0;
  const focusedFindingOnly = associatedFinding ? associatedFinding.id : null;
  const isScanning = isOverview && subPhase === 0;

  // Flow-state sub-phase automated progression while playing
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const phaseDuration = Math.round(2500 / playbackSpeed);

    if (isOverview) {
      // Overview: 0: original scan (3.5s) -> 1: attention heatmap (2.5s) -> 2: boxed (2.5s) -> 3: all combined (2.5s) -> Next
      if (subPhase === 0) {
        setActiveView('original');
        timerRef.current = setTimeout(() => setSubPhase(1), Math.round(3500 / playbackSpeed));
      } else if (subPhase === 1) {
        setActiveView('attention');
        timerRef.current = setTimeout(() => setSubPhase(2), phaseDuration);
      } else if (subPhase === 2) {
        setActiveView('boxed');
        timerRef.current = setTimeout(() => setSubPhase(3), phaseDuration);
      } else if (subPhase === 3) {
        setActiveView('all');
        timerRef.current = setTimeout(() => {
          setSubPhase(0);
          const nextIdx = (activeStageIndex + 1) % analysis.timeline.length;
          setActiveStageIndex(nextIdx);
        }, phaseDuration);
      }
    } else if (associatedFinding) {
      // Finding: 0: heatmap only at lesion -> 1: boxed reticle only -> 2: combined -> Next
      if (subPhase === 0) {
        setActiveView('attention');
        timerRef.current = setTimeout(() => setSubPhase(1), phaseDuration);
      } else if (subPhase === 1) {
        setActiveView('boxed');
        timerRef.current = setTimeout(() => setSubPhase(2), phaseDuration);
      } else {
        setActiveView('all');
        timerRef.current = setTimeout(() => {
          setSubPhase(0);
          const nextIdx = (activeStageIndex + 1) % analysis.timeline.length;
          setActiveStageIndex(nextIdx);
        }, phaseDuration);
      }
    } else {
      // All Findings final overview
      setActiveView('all');
      timerRef.current = setTimeout(() => {
        setSubPhase(0);
        setActiveStageIndex(0); // Loop back to overview
      }, Math.round(4000 / playbackSpeed));
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isPlaying,
    activeStageIndex,
    subPhase,
    playbackSpeed,
    isOverview,
    associatedFinding,
    analysis.timeline.length,
  ]);

  const handleStageSelect = (idx: number) => {
    setSubPhase(0);
    setActiveStageIndex(idx);
    const targetStage = analysis.timeline[idx];
    if (idx === 0) {
      setActiveView('original');
    } else if (targetStage?.associatedFindingId) {
      setActiveView('attention');
    } else {
      setActiveView('all');
    }
  };

  // Video timecode counter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Speech Narration Logic
  useEffect(() => {
    if (!isAudioNarrating || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    window.speechSynthesis.cancel();

    let textToSpeak = '';
    if (isOverview) {
      if (!isPlaying) {
        textToSpeak = `Thoracic radiograph overview. Calibrating lung margins and standard medical viewing contrast. ${currentStage.description}`;
      } else {
        textToSpeak = `Thoracic radiograph overview. Calibrating bilateral lung fields.`;
      }
    } else if (associatedFinding) {
      if (!isPlaying) {
        // Full explanation when paused and staying at this finding
        textToSpeak = `Finding ${associatedFinding.number}: Zooming into ${associatedFinding.anatomicalRegion} ${associatedFinding.title} (${associatedFinding.confidence}%). What Is Happening In This Area: ${associatedFinding.effectDescription}. Damage Assessment: ${associatedFinding.damageAssessment}`;
      } else {
        // Concise voiceover while auto-playing through
        textToSpeak = `Finding ${associatedFinding.number}: Zooming into ${associatedFinding.anatomicalRegion} ${associatedFinding.title}, ${associatedFinding.confidence}% certainty.`;
      }
    } else {
      if (!isPlaying) {
        textToSpeak = `Full thoracic overview. All Grad-CAM activations, bounding reticles, and clinical certainty metrics synchronized. ${currentStage.description}`;
      } else {
        textToSpeak = `Full thoracic overview. All findings synchronized.`;
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [
    activeStageIndex,
    isPlaying,
    isAudioNarrating,
    playbackSpeed,
    isOverview,
    associatedFinding,
    currentStage.description,
  ]);

  const handlePrev = () => {
    setSubPhase(0);
    const prevIndex = activeStageIndex === 0 ? analysis.timeline.length - 1 : activeStageIndex - 1;
    handleStageSelect(prevIndex);
  };

  const handleNext = () => {
    setSubPhase(0);
    const nextIndex = (activeStageIndex + 1) % analysis.timeline.length;
    handleStageSelect(nextIndex);
  };

  const handleRestart = () => {
    setSubPhase(0);
    handleStageSelect(0);
    setSecondsElapsed(0);
  };

  const toggleSpeed = () => {
    if (playbackSpeed === 1.0) setPlaybackSpeed(1.5);
    else if (playbackSpeed === 1.5) setPlaybackSpeed(2.0);
    else setPlaybackSpeed(1.0);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const totalEstSeconds = Math.round((analysis.timeline.length * 6.5) / playbackSpeed);

  return {
    activeStageIndex,
    setActiveStageIndex,
    activeView,
    setActiveView,
    isPlaying,
    setIsPlaying,
    togglePlay,
    subPhase,
    playbackSpeed,
    toggleSpeed,
    secondsElapsed,
    totalEstSeconds,
    isAudioNarrating,
    setIsAudioNarrating,
    handleStageSelect,
    handlePrev,
    handleNext,
    handleRestart,
    currentStage,
    associatedFinding,
    focusedFindingOnly,
    isScanning,
  };
}

// -------------------------------------------------------------
// 1. CLINICAL DOCUMENTARY CONSOLE (Black card at bottom of Viewport)
// -------------------------------------------------------------
interface ClinicalDocumentaryConsoleProps {
  analysis: AnalysisData;
  activeStageIndex: number;
  totalStages: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onPrev: () => void;
  onNext: () => void;
  playbackSpeed: number;
  onToggleSpeed: () => void;
  secondsElapsed: number;
  totalEstSeconds: number;
  isAudioNarrating: boolean;
  onToggleAudio: () => void;
  activeView: 'original' | 'attention' | 'boxed' | 'all';
  onViewChange: (view: 'original' | 'attention' | 'boxed' | 'all') => void;
  onNavigateToFullscreen?: () => void;
  currentStageSubtitle?: string;
  className?: string;
}

export const ClinicalDocumentaryConsole: React.FC<ClinicalDocumentaryConsoleProps> = ({
  analysis,
  activeStageIndex,
  totalStages,
  isPlaying,
  onTogglePlay,
  onRestart,
  onPrev,
  onNext,
  playbackSpeed,
  onToggleSpeed,
  secondsElapsed,
  totalEstSeconds,
  isAudioNarrating,
  onToggleAudio,
  activeView,
  onViewChange,
  onNavigateToFullscreen,
  currentStageSubtitle,
  className = '',
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`bg-[#0D1017] text-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col gap-3.5 ${className}`}
    >
      {/* Top Bar with REC Indicator, Case ID & Voiceover Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/15">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-black uppercase">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>CLINICAL DOCUMENTARY</span>
          </span>
          <span className="text-xs font-mono text-neutral-300 font-bold hidden sm:inline">
            CASE: {analysis.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Voice Narration Toggle */}
          <button
            onClick={onToggleAudio}
            title={isAudioNarrating ? 'Mute voice narration' : 'Play spoken documentary voiceover'}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isAudioNarrating
                ? 'bg-cyan-400 text-black border-cyan-400 shadow-[1px_1px_0px_#FFF]'
                : 'bg-black text-neutral-300 border-white/30 hover:text-white'
            }`}
          >
            {isAudioNarrating ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">VOICEOVER ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="text-[10px]">VOICE OFF</span>
              </>
            )}
          </button>

          {onNavigateToFullscreen && (
            <button
              onClick={onNavigateToFullscreen}
              title="Open fullscreen view"
              className="p-1 rounded-md bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 transition-all cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Video Scrubber & Timecode */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-cyan-300 font-black tabular-nums">
            {formatTime(secondsElapsed)} / {formatTime(totalEstSeconds)}
          </span>
          <span className="text-neutral-300 font-semibold uppercase text-[10px]">
            STEP {activeStageIndex + 1} OF {totalStages}
          </span>
        </div>

        {/* Interactive Progress Bar */}
        <div className="w-full bg-[#1F2430] h-2 rounded-full relative overflow-hidden border border-white/20">
          <div
            className="h-full bg-cyan-400 transition-all duration-300 ease-out"
            style={{
              width: `${((activeStageIndex + 1) / totalStages) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Playback Controls & Speed */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-black tracking-wider flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-400 text-black border-amber-400 shadow-[2px_2px_0px_#FFF]'
                : 'bg-white text-black border-white shadow-[2px_2px_0px_#38BDF8]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY TOUR</span>
              </>
            )}
          </button>

          <button
            onClick={onRestart}
            title="Restart tour"
            className="p-1.5 rounded-md bg-[#181B22] text-white hover:bg-white hover:text-black border border-white/30 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPrev}
            title="Previous chapter"
            className="p-1.5 rounded-md bg-[#181B22] text-white hover:bg-white hover:text-black border border-white/30 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onNext}
            title="Next chapter"
            className="p-1.5 rounded-md bg-[#181B22] text-white hover:bg-white hover:text-black border border-white/30 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleSpeed}
            title="Adjust playback speed"
            className="px-2 py-1 rounded-md bg-[#181B22] text-white hover:bg-cyan-400 hover:text-black border border-white/30 text-[10px] font-mono font-bold transition-colors cursor-pointer"
          >
            {playbackSpeed}X
          </button>
        </div>

        {/* Voice Wave Animation */}
        {isAudioNarrating && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/70 rounded border border-cyan-400/50 text-[10px] font-mono text-cyan-300">
            <span className="w-1 h-3 bg-cyan-400 animate-pulse" />
            <span className="w-1 h-4 bg-cyan-300 animate-pulse" />
            <span className="w-1 h-2 bg-cyan-400 animate-pulse" />
            <span className="ml-1 font-bold">NARRATING CLINICAL STUDY</span>
          </div>
        )}
      </div>

      {/* Modality Layer Switcher Tabs */}
      <div className="pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">
          IMAGE LAYER:
        </span>
        <div className="flex items-center gap-1 bg-[#161922] p-1 rounded-lg border border-white/20">
          <button
            onClick={() => onViewChange('original')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              activeView === 'original'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            ORIGINAL
          </button>
          <button
            onClick={() => onViewChange('attention')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              activeView === 'attention'
                ? 'bg-cyan-400 text-black shadow-sm'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            HEATMAP
          </button>
          <button
            onClick={() => onViewChange('boxed')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              activeView === 'boxed'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            BOXED
          </button>
          <button
            onClick={() => onViewChange('all')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              activeView === 'all'
                ? 'bg-emerald-400 text-black shadow-sm'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            ALL
          </button>
        </div>
      </div>

      {/* Subtitle Caption Strip */}
      {currentStageSubtitle && (
        <div className="text-[11px] font-mono text-neutral-300 bg-black/60 px-2.5 py-1.5 rounded border border-white/10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
          <span className="truncate">{currentStageSubtitle}</span>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 2. TOUR CHAPTERS & FINDINGS PANEL (Right Column)
// -------------------------------------------------------------
interface TourChaptersPanelProps {
  analysis: AnalysisData;
  activeStageIndex: number;
  onStageSelect: (index: number) => void;
  isPlaying: boolean;
  currentStage: TimelineStage;
  associatedFinding?: Finding;
  className?: string;
}

export const TourChaptersPanel: React.FC<TourChaptersPanelProps> = ({
  analysis,
  activeStageIndex,
  onStageSelect,
  isPlaying,
  currentStage,
  associatedFinding,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* 2A. TOUR CHAPTERS NAVIGATION TABS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000]">
        <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2 text-xs font-mono">
          <span className="uppercase tracking-wider text-[#52525B] font-bold">
            TOUR CHAPTERS
          </span>
          <span className="font-bold text-black flex items-center gap-1.5 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-cyan-500 animate-pulse' : 'bg-neutral-400'
              }`}
            />
            {isPlaying ? 'PLAYING FLOW' : 'PAUSED (FULL DETAIL)'}
          </span>
        </div>

        {/* Clean, Non-Repetitive Chapter Buttons: Overview, Finding 01, Finding 02... All Findings */}
        <div className="flex flex-wrap gap-2">
          {analysis.timeline.map((stage, idx) => {
            const isActive = idx === activeStageIndex;
            return (
              <button
                key={stage.id}
                onClick={() => onStageSelect(idx)}
                className={`px-3.5 py-2 rounded-lg text-left border-2 border-black transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-black text-white shadow-[2px_2px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-[#F8F8F5] text-black hover:bg-white shadow-[1px_1px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                }`}
              >
                {stage.associatedFindingId ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-cyan-400' : 'bg-neutral-400'
                    } shrink-0`}
                  />
                )}
                <span className="text-xs font-mono font-black uppercase tracking-tight">
                  {stage.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2B. CURRENT CHAPTER CLINICAL DOSSIER */}
      <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
        {/* Stage Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-black text-white uppercase">
                {currentStage.shortLabel}
              </span>
              <span className="text-xs font-mono text-[#0E7490] uppercase font-bold">
                {currentStage.phaseType?.replace('_', ' ').toUpperCase() || 'EVALUATION'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-black tracking-tight uppercase">
              {currentStage.fullTitle}
            </h3>
          </div>

          {associatedFinding && (
            <div className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-mono font-black text-amber-300">
                {associatedFinding.confidence}% CERTAINTY
              </span>
            </div>
          )}
        </div>

        {/* Narrative Description */}
        <p className="text-sm leading-relaxed text-[#27272A] font-medium">
          {currentStage.description}
        </p>

        {/* Detailed Medical Evidence Breakdown for this specific finding */}
        {associatedFinding && (
          <div className="bg-[#F8F8F5] rounded-xl border-2 border-black p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 font-black text-black">
                <Compass className="w-4 h-4 text-[#0E7490]" />
                <span>{associatedFinding.anatomicalRegion}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white text-black font-black border border-black text-[10px]">
                {associatedFinding.damageExtent}
              </span>
            </div>

            <div>
              <span className="text-xs font-black text-black block mb-1 uppercase font-mono">
                What Is Happening In This Area:
              </span>
              <p className="text-xs text-[#27272A] font-medium leading-relaxed">
                {associatedFinding.effectDescription}
              </p>
            </div>

            <div>
              <span className="text-xs font-black text-black block mb-1 uppercase font-mono">
                Damage Assessment:
              </span>
              <p className="text-xs text-[#27272A] font-medium leading-relaxed">
                {associatedFinding.damageAssessment}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. BACKWARD-COMPATIBLE WRAPPER
// -------------------------------------------------------------
interface InteractiveStorytellerProps {
  analysis: AnalysisData;
  activeStageIndex: number;
  onStageChange: (index: number) => void;
  activeView: 'original' | 'attention' | 'boxed' | 'all';
  onViewChange: (view: 'original' | 'attention' | 'boxed' | 'all') => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNavigateToFullscreen?: () => void;
  className?: string;
}

export const InteractiveStoryteller: React.FC<InteractiveStorytellerProps> = ({
  analysis,
  activeStageIndex,
  onStageChange,
  activeView,
  onViewChange,
  isPlaying,
  onTogglePlay,
  onNavigateToFullscreen,
  className = '',
}) => {
  const currentStage = analysis.timeline[activeStageIndex] || analysis.timeline[0];
  const associatedFinding = analysis.findings.find(
    (f) => f.id === currentStage.associatedFindingId
  );

  return (
    <div className={`grid lg:grid-cols-12 gap-5 ${className}`}>
      <div className="lg:col-span-7">
        <ClinicalDocumentaryConsole
          analysis={analysis}
          activeStageIndex={activeStageIndex}
          totalStages={analysis.timeline.length}
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onRestart={() => onStageChange(0)}
          onPrev={() =>
            onStageChange(
              activeStageIndex === 0 ? analysis.timeline.length - 1 : activeStageIndex - 1
            )
          }
          onNext={() => onStageChange((activeStageIndex + 1) % analysis.timeline.length)}
          playbackSpeed={1.0}
          onToggleSpeed={() => {}}
          secondsElapsed={0}
          totalEstSeconds={Math.round(analysis.timeline.length * 6.5)}
          isAudioNarrating={false}
          onToggleAudio={() => {}}
          activeView={activeView}
          onViewChange={onViewChange}
          onNavigateToFullscreen={onNavigateToFullscreen}
        />
      </div>
      <div className="lg:col-span-5">
        <TourChaptersPanel
          analysis={analysis}
          activeStageIndex={activeStageIndex}
          onStageSelect={onStageChange}
          isPlaying={isPlaying}
          currentStage={currentStage}
          associatedFinding={associatedFinding}
        />
      </div>
    </div>
  );
};
