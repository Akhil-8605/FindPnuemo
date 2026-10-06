import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const LogoIcon: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-lg',
    xl: 'w-14 h-14 text-2xl',
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] bg-black select-none shrink-0 flex items-center justify-center font-mono font-black tracking-tight leading-none ${className}`}
    >
      <span className="text-white">F</span>
      <span className="text-[#0E7490]">P</span>
    </div>
  );
};

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <LogoIcon size={size} />
      {showText && (
        <div>
          <div className="text-xl font-black tracking-tight text-black leading-none uppercase">
            Find<span className="text-[#0E7490]">Pneumo</span>
          </div>
          <div className="text-[9px] font-mono font-bold text-[#52525B] tracking-wider uppercase mt-0.5">
            AI CHEST SCREENING
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
