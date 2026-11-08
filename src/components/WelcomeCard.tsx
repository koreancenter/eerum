import React from 'react';
import { Plus, Eye, CreditCard } from 'lucide-react';

export interface WelcomeCardProps {
  onCreateFirstCard: () => void;
  onExploreSample: () => void;
  onViewMyCards?: () => void;
  hasExistingCards?: boolean;
}

const STUDIO_FEATURES = [
  {
    title: '3D Studio',
    sub: '3D Canvas / Custom Card',
  },
  {
    title: 'Instant Share',
    sub: 'Offline QR / 300 DPI PDF',
  },
  {
    title: 'Zero-Server Vault',
    sub: 'AES-256 / On-Device',
  },
] as const;

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onCreateFirstCard,
  onExploreSample,
  onViewMyCards,
  hasExistingCards = false,
}) => {
  return (
    <section
      aria-label="eerum 디지털 명함 스튜디오 소개"
      className="relative w-full max-w-2xl mx-auto px-2 sm:px-4 py-2 select-none flex flex-col items-center justify-center text-center"
    >
      {/* Subtle Ambient Architectural Illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[480px] h-[180px] sm:h-[240px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.055),rgba(255,255,255,0.015)_45%,transparent_72%)] blur-2xl"
      />

      {/* 1. Minimalist Card Emblem & Luxury Typography */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          aria-hidden="true"
          className="w-11 h-6 sm:w-12 sm:h-7 mb-3.5 sm:mb-4 rounded-md bg-gradient-to-br from-white/[0.10] via-white/[0.03] to-transparent border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.22)] flex items-end justify-start p-1.5"
        >
          <span className="w-3 h-px bg-white/55" />
        </div>

        <p className="h-[25px] text-[10px] sm:text-[11px] font-light tracking-[0.28em] text-white/50 uppercase">
          Private Digital Identity Studio
        </p>

        <h1 className="mt-2 sm:mt-2.5 h-[66px] text-[40px] font-medium tracking-wide text-white leading-tight text-balance">
          eerum
          <span className="ml-2.5 font-extralight text-white/50 text-xl sm:text-3xl tracking-widest">
            이룸
          </span>
        </h1>

        <p className="mt-2.5 sm:mt-3 h-[45px] text-xs sm:text-sm text-white/60 font-light tracking-wide leading-relaxed max-w-md mx-auto text-balance">
          서버에 남지 않는 온디바이스 암호화로
          <br className="hidden sm:inline" /> 당신만의 디지털 명함과 프라이빗 보관함을 완성하세요.
        </p>
      </div>

      {/* 2. Compact Luxury Conversion CTAs */}
      <div className="relative z-10 w-full max-w-lg h-[64px] mt-5 sm:mt-6 flex flex-row items-center justify-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
        {hasExistingCards && onViewMyCards ? (
          <button
            type="button"
            onClick={onViewMyCards}
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs sm:text-[13px] tracking-wide shadow-[0_8px_28px_rgba(255,255,255,0.10)] hover:shadow-[0_12px_34px_rgba(255,255,255,0.18)] inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <CreditCard className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
            <span>내 명함 보기</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreateFirstCard}
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs sm:text-[13px] tracking-wide shadow-[0_8px_28px_rgba(255,255,255,0.10)] hover:shadow-[0_12px_34px_rgba(255,255,255,0.18)] inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.25] shrink-0" />
            <span>첫 명함 만들기</span>
          </button>
        )}

        {hasExistingCards && (
          <button
            type="button"
            onClick={onCreateFirstCard}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/25 text-white/80 hover:text-white font-medium text-xs sm:text-[13px] tracking-wide backdrop-blur-md inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.25] shrink-0" />
            <span>새 명함 추가</span>
          </button>
        )}

        <button
          type="button"
          onClick={onExploreSample}
          className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 text-white/75 hover:text-white font-normal text-xs sm:text-[13px] tracking-wide backdrop-blur-md inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Eye className="w-3.5 h-3.5 stroke-[1.6] text-white/60 shrink-0" />
          <span>샘플 둘러보기</span>
        </button>
      </div>

      {/* 3. Sleek Horizontal 3-Column Glassmorphic Feature Bar */}
      <div className="relative z-10 w-full max-w-2xl h-[83px] mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        {STUDIO_FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl bg-white/[0.025] hover:bg-white/[0.045] backdrop-blur-md border border-white/10 hover:border-white/20 px-2.5 py-2.5 sm:px-4 sm:py-3 flex flex-col items-center justify-center text-center gap-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors duration-200"
          >
            <span className="text-[11px] sm:text-xs font-normal tracking-wider text-white/90 leading-snug">
              {feature.title}
            </span>
            <span className="text-[9.5px] sm:text-[11px] font-light tracking-wide text-white/60 leading-snug">
              {feature.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WelcomeCard;
