import React from 'react';
import { Plus, Eye } from 'lucide-react';

export interface WelcomeCardProps {
  onCreateFirstCard: () => void;
  onExploreSample: () => void;
}

const STUDIO_PILLARS = [
  {
    index: '01',
    title: '3D 오브제 스튜디오',
    detail: '맞춤형 레이아웃 · 입체 회전 · 커스텀 코드',
  },
  {
    index: '02',
    title: '즉시 공유 및 인쇄',
    detail: '오프라인 QR · vCard 연락처 · 300 DPI PDF',
  },
  {
    index: '03',
    title: '제로 서버 로컬 금고',
    detail: '기기 내 AES-256 암호화 · PIN 및 생체 인증',
  },
] as const;

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onCreateFirstCard,
  onExploreSample,
}) => {
  return (
    <section
      aria-label="eerum 디지털 명함 스튜디오 소개"
      className="relative w-full max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 select-none flex flex-col items-center justify-center text-center"
    >
      {/* Subtle Studio Spotlight Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[520px] h-[260px] sm:h-[340px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(161,161,170,0.02),transparent_70%)] blur-3xl"
      />

      {/* 1. Abstract Blank Card Emblem & Brand Header */}
      <div className="relative z-10 flex flex-col items-center space-y-5 sm:space-y-6">
        {/* Minimalist Blank Metallic Card Silhouette */}
        <div
          aria-hidden="true"
          className="w-12 h-8 rounded-lg bg-gradient-to-br from-[#202025] via-[#141417] to-[#0C0C0E] border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.22)] flex items-end justify-start p-2"
        >
          <span className="w-3.5 h-px bg-zinc-300/70" />
        </div>

        <div className="space-y-3">
          <p className="text-[10px] sm:text-[11px] font-mono tracking-[0.28em] text-zinc-500 uppercase">
            Private Digital Identity Studio
          </p>

          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-50 text-balance">
            eerum{' '}
            <span className="font-light text-zinc-400 text-2xl sm:text-4xl tracking-normal">
              이룸
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-md mx-auto text-balance pt-1">
            서버에 남지 않는 온디바이스 암호화로
            <br className="hidden sm:inline" /> 당신만의 디지털 명함과 프라이빗 보관함을 완성하세요.
          </p>
        </div>
      </div>

      {/* 2. Focused Conversion CTAs */}
      <div className="relative z-10 w-full max-w-md mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onCreateFirstCard}
          className="w-full sm:flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm shadow-[0_12px_36px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Plus className="w-4 h-4 stroke-[2.25] shrink-0" />
          <span>첫 명함 만들기</span>
        </button>

        <button
          type="button"
          onClick={onExploreSample}
          className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-zinc-200 hover:text-white font-medium text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>샘플 명함 둘러보기</span>
        </button>
      </div>

      {/* 3. Quiet Architectural 3-Pillar Editorial Strip */}
      <div className="relative z-10 w-full mt-10 sm:mt-14 pt-7 sm:pt-8 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x sm:divide-white/[0.08]">
        {STUDIO_PILLARS.map((pillar) => (
          <div key={pillar.index} className="px-4 flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-zinc-200 tracking-wide">
              <span className="font-mono text-zinc-500 mr-1.5 tabular-nums">
                {pillar.index}.
              </span>
              {pillar.title}
            </span>
            <span className="text-[11px] text-zinc-500 leading-relaxed">
              {pillar.detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WelcomeCard;
