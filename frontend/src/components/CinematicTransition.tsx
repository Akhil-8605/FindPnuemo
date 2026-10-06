import React, { useEffect, useState } from 'react';
import { AnalysisData } from '../types';
import { XrayCanvas } from './XrayCanvas';
import { Activity, Zap, CheckCircle2, ShieldCheck, Compass, ArrowRight } from 'lucide-react';

interface CinematicTransitionProps {
  analysis: AnalysisData;
  isLoading?: boolean;
  onComplete: () => void;
}

export const CinematicTransition: React.FC<CinematicTransitionProps> = ({
  analysis,
  isLoading = false,
  onComplete,
}) => {
  const [phase, setPhase] = useState<number>(0);
  const [telemetryTick, setTelemetryTick] = useState<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 1900);
    const t4 = setTimeout(() => setPhase(4), 2600);

    const interval = setInterval(() => {
      setTelemetryTick((prev) => (prev + 1) % 100);
    }, 60);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearInterval(interval);
    };
  }, []);

  // Complete transition when inference finishes and min animation has elapsed
  useEffect(() => {
    if (phase >= 4 && !isLoading) {
      const tDone = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(tDone);
    }
  }, [phase, isLoading, onComplete]);

  const stages = [
    {
      title: 'ALIGNING THORACIC ANATOMY',
      detail: 'Registering rib margins, carina axis & diaphragmatic contours',
      tag: 'CALIBRATION',
    },
    {
      title: 'DENSENET-121 NEURAL INFERENCE',
      detail: 'Scanning 14 pulmonary feature vectors for airspace consolidation',
      tag: 'DEEP LEARNING',
    },
    {
      title: 'GRAD-CAM THERMAL LOCALIZATION',
      detail: 'Extracting gradient backpropagation to isolate focal opacities',
      tag: 'ATTENTION MAP',
    },
    {
      title: 'LOCKING REGIONAL BOUNDING BOXES',
      detail: 'Calculating percentage certainty & tissue involvement for each finding',
      tag: 'REGIONAL RETICLES',
    },
    {
      title: 'SYNTHESIZING PATIENT WORKSTATION',
      detail: 'Generating plain-language consultation summary & doctor checklist',
      tag: 'REPORT GENERATION',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#07090D] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background Medical Matrix Grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #38BDF8 1px, transparent 1px), linear-gradient(to right, #38BDF8 0.5px, transparent 0.5px), linear-gradient(to bottom, #38BDF8 0.5px, transparent 0.5px)',
          backgroundSize: '36px 36px, 36px 36px, 36px 36px',
        }}
      />

      {/* Top Telemetry Header */}
      <div className="w-full max-w-lg flex items-center justify-between text-xs font-mono text-white mb-4 sm:mb-6 border-b-2 border-white/20 pb-3 z-10">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          <span className="font-black tracking-wider uppercase">
            FINDPNEUMO ACTIVE NEURAL SCAN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-300 font-bold tabular-nums">
            STAGE 0{phase + 1} / 05
          </span>
          <button
            onClick={onComplete}
            className="text-slate-400 hover:text-white font-bold transition-colors underline decoration-dotted text-[11px] cursor-pointer"
          >
            SKIP
          </button>
        </div>
      </div>

      {/* Center Cinematic X-Ray Scanner Stage */}
      <div
        className="relative w-full max-w-sm sm:max-w-md aspect-square rounded-2xl border-2 border-white/80 transition-all duration-700 shadow-[0_0_60px_rgba(6,182,212,0.3)] bg-black overflow-hidden z-10"
        style={{
          transform: phase === 4 ? 'scale(1.04)' : phase >= 1 ? 'scale(1)' : 'scale(0.97)',
        }}
      >
        <XrayCanvas
          analysis={analysis}
          activeView={phase >= 3 ? 'all' : phase >= 2 ? 'attention' : 'original'}
          camera={{
            x: phase >= 2 && analysis.findings[0] ? analysis.findings[0].heatmapPoint.x : 50,
            y: phase >= 2 && analysis.findings[0] ? analysis.findings[0].heatmapPoint.y : 50,
            zoom: phase === 4 ? 1.4 : phase >= 2 ? 1.25 : 1.0,
          }}
          showScanline={true}
          showGrid={true}
          interactive={false}
          className="w-full h-full border-none shadow-none"
        />

        {/* Dynamic Sweeping Laser Beam Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22D3EE] animate-[scanLaser_2s_ease-in-out_infinite]" />
        </div>

        {/* Phase Flash Effect */}
        {phase === 2 && (
          <div className="absolute inset-0 bg-cyan-400/20 mix-blend-screen pointer-events-none animate-pulse" />
        )}

        {/* High-Precision Corner Reticles */}
        <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
        <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
        <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
        <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

        {/* Centroid Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
          <div className="w-12 h-12 border border-cyan-400/60 rounded-full flex items-center justify-center">
            <span className="w-2 h-2 bg-cyan-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom Live Pipeline Telemetry HUD */}
      <div className="w-full max-w-sm sm:max-w-md mt-4 sm:mt-6 space-y-3 z-10">
        <div className="bg-black/90 backdrop-blur-md border-2 border-white/80 rounded-xl p-3.5 shadow-[4px_4px_0px_#000]">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider mb-1">
            <span>{stages[phase]?.tag}</span>
            <span className="text-white">{(phase + 1) * 20}% PROCESSED</span>
          </div>
          <div className="text-xs font-mono font-black text-white uppercase tracking-wider mb-1">
            {stages[phase]?.title}
          </div>
          <div className="text-[11px] font-mono text-slate-300 leading-relaxed">
            {stages[phase]?.detail}
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div className="w-full bg-white/20 h-2 rounded-full border border-white/30 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${((phase + 1) / 5) * 100}%` }}
          />
        </div>

        {/* Dynamic Telemetry Numbers */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold px-1">
          <span>LATENCY: 6ms</span>
          <span>DICOM MATRIX: 512×512</span>
          <span>FPS: 60.0</span>
          <span>CONFIDENCE: {analysis.overallConfidence}%</span>
        </div>
      </div>
    </div>
  );
};
