import React, { useState } from 'react';
import { MousePointer, Code2, Cpu, ShieldCheck } from 'lucide-react';

export const TeamSection: React.FC = () => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  const team = [
    {
      id: 'akhilesh',
      name: 'Akhilesh',
      role: 'Lead ML & Neural Architecture',
      focus: 'DenseNet-121 CheXNet GAP & PyTorch Training',
      color: '#38BDF8',
      xPercent: 18,
      yPercent: 32,
    },
    {
      id: 'kshitija',
      name: 'Kshitija',
      role: 'Computer Vision & Preprocessing',
      focus: 'OpenCV CLAHE, Inpainting & Bone Suppression',
      color: '#2DD4BF',
      xPercent: 40,
      yPercent: 31,
    },
    {
      id: 'gouri',
      name: 'Gouri',
      role: 'Medical Frontend & X-Ray Player',
      focus: 'Cinematic Storyteller & Interactive Scrubber',
      color: '#4ADE80',
      xPercent: 62,
      yPercent: 31,
    },
    {
      id: 'shruti',
      name: 'Shruti',
      role: 'Clinical Workflows & Telemetry',
      focus: 'FastAPI REST Engine & PDF Consultation Export',
      color: '#FBBF24',
      xPercent: 84,
      yPercent: 32,
    },
  ];

  return (
    <section id="team" className="py-20 border-t-2 border-black bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Unified Neo-Brutalist Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#0E7490] mb-2 font-bold">
              <span className="w-2.5 h-2.5 bg-[#0E7490] rounded-sm" />
              <span>TEAM</span> 
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black tracking-tight uppercase flex items-center gap-3 flex-wrap">
              <span>Created by</span>
              <span className="inline-block px-3.5 py-1 bg-black text-white rounded-xl shadow-[3px_3px_0px_#0E7490] tracking-tight">
                LowIQBots
              </span>
            </h2>
          </div>
          
        </div>

        {/* Member Focus Roster Cards */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {team.map((member) => (
            <div
              key={member.id}
              onMouseEnter={() => {
                setActiveMemberId(member.id);
                setIsHovered(true);
              }}
              onMouseLeave={() => {
                setActiveMemberId(null);
                setIsHovered(false);
              }}
              className={`bg-[#F8F8F5] rounded-xl border-2 border-black p-4 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden ${activeMemberId === member.id ? 'bg-white ring-2 ring-black' : ''
                }`}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: member.color }}
              />
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-black text-black uppercase tracking-wide flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  {member.name}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#71717A] uppercase">
                  CONTRIBUTOR
                </span>
              </div>
              <div className="text-xs font-black text-black uppercase tracking-tight mb-1">
                {member.role}
              </div>
              <p className="text-[11px] text-[#52525B] font-medium leading-relaxed">
                {member.focus}
              </p>
            </div>
          ))}
        </div> */}

        {/* Team Image Container — Displays name tags on cursor hover */}
        <div
          className="relative rounded-2xl border-2 border-black shadow-[4px_4px_0px_#000] overflow-hidden bg-black select-none cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setActiveMemberId(null);
          }}
        >
          {/* Top Control & Studio Strip */}
          <div className="bg-[#181B22] px-4 py-2 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">TEAM LOWIQBOTS ARCHIVE</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
              {/* <span className="text-[10px] uppercase font-bold tracking-wider">HOVER TO REVEAL CONTRIBUTORS</span> */}
            </div>
          </div>

          {/* Studio Portrait SVG Image */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[16/8] max-h-[460px] bg-gradient-to-b from-[#181B22] via-[#0F1117] to-[#08090C] overflow-hidden">
            {/* Subtle Studio Backdrop Lighting & Grid */}
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #FFF 1px, transparent 1px), linear-gradient(to bottom, #FFF 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />

            {/* Ambient Lighting Gradients */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-[18%] -translate-x-1/2 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl" />
              <div className="absolute top-1/4 left-[40%] -translate-x-1/2 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl" />
              <div className="absolute top-1/4 left-[62%] -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl" />
              <div className="absolute top-1/4 left-[84%] -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl" />
            </div>

            {/* Stylized Monochrome Studio Figures (Vector SVG) */}
            <svg
              viewBox="0 0 1000 500"
              className="w-full h-full object-cover pointer-events-none"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bodyGradA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D3342" />
                  <stop offset="50%" stopColor="#1C202B" />
                  <stop offset="100%" stopColor="#0B0D12" />
                </linearGradient>
                <linearGradient id="bodyGradB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32384A" />
                  <stop offset="50%" stopColor="#1E2330" />
                  <stop offset="100%" stopColor="#0B0D12" />
                </linearGradient>
              </defs>

              {/* Floor Shadow Reflection */}
              <ellipse cx="500" cy="480" rx="460" ry="30" fill="#000" opacity="0.6" />

              {/* Teammate 1: Akhilesh (x ~ 180) */}
              <g opacity={activeMemberId && activeMemberId !== 'akhilesh' ? 0.4 : 0.95} className="transition-opacity duration-200">
                <ellipse cx="180" cy="180" rx="36" ry="46" fill="#4B5565" />
                <path d="M 144 180 Q 180 135 216 180 Q 210 148 180 148 Q 150 148 144 180 Z" fill="#1E293B" />
                <ellipse cx="180" cy="235" rx="16" ry="16" fill="#374151" />
                <path
                  d="M 120 480 L 135 250 Q 180 230 225 250 L 240 480 Z"
                  fill="url(#bodyGradA)"
                  stroke="#38BDF8"
                  strokeWidth={activeMemberId === 'akhilesh' ? 2.5 : 1.2}
                />
                {/* Tech glasses */}
                <rect x="156" y="172" width="20" height="10" rx="2" fill="none" stroke="#38BDF8" strokeWidth="2" />
                <rect x="184" y="172" width="20" height="10" rx="2" fill="none" stroke="#38BDF8" strokeWidth="2" />
                <line x1="176" y1="177" x2="184" y2="177" stroke="#38BDF8" strokeWidth="2" />
              </g>

              {/* Teammate 2: Kshitija (x ~ 400) */}
              <g opacity={activeMemberId && activeMemberId !== 'kshitija' ? 0.4 : 0.95} className="transition-opacity duration-200">
                <ellipse cx="400" cy="172" rx="34" ry="44" fill="#4B5565" />
                <path d="M 360 160 Q 400 120 440 160 Q 448 240 435 270 Q 400 245 365 270 Z" fill="#1E293B" />
                <ellipse cx="400" cy="225" rx="15" ry="15" fill="#374151" />
                <path
                  d="M 345 480 L 360 242 Q 400 225 440 242 L 455 480 Z"
                  fill="url(#bodyGradB)"
                  stroke="#2DD4BF"
                  strokeWidth={activeMemberId === 'kshitija' ? 2.5 : 1.2}
                />
              </g>

              {/* Teammate 3: Gouri (x ~ 620) */}
              <g opacity={activeMemberId && activeMemberId !== 'gouri' ? 0.4 : 0.95} className="transition-opacity duration-200">
                <ellipse cx="620" cy="172" rx="34" ry="44" fill="#4B5565" />
                <circle cx="620" cy="120" r="18" fill="#1E293B" />
                <ellipse cx="620" cy="165" rx="38" ry="40" fill="#1E293B" />
                <ellipse cx="620" cy="225" rx="15" ry="15" fill="#374151" />
                <path
                  d="M 565 480 L 580 242 Q 620 225 660 242 L 675 480 Z"
                  fill="url(#bodyGradA)"
                  stroke="#4ADE80"
                  strokeWidth={activeMemberId === 'gouri' ? 2.5 : 1.2}
                />
              </g>

              {/* Teammate 4: Shruti (x ~ 840) */}
              <g opacity={activeMemberId && activeMemberId !== 'shruti' ? 0.4 : 0.95} className="transition-opacity duration-200">
                <ellipse cx="840" cy="180" rx="35" ry="45" fill="#4B5565" />
                <path d="M 800 165 Q 840 130 880 165 Q 875 240 860 260 Q 840 240 820 260 Z" fill="#1E293B" />
                <ellipse cx="840" cy="235" rx="16" ry="16" fill="#374151" />
                <path
                  d="M 780 480 L 795 250 Q 840 230 885 250 L 900 480 Z"
                  fill="url(#bodyGradB)"
                  stroke="#FBBF24"
                  strokeWidth={activeMemberId === 'shruti' ? 2.5 : 1.2}
                />
              </g>
            </svg>

            {/* Hover Tags: Display when cursor is on image or when hovering over member roster */}
            {isHovered && (
              <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-200">
                {team.map((member) => (
                  <div
                    key={member.id}
                    className="absolute transition-all duration-200"
                    style={{
                      left: `${member.xPercent}%`,
                      top: `${member.yPercent}%`,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    <div className="flex flex-col items-center">
                      {/* Tag Pill with Member Name */}
                      <div
                        className={`bg-black/95 text-white px-3 py-1 rounded-md border font-mono text-xs font-black tracking-wide uppercase flex items-center gap-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.8)] ${activeMemberId === member.id
                            ? 'border-white scale-110 ring-2 ring-cyan-400'
                            : 'border-white/60'
                          }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: member.color }}
                        />
                        <span>{member.name}</span>
                      </div>
                      {/* Downward pointer caret */}
                      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black/95" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
