import React, { useState, useRef, useEffect } from 'react';
import { AnalysisData, Finding } from '../types';
import { Target, Zap, Eye, Crosshair } from 'lucide-react';

interface XrayCanvasProps {
  analysis: AnalysisData;
  activeView: 'original' | 'attention' | 'boxed' | 'all';
  camera: { x: number; y: number; zoom: number };
  activeFindingId?: string | null;
  focusedFindingOnly?: string | null;
  onSelectFinding?: (findingId: string) => void;
  showScanline?: boolean;
  showGrid?: boolean;
  interactive?: boolean;
  className?: string;
  onZoomChange?: (newZoom: number) => void;
  onResetZoom?: () => void;
}

export const XrayCanvas: React.FC<XrayCanvasProps> = ({
  analysis,
  activeView,
  camera,
  activeFindingId,
  focusedFindingOnly = null,
  onSelectFinding,
  showScanline = false,
  showGrid = true,
  interactive = true,
  className = '',
  onZoomChange,
  onResetZoom,
}) => {
  const [hoveredFinding, setHoveredFinding] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset pan offset whenever camera target coordinates change
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [camera.x, camera.y]);

  // Compute smooth camera zoom and pan transforms
  const zoom = Math.max(1, camera.zoom);
  const baseX = (50 - camera.x) * (zoom - 1);
  const baseY = (50 - camera.y) * (zoom - 1);
  const translateX = baseX + panOffset.x;
  const translateY = baseY + panOffset.y;

  const isLobar = analysis.scanPresetId === 'lobar_pneumonia';
  const isInterstitial = analysis.scanPresetId === 'interstitial_pattern';
  const isCustom = Boolean(analysis.customImageUri);

  // Filter findings if focusedFindingOnly is set
  const displayedFindings = focusedFindingOnly
    ? analysis.findings.filter((f) => f.id === focusedFindingOnly)
    : analysis.findings;

  const focusedFinding = focusedFindingOnly
    ? analysis.findings.find((f) => f.id === focusedFindingOnly)
    : null;

  // Mouse drag panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    if (!onZoomChange) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    const newZoom = Math.min(3.0, Math.max(1.0, parseFloat((zoom + delta).toFixed(2))));
    onZoomChange(newZoom);
  };

  // Box color styling helper in Clean Aesthetic Brutalism
  const getBoxStyle = (finding: Finding, isActive: boolean) => {
    switch (finding.boxColor) {
      case 'red':
        return {
          border: 'border-2 border-rose-500',
          bg: isActive ? 'bg-rose-500/25' : 'bg-rose-500/10',
          badgeBg: 'bg-rose-600',
          badgeText: 'text-white',
          glow: isActive ? 'shadow-[0_0_20px_rgba(244,63,94,0.5)]' : '',
          corner: 'border-rose-400',
          accent: '#F43F5E',
        };
      case 'amber':
        return {
          border: 'border-2 border-amber-400',
          bg: isActive ? 'bg-amber-400/25' : 'bg-amber-400/10',
          badgeBg: 'bg-amber-500',
          badgeText: 'text-black font-bold',
          glow: isActive ? 'shadow-[0_0_20px_rgba(251,191,36,0.5)]' : '',
          corner: 'border-amber-300',
          accent: '#F59E0B',
        };
      case 'green':
        return {
          border: 'border-2 border-emerald-400',
          bg: isActive ? 'bg-emerald-400/25' : 'bg-emerald-400/10',
          badgeBg: 'bg-emerald-600',
          badgeText: 'text-white font-bold',
          glow: isActive ? 'shadow-[0_0_20px_rgba(16,185,129,0.5)]' : '',
          corner: 'border-emerald-300',
          accent: '#10B981',
        };
      case 'white':
      default:
        return {
          border: 'border-2 border-cyan-400',
          bg: isActive ? 'bg-cyan-400/25' : 'bg-cyan-400/10',
          badgeBg: 'bg-cyan-500',
          badgeText: 'text-black font-bold',
          glow: isActive ? 'shadow-[0_0_20px_rgba(6,182,212,0.5)]' : '',
          corner: 'border-cyan-300',
          accent: '#06B6D4',
        };
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`relative overflow-hidden bg-[#07090D] select-none border-2 border-black ${
        zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
      } ${className}`}
      style={{ aspectRatio: '1.15 / 1', maxHeight: '520px' }}
    >
      {/* 60FPS Hardware Accelerated Viewport Transform Stage */}
      <div
        className="w-full h-full relative transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
        style={{
          transform: `translate(${translateX}%, ${translateY}%) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* Layer 1: Base Clinical Radiograph */}
        {isCustom && analysis.customImageUri ? (
          <img
            src={analysis.customImageUri}
            alt="Chest Radiograph"
            className="w-full h-full object-cover filter contrast-[1.15] brightness-[0.98] grayscale"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg
            viewBox="0 0 600 600"
            className="w-full h-full block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="lungFieldR" cx="35%" cy="50%" r="48%">
                <stop offset="0%" stopColor="#040507" />
                <stop offset="65%" stopColor="#0B0E12" />
                <stop offset="100%" stopColor="#1B1E24" />
              </radialGradient>
              <radialGradient id="lungFieldL" cx="65%" cy="50%" r="48%">
                <stop offset="0%" stopColor="#040507" />
                <stop offset="65%" stopColor="#0B0E12" />
                <stop offset="100%" stopColor="#1B1E24" />
              </radialGradient>

              {/* Lobar Airspace Opacity */}
              <radialGradient id="lobarConsolidation" cx="72%" cy="74%" r="35%">
                <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.92" />
                <stop offset="30%" stopColor="#CBD5E1" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#94A3B8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#334155" stopOpacity="0.1" />
              </radialGradient>

              {/* Interstitial Haziness */}
              <radialGradient id="interstitialHaze" cx="50%" cy="70%" r="50%">
                <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.65" />
                <stop offset="45%" stopColor="#94A3B8" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#1E293B" stopOpacity="0.05" />
              </radialGradient>

              <radialGradient id="perihilarGlow" cx="65%" cy="46%" r="28%">
                <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.7" />
                <stop offset="60%" stopColor="#64748B" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>

              <linearGradient id="boneGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#64748B" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#94A3B8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#64748B" stopOpacity="0.6" />
              </linearGradient>

              <linearGradient id="cardiacGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#64748B" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#94A3B8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#475569" stopOpacity="0.7" />
              </linearGradient>
            </defs>

            {/* Dark Thoracic Background */}
            <rect width="600" height="600" fill="#06080B" />

            {/* Clavicles & Spine Column */}
            <rect x="286" y="40" width="28" height="520" fill="url(#boneGrad)" rx="6" opacity="0.8" />
            <path
              d="M 120 110 Q 200 95 300 120 Q 400 95 480 110 Q 480 125 300 135 Q 120 125 120 110 Z"
              fill="url(#boneGrad)"
              opacity="0.85"
            />

            {/* Rib Cage Contours (Bilateral Thoracic Grid) */}
            <g opacity="0.32" stroke="#94A3B8" strokeWidth="11" strokeLinecap="round" fill="none">
              <path d="M 290 155 Q 170 170 125 240" />
              <path d="M 310 155 Q 430 170 475 240" />
              <path d="M 290 195 Q 160 215 110 300" />
              <path d="M 310 195 Q 440 215 490 300" />
              <path d="M 290 240 Q 155 265 105 365" />
              <path d="M 310 240 Q 445 265 495 365" />
              <path d="M 290 290 Q 160 325 110 435" />
              <path d="M 310 290 Q 440 325 490 435" />
              <path d="M 290 345 Q 170 395 125 500" />
              <path d="M 310 345 Q 430 395 475 500" />
            </g>

            {/* Left & Right Lung Parenchyma Fields */}
            <path
              d="M 270 145 C 240 145 160 170 130 260 C 105 340 115 450 140 505 C 190 520 250 500 270 470 Z"
              fill="url(#lungFieldR)"
            />
            <path
              d="M 330 145 C 360 145 440 170 470 260 C 495 340 485 450 460 505 C 410 520 350 500 330 470 Z"
              fill="url(#lungFieldL)"
            />

            {/* Central Mediastinum & Cardiac Silhouette */}
            <path
              d="M 270 180 C 270 180 250 280 215 350 C 185 410 220 475 300 485 C 360 485 390 445 375 370 C 360 290 330 180 330 180 Z"
              fill="url(#cardiacGrad)"
            />

            {/* Costophrenic Angles & Diaphragm Domes */}
            <path
              d="M 100 525 Q 190 485 285 500"
              stroke="#CBD5E1"
              strokeWidth="9"
              fill="none"
              opacity="0.75"
            />
            <path
              d="M 315 500 Q 410 485 500 525"
              stroke="#CBD5E1"
              strokeWidth="9"
              fill="none"
              opacity="0.75"
            />

            {/* Case Specific Pathology Renderings */}
            {isLobar && (
              <g>
                <circle cx="430" cy="415" r="95" fill="url(#lobarConsolidation)" filter="blur(6px)" />
                <ellipse cx="440" cy="435" rx="65" ry="45" fill="#FFFFFF" opacity="0.65" filter="blur(8px)" />
                {/* Air bronchogram streaks */}
                <path d="M 410 390 Q 430 420 445 455" stroke="#000" strokeWidth="2.5" opacity="0.45" fill="none" />
                <path d="M 430 410 Q 445 435 465 460" stroke="#000" strokeWidth="2" opacity="0.4" fill="none" />
              </g>
            )}

            {isInterstitial && (
              <g>
                <circle cx="300" cy="360" r="170" fill="url(#interstitialHaze)" filter="blur(9px)" />
                <circle cx="210" cy="330" r="75" fill="url(#perihilarGlow)" filter="blur(7px)" />
                <circle cx="390" cy="330" r="75" fill="url(#perihilarGlow)" filter="blur(7px)" />
                {/* Reticular web markings */}
                <g stroke="#E2E8F0" strokeWidth="1.2" opacity="0.45" fill="none">
                  <path d="M 180 300 Q 220 330 250 310 T 290 350" />
                  <path d="M 350 300 Q 380 340 420 320 T 450 360" />
                  <path d="M 190 360 Q 230 380 260 410" />
                  <path d="M 340 370 Q 380 395 420 420" />
                </g>
              </g>
            )}

            {/* Orientation Markers */}
            <text x="35" y="55" fill="#FFFFFF" opacity="0.9" fontSize="22" fontWeight="800" fontFamily="monospace">
              R
            </text>
            <text x="545" y="55" fill="#94A3B8" opacity="0.6" fontSize="18" fontWeight="700" fontFamily="monospace">
              L
            </text>
            <text x="35" y="575" fill="#64748B" opacity="0.7" fontSize="11" fontFamily="monospace">
              PA CHEST ERECT
            </text>
            <text x="460" y="575" fill="#64748B" opacity="0.7" fontSize="11" fontFamily="monospace">
              {analysis.id}
            </text>
          </svg>
        )}

        {/* Layer 2: Anatomical Calibration Grid */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="w-full h-full opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #38BDF8 1px, transparent 1px), linear-gradient(to right, #38BDF8 0.5px, transparent 0.5px), linear-gradient(to bottom, #38BDF8 0.5px, transparent 0.5px)',
                backgroundSize: '40px 40px, 40px 40px, 40px 40px',
              }}
            />
            {/* Center Axis Marker */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-50">
              <span className="w-[1px] h-8 bg-cyan-400" />
              <span className="text-[9px] font-mono font-bold text-cyan-300 mt-1">CENTER AXIS</span>
            </div>
          </div>
        )}

        {/* Layer 3: Authentic Grad-CAM Thermal Topological Attention Heatmap */}
        {(activeView === 'attention' || activeView === 'all') && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              maskImage: focusedFinding
                ? `radial-gradient(circle at ${focusedFinding.heatmapPoint.x}% ${focusedFinding.heatmapPoint.y}%, black 0%, black ${Math.max(focusedFinding.boundingBox.width, focusedFinding.boundingBox.height) * 0.75}%, transparent ${Math.max(focusedFinding.boundingBox.width, focusedFinding.boundingBox.height) * 1.5}%)`
                : undefined,
              WebkitMaskImage: focusedFinding
                ? `radial-gradient(circle at ${focusedFinding.heatmapPoint.x}% ${focusedFinding.heatmapPoint.y}%, black 0%, black ${Math.max(focusedFinding.boundingBox.width, focusedFinding.boundingBox.height) * 0.75}%, transparent ${Math.max(focusedFinding.boundingBox.width, focusedFinding.boundingBox.height) * 1.5}%)`
                : undefined,
            }}
          >
            {analysis.gradcamUri ? (
              <img
                src={analysis.gradcamUri}
                alt="Authentic Grad-CAM++ Attention"
                className="w-full h-full object-cover mix-blend-screen opacity-90 transition-opacity duration-500 pointer-events-none"
              />
            ) : (
              displayedFindings.map((f) => {
                const { x, y, radius, intensity } = f.heatmapPoint;
                const isSelected = activeFindingId === f.id || hoveredFinding === f.id;
                const effectiveRadius = radius * (isSelected ? 2.5 : 2.2);

                return (
                  <div
                    key={`heat-${f.id}`}
                    className="absolute rounded-full transition-all duration-500 mix-blend-screen"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${effectiveRadius}%`,
                      height: `${effectiveRadius}%`,
                      transform: 'translate(-50%, -50%)',
                      background: `radial-gradient(circle, 
                        rgba(255, 255, 255, ${intensity * 0.98}) 0%,
                        rgba(244, 63, 94, ${intensity * 0.92}) 24%, 
                        rgba(245, 158, 11, ${intensity * 0.82}) 48%, 
                        rgba(6, 182, 212, ${intensity * 0.55}) 72%, 
                        rgba(2, 132, 199, ${intensity * 0.22}) 88%,
                        transparent 100%)`,
                      filter: 'blur(10px)',
                      opacity: isSelected ? 1 : 0.88,
                    }}
                  />
                );
              })
            )}

            {/* Targeted Reticle Markers for Active / Hovered Findings */}
            {displayedFindings.map((f) => {
              const { x, y } = f.heatmapPoint;
              const isSelected = activeFindingId === f.id || hoveredFinding === f.id;
              if (!isSelected && activeView !== 'attention') return null;

              return (
                <div
                  key={`heat-marker-${f.id}`}
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="w-10 h-10 rounded-full border border-cyan-300/60 animate-ping absolute -top-5 -left-5 pointer-events-none" />
                  <div className="w-6 h-6 rounded-full border border-white/80 absolute -top-3 -left-3 pointer-events-none" />
                  <div className="relative flex items-center justify-center">
                    <span className="w-5 h-[1.5px] bg-white shadow-[0_0_8px_#FFF]" />
                    <span className="h-5 w-[1.5px] bg-white shadow-[0_0_8px_#FFF] absolute" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Layer 4: Precision Bounding Box & HUD Diagnostic Overlay */}
        {(activeView === 'boxed' || activeView === 'all') && (
          <div className="absolute inset-0 pointer-events-auto">
            {displayedFindings.map((f) => {
              const { x, y, width, height } = f.boundingBox;
              const isSelected = activeFindingId === f.id;
              const isHovered = hoveredFinding === f.id;
              const active = isSelected || isHovered;
              const style = getBoxStyle(f, active);

              return (
                <div
                  key={`box-${f.id}`}
                  onClick={() => interactive && onSelectFinding && onSelectFinding(f.id)}
                  onMouseEnter={() => interactive && setHoveredFinding(f.id)}
                  onMouseLeave={() => interactive && setHoveredFinding(null)}
                  className={`absolute transition-all duration-300 ${
                    interactive ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                >
                  {/* Outer Bounding Box Frame */}
                  <div
                    className={`w-full h-full relative transition-all duration-200 ${style.border} ${style.bg} ${style.glow}`}
                  >
                    {/* Precision Reticle Corner Brackets */}
                    <span className={`absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 ${style.corner}`} />
                    <span className={`absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 ${style.corner}`} />
                    <span className={`absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 ${style.corner}`} />
                    <span className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 ${style.corner}`} />

                    {/* Edge Center Tick Marks */}
                    <span className="absolute top-1/2 -left-1 w-2 h-[1px] bg-white/70" />
                    <span className="absolute top-1/2 -right-1 w-2 h-[1px] bg-white/70" />
                    <span className="absolute left-1/2 -top-1 h-2 w-[1px] bg-white/70" />
                    <span className="absolute left-1/2 -bottom-1 h-2 w-[1px] bg-white/70" />

                    {/* Header Label Tag with Finding Number & Percentage */}
                    <div className="absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-black text-white border-2 border-black whitespace-nowrap z-20 shadow-[2px_2px_0px_#000]">
                      <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-neutral-300">
                        FINDING 0{f.number}
                      </span>
                      <span className="text-[11px] font-mono font-black text-amber-300 tabular-nums">
                        {f.confidence}%
                      </span>
                    </div>

                    {/* Region / Anatomy Tag on Active / Selected */}
                    {active && (
                      <div className="absolute -bottom-7 left-0 bg-white text-black px-2 py-0.5 border-2 border-black text-[9px] font-mono font-bold whitespace-nowrap z-20 shadow-[2px_2px_0px_#000] uppercase">
                        {f.title} · {f.damageExtent}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Layer 5: High-Tech Laser Scan Wavefront & Coordinate Sweep */}
      {showScanline && (
        <div className="absolute inset-x-0 pointer-events-none z-20 animate-scanline">
          {/* Main Laser Beam */}
          <div className="h-[2px] w-full bg-cyan-400 shadow-[0_0_16px_#06B6D4,0_0_30px_#06B6D4]" />
          {/* Trailing Illuminating Glow Wavefront */}
          <div className="h-20 w-full bg-gradient-to-t from-cyan-400/25 via-cyan-400/10 to-transparent -translate-y-full" />
          {/* Live HUD Coordinate Tracker on Scanline */}
          <div className="absolute right-4 -top-6 bg-black text-cyan-300 border border-cyan-400 px-2 py-0.5 text-[9px] font-mono font-bold shadow-[2px_2px_0px_#000] uppercase">
            NEURAL SCAN // INFERENCE SWEEP
          </div>
        </div>
      )}

      {/* Top Left Viewport Watermark & Active Modality */}
      <div className="absolute top-3 left-3 pointer-events-none z-10 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 bg-black text-white px-2 py-0.5 border border-white/40 text-[9px] font-mono font-bold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>VIEW: {activeView.toUpperCase()}</span>
        </div>
        <span className="text-[9px] font-mono text-cyan-300 bg-black px-2 py-0.5 border border-white/30 font-medium">
          ZOOM {zoom.toFixed(1)}X · PAN ({camera.x}%, {camera.y}%)
        </span>
      </div>

      {/* Bottom Right PACS Zoom HUD & Resolution Stamp */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 z-30">
        {/* Interactive Floating Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-1 rounded-md border border-white/30 text-white text-[10px] font-mono pointer-events-auto shadow-md">
          <span className="text-cyan-400 font-bold">MAG:</span>
          <span className="font-mono font-black text-white">{Math.round(zoom * 100)}%</span>
          {onZoomChange && (
            <div className="flex items-center gap-1 ml-1 border-l border-white/25 pl-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomChange(Math.max(1.0, parseFloat((zoom - 0.25).toFixed(2))));
                }}
                title="Zoom Out (-0.25X)"
                className="w-4 h-4 rounded bg-white/10 hover:bg-white hover:text-black flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
              >
                -
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomChange(Math.min(3.0, parseFloat((zoom + 0.25).toFixed(2))));
                }}
                title="Zoom In (+0.25X)"
                className="w-4 h-4 rounded bg-white/10 hover:bg-white hover:text-black flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
              >
                +
              </button>
            </div>
          )}
          {zoom > 1 && onResetZoom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResetZoom();
              }}
              title="Reset Zoom (Fit to Screen)"
              className="ml-1 text-[9px] font-bold text-neutral-300 hover:text-white bg-white/20 hover:bg-white/30 px-1 py-0.5 rounded uppercase cursor-pointer"
            >
              FIT
            </button>
          )}
        </div>

        <span className="hidden sm:inline-block text-[9px] font-mono text-neutral-400 bg-black/80 px-2 py-1 rounded-md border border-white/20 font-bold uppercase tracking-wider">
          DICOM CALIBRATED
        </span>
      </div>
    </div>
  );
};
