import React from 'react';
import { Maximize2, Upload, Activity, FileText } from 'lucide-react';

export type AppRoute =
  | '/'
  | '/results'
  | '/results/x-ray-inspection'
  | '/lowiqbots/health'
  | '/lowiqbots/api-docs';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onStartNewScan: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onStartNewScan,
}) => {
  return (
    <header className={`${currentRoute === '/results' ? '' : 'sticky'} top-0 z-40 bg-white border-b-2 border-black text-black ${currentRoute === '/results' || currentRoute === '/lowiqbots/health' || currentRoute === '/lowiqbots/api-docs' ? 'hidden' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Name Lockup with FP Logo */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 group text-left cursor-pointer select-none"
        >
          <div>
            <div className="text-xl font-black tracking-tight text-black leading-none uppercase">
              Find<span className="text-[#0E7490]">Pneumo</span>
            </div>
            <div className="text-[9px] font-mono font-bold text-[#52525B] tracking-wider uppercase mt-0.5">
              AI CHEST SCREENING
            </div>
          </div>
        </button>

        {/* Right CTA Button Only: Upload X-Ray or View Full Screen */}
        <div className="flex items-center gap-2">
          {currentRoute === '/results' ? (
            <button
              onClick={() => onNavigate('/results/x-ray-inspection')}
              className="px-4 py-2 rounded-lg text-xs font-mono font-black text-black bg-[#F8F8F5] hover:bg-black hover:text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all uppercase cursor-pointer flex items-center gap-2"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen Report</span>
            </button>
          ) : (
            <button
              onClick={onStartNewScan}
              className="px-4 py-2 rounded-lg text-xs font-mono font-black text-white bg-black hover:bg-neutral-800 border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-2 uppercase cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-300" />
              <span>UPLOAD X-RAY</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
