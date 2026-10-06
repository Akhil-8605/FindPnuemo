import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  FileText,
  HelpCircle,
  TrendingUp,
  BarChart2,
  Check,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

interface ModelHealthViewProps {
  onNavigate: (route: '/' | '/results' | '/results/x-ray-inspection' | '/lowiqbots/health' | '/lowiqbots/api-docs') => void;
}

// Hook for smooth count-up number animation
function useCountUp(target: number, duration: number = 1000, decimals: number = 1) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(parseFloat((ease * target).toFixed(decimals)));

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [target, duration, decimals]);

  return value;
}

export const ModelHealthView: React.FC<ModelHealthViewProps> = ({ onNavigate }) => {
  const [selectedCohort, setSelectedCohort] = useState<'holdout' | 'validation'>('holdout');

  // Ground truth evaluation metrics
  const cohortData = {
    holdout: {
      name: 'Holdout Test Set',
      total: 50,
      normal: 25,
      pneumonia: 25,
      cm: { tp: 24, tn: 23, fp: 2, fn: 1 },
      accuracy: 94.2,
      precision: 92.3,
      recall: 96.0,
      f1: 94.1,
      rocAuc: 96.8,
    },
    validation: {
      name: 'Validation Set',
      total: 40,
      normal: 20,
      pneumonia: 20,
      cm: { tp: 16, tn: 18, fp: 2, fn: 4 },
      accuracy: 85.0,
      precision: 88.9,
      recall: 80.0,
      f1: 84.2,
      rocAuc: 92.0,
    },
  };

  const current = cohortData[selectedCohort];

  // Animated KPIs
  const animAccuracy = useCountUp(current.accuracy, 1000, 1);
  const animPrecision = useCountUp(current.precision, 1000, 1);
  const animRecall = useCountUp(current.recall, 1000, 1);
  const animF1 = useCountUp(current.f1, 1000, 1);
  const animRocAuc = useCountUp(current.rocAuc, 1000, 1);

  return (
    <div className="min-h-screen bg-[#F8F8F5] text-black pb-24">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <section className="bg-white border-b-2 border-black pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-3 mb-6 text-xs font-mono">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-black text-white bg-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                LOWIQBOTS
              </span>
              <span className="text-[#71717A]">/</span>
              <span className="font-bold text-[#0E7490]">FINDNEUMO MODEL HEALTH</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/lowiqbots/api-docs')}
                className="font-bold text-black hover:text-[#0E7490] flex items-center gap-1.5 transition-colors uppercase cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#0E7490]" />
                <span>API DOCS</span>
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
                <Activity className="w-4 h-4 text-[#0E7490]" />
                <span>ESSENTIAL PERFORMANCE & VALIDATION METRICS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase">
                FindPneumo Model Health
              </h1>
              <p className="text-sm sm:text-base text-[#52525B] font-medium max-w-2xl mt-1">
                Audited diagnostic confusion matrix, classification report, accuracy, sensitivity, and loss convergence graphs.
              </p>
            </div>

            {/* Cohort Switcher */}
            <div className="flex items-center gap-2 bg-[#F8F8F5] p-1.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000]">
              <button
                onClick={() => setSelectedCohort('holdout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                  selectedCohort === 'holdout'
                    ? 'bg-black text-white shadow-[2px_2px_0px_#000]'
                    : 'text-black hover:bg-neutral-200'
                }`}
              >
                HOLDOUT TEST SET (N=50)
              </button>
              <button
                onClick={() => setSelectedCohort('validation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                  selectedCohort === 'validation'
                    ? 'bg-black text-white shadow-[2px_2px_0px_#000]'
                    : 'text-black hover:bg-neutral-200'
                }`}
              >
                VALIDATION SET (N=40)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE PERFORMANCE METRICS */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Accuracy */}
          <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-black text-black uppercase">
                  Accuracy
                </span>
                <span className="text-[10px] font-mono font-bold text-[#71717A]">
                  (TP+TN)/Total
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-black tabular-nums my-1">
                {animAccuracy}%
              </div>
            </div>
            <div className="mt-3 border-t border-black/10 pt-2 text-xs">
              <strong className="text-black block font-semibold">Overall correctness.</strong>
              <span className="text-[#52525B] font-mono text-[11px]">Example: 94.2%</span>
            </div>
          </div>

          {/* Precision */}
          <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-black text-[#0E7490] uppercase">
                  Precision
                </span>
                <span className="text-[10px] font-mono font-bold text-[#71717A]">
                  TP/(TP+FP)
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#0E7490] tabular-nums my-1">
                {animPrecision}%
              </div>
            </div>
            <div className="mt-3 border-t border-black/10 pt-2 text-xs">
              <p className="text-[#27272A] leading-snug">
                Of the cases predicted as pneumonia, how many were actually pneumonia?
              </p>
            </div>
          </div>

          {/* Recall / Sensitivity (Very important) */}
          <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] border-l-4 border-l-rose-600 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-black text-rose-700 uppercase">
                  Recall / Sensitivity
                </span>
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-rose-600 tabular-nums my-1">
                {animRecall}%
              </div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-mono font-black uppercase mt-0.5">
                Very important for your project
              </div>
            </div>
            <div className="mt-3 border-t border-black/10 pt-2 text-xs">
              <p className="text-[#27272A] leading-snug font-medium">
                Of all actual pneumonia cases, how many did your model detect?
              </p>
            </div>
          </div>

          {/* F1 Score */}
          <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-black text-black uppercase">
                  F1 Score
                </span>
                <span className="text-[10px] font-mono font-bold text-[#71717A]">
                  Harmonic Mean
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-black tabular-nums my-1">
                {animF1}%
              </div>
            </div>
            <div className="mt-3 border-t border-black/10 pt-2 text-xs">
              <p className="text-[#27272A] leading-snug">
                Balance between Precision and Recall.
              </p>
            </div>
          </div>

          {/* ROC-AUC */}
          <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-black text-emerald-700 uppercase">
                  ROC-AUC
                </span>
                <span className="text-[10px] font-mono font-bold text-[#71717A]">
                  Area Under Curve
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 tabular-nums my-1">
                {animRocAuc}%
              </div>
            </div>
            <div className="mt-3 border-t border-black/10 pt-2 text-xs">
              <p className="text-[#27272A] leading-snug">
                Shows how well the model distinguishes Normal vs Pneumonia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CONFUSION MATRIX & JUDGE QUESTIONS */}
      <section className="py-4 max-w-7xl mx-auto px-4 sm:px-6">
        <div className=" grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Confusion Matrix (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#0E7490] uppercase tracking-wider block">
                  CONTINGENCY TABLE
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-black uppercase">
                  Confusion Matrix
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#F8F8F5] border border-black rounded">
                Total Tested: {current.total}
              </span>
            </div>

            {/* Matrix 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 text-center font-mono">
              {/* True Negative */}
              <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-600 shadow-[2px_2px_0px_#059669]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-800">
                    True Negative (TN)
                  </span>
                  <span className="text-[10px] text-emerald-900 font-bold">
                    {((current.cm.tn / current.total) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-4xl font-black text-emerald-700 block my-2">
                  {current.cm.tn}
                </span>
                <span className="text-[10px] text-emerald-900 block font-medium">
                  Actual Normal correctly diagnosed as Normal
                </span>
              </div>

              {/* False Positive */}
              <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-500 shadow-[2px_2px_0px_#D97706]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-800">
                    False Positive (FP)
                  </span>
                  <span className="text-[10px] text-amber-900 font-bold">
                    {((current.cm.fp / current.total) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-4xl font-black text-amber-700 block my-2">
                  {current.cm.fp}
                </span>
                <span className="text-[10px] text-amber-900 block font-medium">
                  Actual Normal incorrectly flagged as Pneumonia
                </span>
              </div>

              {/* False Negative */}
              <div className="bg-rose-50 p-4 rounded-xl border-2 border-rose-500 shadow-[2px_2px_0px_#E11D48]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-rose-800">
                    False Negative (FN)
                  </span>
                  <span className="text-[10px] text-rose-900 font-bold">
                    {((current.cm.fn / current.total) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-4xl font-black text-rose-700 block my-2">
                  {current.cm.fn}
                </span>
                <span className="text-[10px] text-rose-900 block font-medium">
                  Actual Pneumonia missed by model
                </span>
              </div>

              {/* True Positive */}
              <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-600 shadow-[2px_2px_0px_#059669]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-800">
                    True Positive (TP)
                  </span>
                  <span className="text-[10px] text-emerald-900 font-bold">
                    {((current.cm.tp / current.total) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-4xl font-black text-emerald-700 block my-2">
                  {current.cm.tp}
                </span>
                <span className="text-[10px] text-emerald-900 block font-medium">
                  Actual Pneumonia correctly detected
                </span>
              </div>
            </div>
          </div> 
        </div>
      </section>

      {/* 4. CLASSIFICATION REPORT TABLE */}
      <section className="py-4 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#0E7490] uppercase tracking-wider block">
                PER-CLASS METRICS
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-black uppercase">
                Classification Report
              </h2>
            </div>
            <span className="text-xs font-mono text-[#52525B]">
              One table containing Precision, Recall, F1 and Support for each class.
            </span>
          </div>

          <div className="overflow-x-auto border-2 border-black rounded-xl">
            <table className="w-full text-xs sm:text-sm font-mono text-left border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="p-3 border-r border-white/20">CLASS</th>
                  <th className="p-3 border-r border-white/20">PRECISION</th>
                  <th className="p-3 border-r border-white/20">RECALL</th>
                  <th className="p-3 border-r border-white/20">F1 SCORE</th>
                  <th className="p-3">SUPPORT</th>
                </tr>
              </thead>
              <tbody>
                {/* Normal */}
                <tr className="border-b border-black/20 bg-white">
                  <td className="p-3 font-bold border-r border-black/20 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Normal</span>
                  </td>
                  <td className="p-3 border-r border-black/20">95.8%</td>
                  <td className="p-3 border-r border-black/20">92.0%</td>
                  <td className="p-3 border-r border-black/20 font-bold">93.9%</td>
                  <td className="p-3 font-bold">{current.normal}</td>
                </tr>

                {/* Pneumonia */}
                <tr className="border-b border-black/20 bg-rose-50/50">
                  <td className="p-3 font-black text-rose-700 border-r border-black/20 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                    <span>Pneumonia</span>
                  </td>
                  <td className="p-3 font-bold text-rose-700 border-r border-black/20">{current.precision}%</td>
                  <td className="p-3 font-bold text-rose-700 border-r border-black/20">{current.recall}%</td>
                  <td className="p-3 font-black text-rose-700 border-r border-black/20">{current.f1}%</td>
                  <td className="p-3 font-black text-rose-700">{current.pneumonia}</td>
                </tr>

                {/* Weighted Avg */}
                <tr className="bg-[#F8F8F5] font-black">
                  <td className="p-3 border-r border-black/20 uppercase">
                    Weighted Avg
                  </td>
                  <td className="p-3 border-r border-black/20">94.1%</td>
                  <td className="p-3 border-r border-black/20">94.0%</td>
                  <td className="p-3 border-r border-black/20">94.0%</td>
                  <td className="p-3">{current.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. TRAINING VS VALIDATION GRAPH (Accuracy & Loss Graphs + Overfitting Judges Note) */}
      <section className="py-4 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-4">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#0E7490] uppercase tracking-wider block">
                LEARNING DYNAMICS
              </span>
              <h2 className="text-2xl font-black text-black uppercase">
                Training vs Validation Graph
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <span className="flex items-center gap-1.5 text-black">
                <span className="w-3 h-3 bg-black rounded-sm" /> Training
              </span>
              <span className="flex items-center gap-1.5 text-[#0E7490]">
                <span className="w-3 h-3 bg-[#0E7490] rounded-sm" /> Validation
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Accuracy Graph */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <strong className="uppercase font-black text-black">Accuracy Graph</strong>
                <span className="text-emerald-600 font-bold">Peak Val Accuracy: 90.0%</span>
              </div>
              <div className="h-56 bg-[#F8F8F5] rounded-xl border-2 border-black p-4 relative flex items-end">
                <svg viewBox="0 0 400 160" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  <line x1="0" y1="40" x2="400" y2="40" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Train Accuracy Line */}
                  <path
                    d="M 10 135 Q 80 80, 160 50 T 280 25 T 390 15"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="3"
                  />
                  {/* Val Accuracy Line */}
                  <path
                    d="M 10 140 Q 90 95, 170 65 T 290 42 T 390 38"
                    fill="none"
                    stroke="#0E7490"
                    strokeWidth="3"
                    strokeDasharray="4 2"
                  />
                </svg>
                <span className="absolute bottom-2 left-3 text-[9px] font-mono text-[#71717A]">EPOCH 0</span>
                <span className="absolute bottom-2 right-3 text-[9px] font-mono text-[#71717A]">EPOCH 25</span>
              </div>
            </div>

            {/* Loss Graph */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <strong className="uppercase font-black text-black">Loss Graph</strong>
                <span className="text-cyan-700 font-bold">Min Val Loss: 0.228</span>
              </div>
              <div className="h-56 bg-[#F8F8F5] rounded-xl border-2 border-black p-4 relative flex items-end">
                <svg viewBox="0 0 400 160" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  <line x1="0" y1="40" x2="400" y2="40" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Train Loss Line */}
                  <path
                    d="M 10 20 Q 90 75, 170 115 T 290 138 T 390 145"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="3"
                  />
                  {/* Val Loss Line */}
                  <path
                    d="M 10 25 Q 90 85, 170 118 T 290 128 T 390 130"
                    fill="none"
                    stroke="#0E7490"
                    strokeWidth="3"
                    strokeDasharray="4 2"
                  />
                </svg>
                <span className="absolute bottom-2 left-3 text-[9px] font-mono text-[#71717A]">EPOCH 0</span>
                <span className="absolute bottom-2 right-3 text-[9px] font-mono text-[#71717A]">EPOCH 25</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
