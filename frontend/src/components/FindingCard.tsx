import React from 'react';
import { Target, HelpCircle, ArrowUpRight, Activity, Compass, ShieldCheck } from 'lucide-react';
import { Finding, AnalysisData } from '../types';
import { XrayCanvas } from './XrayCanvas';

interface FindingCardProps {
  finding: Finding;
  analysis: AnalysisData;
  isSelected: boolean;
  onSelect: () => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  analysis,
  isSelected,
  onSelect,
}) => {
  const findingCamera = {
    x: finding.heatmapPoint.x,
    y: finding.heatmapPoint.y,
    zoom: 2.2,
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border-2 border-black overflow-hidden transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
        isSelected
          ? 'shadow-[4px_4px_0px_#0E7490] translate-x-[-1px] translate-y-[-1px]'
          : 'shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000]'
      }`}
    >
      <div>
        {/* Top Header Strip */}
        <div className="p-4 border-b-2 border-black flex items-center justify-between bg-[#F8F8F5]">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 bg-black text-white font-mono text-xs font-black rounded-lg flex items-center justify-center border border-black">
              0{finding.number}
            </span>
            <h4 className="font-black text-sm sm:text-base text-black tracking-tight uppercase">
              {finding.title}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black text-white font-mono font-black text-xs">
            <span className="text-amber-300">{finding.confidence}%</span>
            <span className="text-[10px] text-slate-300">CERTAINTY</span>
          </div>
        </div>

        {/* Synchronized Micro Radiograph Preview Showing Only This Finding's Box & Heatmap */}
        <div className="p-4 bg-[#141517] border-b-2 border-black">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg border-2 border-white/30 bg-black">
            <XrayCanvas
              analysis={analysis}
              activeView="all"
              camera={findingCamera}
              focusedFindingOnly={finding.id}
              showGrid={false}
              interactive={false}
              className="w-full h-full border-none shadow-none"
            />
            {/* Tag on image */}
            <div className="absolute bottom-2 left-2 bg-black/90 text-white rounded border border-white/60 px-2 py-0.5 text-[9px] font-mono font-bold">
              FOV 2.2X · {finding.anatomicalRegion}
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm text-black">
          {/* Damage & Involvement Banner */}
          <div className="p-3 bg-[#FEF3C7] rounded-lg border-2 border-black text-black">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase text-amber-900 mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>TISSUE INVOLVEMENT</span>
            </div>
            <p className="font-black text-xs text-black">
              {finding.damageExtent}
            </p>
          </div>

          {/* Plain English Effect Description */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-black block mb-1 font-mono">
              What Is Happening In This Area:
            </span>
            <p className="text-xs text-[#2B2D32] font-medium leading-relaxed">
              {finding.effectDescription}
            </p>
          </div>

          {/* Damage Assessment */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-black block mb-1 font-mono">
              Clinical Radiologist Note:
            </span>
            <p className="text-xs text-[#2B2D32] font-medium leading-relaxed">
              {finding.damageAssessment}
            </p>
          </div>

          {/* Suggested Question for Doctor */}
          <div className="p-3 bg-[#F8F8F5] rounded-lg border-2 border-black text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-mono font-black text-black text-[11px] uppercase">
              <HelpCircle className="w-3.5 h-3.5 text-[#0E7490]" />
              <span>Ask Your Doctor:</span>
            </div>
            <p className="italic text-[#1E293B] font-semibold leading-relaxed">
              "{finding.physicianQuestion}"
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3.5 bg-[#F8F8F5] border-t-2 border-black flex items-center justify-between text-xs">
        <span className="font-mono text-[10px] text-[#5A5E67] font-bold">
          COORDS: X:{finding.boundingBox.x}% Y:{finding.boundingBox.y}%
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="font-mono text-xs font-black text-black hover:text-[#0E7490] flex items-center gap-1 transition-colors uppercase cursor-pointer"
        >
          <span>{isSelected ? 'INSPECTING IN MAIN VIEWER' : 'FOCUS IN VIEWER'}</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
