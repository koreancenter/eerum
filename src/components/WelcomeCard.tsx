import React from 'react';
import { Plus, Eye } from 'lucide-react';

interface WelcomeCardProps {
  onCreateFirstCard: () => void;
  onExploreSample: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onCreateFirstCard,
  onExploreSample,
}) => {
  return (
    <div className="w-full max-w-[540px] mx-auto select-none flex flex-col items-center">
      {/* 3D-Style Luxury Business Card Surface (Responsive: Seamless on mobile, Framed card on desktop) */}
      <div 
        className="w-full relative bg-transparent sm:bg-[#121214] border-0 sm:border sm:border-white/10 sm:rounded-2xl sm:shadow-[0_24px_64px_rgba(0,0,0,0.6)] sm:hover:border-white/20 sm:hover:shadow-[0_32px_80px_rgba(0,0,0,0.75)] transition-all duration-300 p-2 py-6 sm:p-9 flex flex-col justify-between overflow-hidden group aspect-auto sm:aspect-[1.586/1] sm:min-h-[340px]"
      >
        {/* Subtle Luxury Ambient Glow & Watermark Geometry */}
        <div 
          className="hidden sm:block absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl pointer-events-none group-hover:bg-white/[0.06] transition-colors duration-500" 
          aria-hidden="true"
        />
        <div 
          className="hidden sm:block absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white/[0.02] blur-3xl pointer-events-none" 
          aria-hidden="true"
        />

        {/* Center Hero: Subtitle & Value Proposition */}
        <div className="relative z-10 my-auto text-center space-y-3 py-2 h-[76px]">
          <p className="text-base sm:text-lg font-medium text-neutral-100 tracking-tight leading-snug text-balance -mt-[13px] h-[35px]">
            로컬 퍼스트 디지털 명함
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
            <span>개인정보 비수집</span>
            <span aria-hidden="true" className="text-zinc-400">·</span>
            <span>기기 암호화</span>
            <span aria-hidden="true" className="text-zinc-400">·</span>
            <span>3D 인터랙티브</span>
          </div>
        </div>

        {/* Action Controls: Primary CTA & Secondary Sample Preview */}
        <div className="relative z-10 flex flex-col items-center gap-3 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
            {/* Primary CTA Button */}
            <button
              onClick={onCreateFirstCard}
              className="w-full max-w-[260px] px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-neutral-950 font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-white/10 hover:shadow-white/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>첫 명함 만들기</span>
            </button>

            {/* Secondary Text Button */}
            <button
              onClick={onExploreSample}
              className="w-auto px-4 py-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors duration-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer underline-offset-4 hover:underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            >
              <Eye className="w-3.5 h-3.5 text-white" />
              <span>샘플 둘러보기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
