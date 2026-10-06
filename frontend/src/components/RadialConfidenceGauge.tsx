import React, { useEffect, useState } from 'react';

interface RadialConfidenceGaugeProps {
  targetScore: number; // 0 - 100
  status: 'findings_detected' | 'unremarkable';
  category: 'higher' | 'moderate' | 'lower';
  className?: string;
}

export const RadialConfidenceGauge: React.FC<RadialConfidenceGaugeProps> = ({
  targetScore,
  status,
  category,
  className = '',
}) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1600;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(easeOut * targetScore));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    const frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetScore]);

  // Geometry
  const center = 110;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135; // degrees
  const sweepAngle = 270; // degrees
  const arcLength = circumference * (sweepAngle / 360);
  const strokeDashoffset = arcLength - (arcLength * displayScore) / 100;

  // Tip beacon position for orbiting particle
  const currentAngle = startAngle + (sweepAngle * displayScore) / 100;
  const currentRad = (currentAngle * Math.PI) / 180;
  const beaconX = center + radius * Math.cos(currentRad);
  const beaconY = center + radius * Math.sin(currentRad);

  // Sub-calibrated telemetry ticks (36 ticks)
  const totalTicks = 36;
  const ticks = Array.from({ length: totalTicks }).map((_, i) => {
    const angle = startAngle + (i / (totalTicks - 1)) * sweepAngle;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 6 === 0;
    const isMedium = i % 3 === 0;
    const innerR = isMajor ? 62 : isMedium ? 65 : 67;
    const outerR = 72;
    const x1 = center + innerR * Math.cos(rad);
    const y1 = center + innerR * Math.sin(rad);
    const x2 = center + outerR * Math.cos(rad);
    const y2 = center + outerR * Math.sin(rad);
    const tickScore = (i / (totalTicks - 1)) * 100;
    const isActive = tickScore <= displayScore;
    return { x1, y1, x2, y2, isActive, isMajor };
  });

  const accentColor =
    category === 'higher' ? '#F43F5E' : category === 'moderate' ? '#F59E0B' : '#10B981';
  const glowColor =
    category === 'higher'
      ? 'rgba(244, 63, 94, 0.45)'
      : category === 'moderate'
      ? 'rgba(245, 158, 11, 0.45)'
      : 'rgba(16, 185, 129, 0.45)';

  return (
    <div
      className={`bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_#000] p-5 sm:p-6 transition-all ${className}`}
    >
      {/* Top Header Tag */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest uppercase text-[#52525B] font-bold block">
            NEURAL CONFIDENCE METRIC
          </span>
          <h4 className="text-sm font-black text-black tracking-tight uppercase">
            AI Screening Certainty
          </h4>
        </div>
        <div className="px-2.5 py-1 rounded-md border-2 border-black text-xs font-mono font-black flex items-center gap-1.5 bg-black text-white shadow-[2px_2px_0px_#000]">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: accentColor }}
          />
          <span className="uppercase">
            {category === 'higher'
              ? 'Elevated'
              : category === 'moderate'
              ? 'Moderate'
              : 'Clear'}
          </span>
        </div>
      </div>

      {/* High-Tech Circular Instrument Visual */}
      <div className="flex flex-col items-center justify-center relative py-1">
        <svg viewBox="0 0 220 220" className="w-48 h-48 sm:w-52 sm:h-52 drop-shadow-sm">
          <defs>
            {/* Glowing neon stroke gradient */}
            <linearGradient id="gaugeNeonGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="45%" stopColor="#38BDF8" />
              <stop offset="85%" stopColor={accentColor} />
              <stop offset="100%" stopColor={accentColor} />
            </linearGradient>

            {/* Glowing drop shadow filter */}
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle inner radial gradient */}
            <radialGradient id="innerDialGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={glowColor} stopOpacity="0.18" />
              <stop offset="70%" stopColor={glowColor} stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Inner ambient glow disc */}
          <circle cx={center} cy={center} r="60" fill="url(#innerDialGlow)" />

          {/* Background Outer Ring Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="11"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(${startAngle} ${center} ${center})`}
          />

          {/* Inner Dashed Telemetry Guide Track */}
          <circle
            cx={center}
            cy={center}
            r={radius - 12}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.75"
          />

          {/* Calibrated Telemetry Ticks */}
          {ticks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isActive ? (t.isMajor ? '#000000' : accentColor) : '#E2E8F0'}
              strokeWidth={t.isMajor ? 2.5 : 1.5}
              strokeLinecap="round"
              className="transition-colors duration-200"
            />
          ))}

          {/* Active Glowing Value Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#gaugeNeonGradient)"
            strokeWidth="11"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(${startAngle} ${center} ${center})`}
            filter="url(#gaugeGlow)"
            className="transition-all duration-300"
          />

          {/* Orbiting Beacon Particle at Arc Tip */}
          {displayScore > 2 && (
            <g>
              <circle
                cx={beaconX}
                cy={beaconY}
                r="6.5"
                fill="#FFFFFF"
                stroke={accentColor}
                strokeWidth="2.5"
                className="animate-pulse"
              />
              <circle
                cx={beaconX}
                cy={beaconY}
                r="3"
                fill={accentColor}
              />
            </g>
          )}

          {/* Central Numeric Display */}
          <g transform={`translate(${center}, ${center - 2})`} textAnchor="middle">
            <text
              y="-12"
              className="text-[9px] font-mono fill-[#64748B] font-bold tracking-widest uppercase"
            >
              CONFIDENCE
            </text>
            <text
              y="20"
              className="text-4xl font-black font-mono fill-black tabular-nums tracking-tight"
            >
              {displayScore}
              <tspan className="text-xl font-bold" fill={accentColor}>
                %
              </tspan>
            </text>
            <text
              y="38"
              className="text-[10px] font-mono fill-[#64748B] font-bold tracking-wider"
            >
              12-BIT CALIBRATED
            </text>
          </g>
        </svg>

        {/* Clear Subtext for Patient */}
        <div className="w-full text-center mt-2 pt-3 border-t-2 border-black">
          <p className="text-xs text-[#2B2D32] font-mono font-medium leading-relaxed">
            {category === 'higher'
              ? 'FindPneumo detected localized density matching pneumonia training cases.'
              : category === 'moderate'
              ? 'FindPneumo detected generalized cloudiness that warrants medical review.'
              : 'No pneumonia-related density or fluid consolidation observed.'}
          </p>
        </div>
      </div>
    </div>
  );
};
