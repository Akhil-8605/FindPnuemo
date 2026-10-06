import React, { useState, useRef } from 'react';
import {
  Upload,
  Lock,
  Zap,
  Cpu,
  Eye,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { AnalysisData, ScanPresetId } from '../types';
import { TeamSection } from '../components/TeamSection';

interface LandingViewProps {
  currentAnalysis: AnalysisData;
  onSelectPresetAndAnalyze: (presetId: ScanPresetId) => void;
  onUploadCustomFileAndAnalyze: (file: File) => void;
  onStartAnalysis: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  currentAnalysis,
  onSelectPresetAndAnalyze,
  onUploadCustomFileAndAnalyze,
  onStartAnalysis,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Automatic navigation & transition immediately on upload!
      onUploadCustomFileAndAnalyze(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Automatic navigation & transition immediately on selection!
      onUploadCustomFileAndAnalyze(e.target.files[0]);
    }
  };

  const howItWorksSteps = [
    {
      step: '01',
      title: 'Radiograph Ingestion',
      category: 'OPENCV CLAHE',
      icon: SlidersHorizontal,
      description:
        'Standardizes thoracic exposure and contrast while inpainting non-anatomical text markers.',
    },
    {
      step: '02',
      title: 'Neural Classification',
      category: 'DENSENET-121 GAP',
      icon: Cpu,
      description:
        'Analyzes alveolar tissue patterns at 384×384 px resolution with Global Average Pooling.',
    },
    {
      step: '03',
      title: 'Grad-CAM Localization',
      category: 'EXPLAINABLE AI',
      icon: Eye,
      description:
        'Extracts activation gradients at denseblock4 with cortical bone edge suppression.',
    },
    {
      step: '04',
      title: 'Clinical Summary',
      category: 'REPORT & EXPORT',
      icon: FileText,
      description:
        'Provides anatomical zone metrics, physician talking points, and an A4 PDF summary.',
    },
  ];

  return (
    <div className="min-h-[120vh] bg-[#F8F8F5] flex flex-col text-black">
      {/* 1. HERO SECTION — Restored Previous Centered Layout in Refined Normalism Brutalism */}
      <section className="relative pt-14 pb-20 border-b-2 border-black overflow-hidden bg-[#F8F8F5]">
        {/* Subtle Architectural Grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          {/* Top Clinical Strip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-xs font-mono tracking-wider uppercase mb-6 font-bold shadow-[2px_2px_0px_#000] rounded-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>AI-ASSISTED CHEST RADIOGRAPHY SCREENING</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-black tracking-tight leading-[0.96] mb-5 uppercase">
            SEE MORE CLEARLY.
            <br />
            <span className="text-[#0E7490]">UNDERSTAND</span>
            <br />
            YOUR CHEST X-RAY.
          </h1>

          <p className="text-base sm:text-lg text-[#27272A] leading-relaxed max-w-2xl mx-auto mb-8 font-medium">
            Upload your chest X-ray to instantly inspect neural attention heatmaps, explore localized pulmonary opacities, and generate a clear report for your doctor.
          </p>

          {/* Centered Professional Neo-Brutalist Upload Bay (Automatic Analysis on Selection) */}
          <div className="max-w-3xl mx-auto text-left">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-black rounded-xl p-6 sm:p-8 transition-all cursor-pointer bg-white shadow-[4px_4px_0px_#000] ${isDragging
                  ? 'bg-cyan-50 scale-[1.01] shadow-[5px_5px_0px_#000]'
                  : 'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000]'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-black text-white rounded-lg flex items-center justify-center shrink-0 border-2 border-black shadow-[2px_2px_0px_#000]">
                    <Upload className="w-7 h-7 text-cyan-300 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-black text-white uppercase">
                        DROP TO ANALYZE
                      </span>
                      <span className="text-xs font-mono text-[#0E7490] font-bold">
                        AUTO-STARTS SCAN
                      </span>
                    </div>
                    <h3 className="font-black text-xl text-black tracking-tight uppercase">
                      Upload Your Chest X-Ray
                    </h3>
                    <p className="text-xs text-[#52525B] font-mono mt-0.5">
                      Drop DICOM exports, PNG, or JPG. Analysis starts immediately!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-[#F8F8F5] rounded-md border-2 border-black text-xs font-mono font-black text-black whitespace-nowrap shadow-[2px_2px_0px_#000] hover:bg-black hover:text-white transition-all w-full sm:w-auto text-center cursor-pointer"
                  >
                    SELECT FROM DEVICE
                  </button>
                </div>
              </div>

              {/* Status / Instant Notice */}
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS — Minimal, Professional Clinical Pipeline */}
      <section className="py-16 border-b-2 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b-2 border-black">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#71717A] mb-1 font-bold">
                <span className="w-2 h-2 bg-black rounded-sm" />
                <span>WORKFLOW</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
                How It Works
              </h2>
            </div> 
          </div>

          {/* Minimal 4 Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {howItWorksSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.step}
                  className="bg-[#F8F8F5] rounded-xl border-2 border-black p-5 shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Number & Clean Icon */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/15">
                      <span className="font-mono text-sm font-black text-black tracking-wider">
                        {step.step}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="text-[10px] font-mono font-bold uppercase text-[#71717A] tracking-wider mb-1">
                      {step.category}
                    </div>

                    <h3 className="font-black text-base text-black tracking-tight uppercase mb-2">
                      {step.title}
                    </h3>

                    <p className="text-xs text-[#52525B] leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono text-[#71717A]">
                    <span className="font-semibold uppercase">STAGE {step.step}</span>
                    <span className="text-black font-bold uppercase">VERIFIED</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. RESEARCH TEAM SECTION — Instagram-Style Minimal Hover Tags */}
      <TeamSection />
    </div>
  );
};
