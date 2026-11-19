import React from 'react';
import { Plus, Eye } from 'lucide-react';

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
}) => {
  return (
    <section
      aria-label="eerum 디지털 명함 스튜디오 소개"
      className="relative w-full max-w-2xl mx-auto px-2 sm:px-4 py-2 select-none flex flex-col items-center justify-center text-center"
    >
      {/* Subtle Ambient Accent Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[480px] h-[180px] sm:h-[240px] rounded-full opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(ellipse at center, var(--app-accent), transparent 72%)',
        }}
      />

      {/* 1. Minimalist Card Emblem & Editorial Typography */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          aria-hidden="true"
          className="w-11 h-6 sm:w-12 sm:h-7 mb-3.5 sm:mb-4 rounded-md bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] flex items-end justify-start p-1.5"
        >
          <span className="w-3 h-[2px] rounded-full bg-[var(--app-accent)]" />
        </div>

        <p className="h-[25px] text-[10px] sm:text-[11px] font-medium tracking-[0.28em] text-[var(--app-text-muted)] uppercase">
          Private Digital Identity Studio
        </p>

        <h1 className="mt-2 sm:mt-2.5 h-[66px] text-[40px] font-medium tracking-wide text-[var(--app-text)] leading-tight text-balance">
          eerum
          <span className="ml-2.5 font-light text-[var(--app-text-muted)] text-xl sm:text-3xl tracking-widest">
            이룸
          </span>
        </h1>

        <p className="mt-2.5 sm:mt-3 h-[45px] text-xs sm:text-sm text-[var(--app-text-muted)] font-normal tracking-wide leading-relaxed max-w-md mx-auto text-balance">
          서버에 남지 않는 온디바이스 암호화로
          <br className="hidden sm:inline" /> 당신만의 디지털 명함과 프라이빗 보관함을 완성하세요.
        </p>
      </div>

      {/* 2. Compact Conversion CTAs (60-30-10 Accent & Surface Balance) */}
      <div className="relative z-10 w-full max-w-lg h-[64px] mt-5 sm:mt-6 flex flex-row items-center justify-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={onCreateFirstCard}
          className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] font-semibold text-xs sm:text-[13px] tracking-wide shadow-[var(--app-shadow)] inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.25] shrink-0" />
          <span>내 명함 만들기</span>
        </button>

        <button
          type="button"
          onClick={onExploreSample}
          className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] font-medium text-xs sm:text-[13px] tracking-wide inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
        >
          <Eye className="w-3.5 h-3.5 stroke-[1.6] text-[var(--app-text-muted)] shrink-0" />
          <span>샘플 둘러보기</span>
        </button>
      </div>

      {/* 3. Sleek Horizontal 3-Column Feature Bar */}
      <div className="relative z-10 w-full max-w-2xl h-[83px] mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        {STUDIO_FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] px-2.5 py-2.5 sm:px-4 sm:py-3 flex flex-col items-center justify-center text-center gap-1 shadow-[var(--app-shadow)] transition-colors duration-200"
          >
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-[var(--app-text)] leading-snug">
              {feature.title}
            </span>
            <span className="text-[9.5px] sm:text-[11px] font-normal tracking-wide text-[var(--app-text-muted)] leading-snug">
              {feature.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WelcomeCard;
