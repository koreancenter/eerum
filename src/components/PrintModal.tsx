import React from 'react';
import { CardData, CardTheme, PrintConfig, PrintLayout, PrintSize } from '../types/card';
import { BusinessCardFront } from './BusinessCardFront';
import { BusinessCardBack } from './BusinessCardBack';
import { THEMES } from './ThemeSelector';
import { X, Printer, Info, Layers, ArrowLeft } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardData;
  config: PrintConfig;
  onConfigChange: (newConfig: PrintConfig) => void;
  isSubModal?: boolean;
}

function formatKoreanThemeLabel(rawLabel: string): string {
  const cleaned = rawLabel.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned || rawLabel;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  data,
  config,
  onConfigChange,
  isSubModal = false,
}) => {
  if (!isOpen) return null;

  const handleExecutePrint = () => {
    window.print();
  };

  const updateConfig = (patch: Partial<PrintConfig>) => {
    onConfigChange({
      ...config,
      ...patch,
    });
  };

  const isKr = config.size === 'kr-standard';
  const widthDisplay = isKr ? '90 × 50 mm' : '85 × 55 mm';
  const cardAspectClass = isKr ? 'aspect-[9/5]' : 'aspect-[85/55]';

  const matchedTheme = THEMES.find((t) => t.id === config.theme);
  const activeThemeLabel = matchedTheme
    ? formatKoreanThemeLabel(matchedTheme.label)
    : config.theme;

  // Hairline Crop Marks Simulation
  const CropMarksPreview = () => (
    <div className="absolute -inset-2.5 pointer-events-none">
      <div className="absolute inset-0 border border-dashed border-neutral-600/60" />

      <div className="absolute top-0 left-2.5 -mt-2 w-px h-2 bg-neutral-400" />
      <div className="absolute top-2.5 left-0 -ml-2 w-2 h-px bg-neutral-400" />

      <div className="absolute top-0 right-2.5 -mt-2 w-px h-2 bg-neutral-400" />
      <div className="absolute top-2.5 right-0 -mr-2 w-2 h-px bg-neutral-400" />

      <div className="absolute bottom-0 left-2.5 -mb-2 w-px h-2 bg-neutral-400" />
      <div className="absolute bottom-2.5 left-0 -ml-2 w-2 h-px bg-neutral-400" />

      <div className="absolute bottom-0 right-2.5 -mb-2 w-px h-2 bg-neutral-400" />
      <div className="absolute bottom-2.5 right-0 -mr-2 w-2 h-px bg-neutral-400" />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="인쇄 및 PDF 설정"
        className="relative w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-3xl bg-[#111113] border border-white/10 text-neutral-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between gap-4 shrink-0 bg-[#0A0A0B]">
          <div className="flex items-center gap-2.5 min-w-0">
            {isSubModal && (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[36px] min-h-[36px] -ml-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="공유 화면으로 돌아가기"
                aria-label="공유 화면으로 돌아가기"
              >
                <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
                인쇄 및 PDF 설정
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">
                인쇄소 재단 규격 및 사무용 A4 출력을 위한 고해상도 PDF를 생성합니다
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5 sm:py-6 space-y-6 text-xs">
          {/* 1. Clean Option Selectors */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Layout Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  인쇄 구성
                </label>
                <select
                  value={config.layout}
                  onChange={(e) => updateConfig({ layout: e.target.value as PrintLayout })}
                  className="w-full min-h-[42px] bg-[#18181B] border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 cursor-pointer"
                >
                  <option value="single-card">양면 개별 페이지 (인쇄소 제출용)</option>
                  <option value="front-back-duo">앞·뒷면 나란히 보기 (시안 확인용)</option>
                  <option value="a4-sheet">A4 10매 다단 배치 (사무용 출력)</option>
                </select>
              </div>

              {/* Paper Dimensions */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  명함 규격
                </label>
                <select
                  value={config.size}
                  onChange={(e) => updateConfig({ size: e.target.value as PrintSize })}
                  className="w-full min-h-[42px] bg-[#18181B] border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 cursor-pointer"
                >
                  <option value="kr-standard">국내 표준 (90 × 50 mm)</option>
                  <option value="iso-standard">국제 표준 (85 × 55 mm)</option>
                </select>
              </div>

              {/* Paper Finish / Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  용지 마감
                </label>
                <select
                  value={config.theme}
                  onChange={(e) => updateConfig({ theme: e.target.value as CardTheme })}
                  className="w-full min-h-[42px] bg-[#18181B] border border-white/10 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 cursor-pointer"
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatKoreanThemeLabel(t.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Crop Marks Toggle & Print Tip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs text-zinc-300">
              <label className="inline-flex items-center gap-2.5 min-h-[36px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.showCropMarks}
                  onChange={(e) => updateConfig({ showCropMarks: e.target.checked })}
                  className="rounded accent-white w-4 h-4 cursor-pointer"
                />
                <span>재단선 및 3mm 여백 표시</span>
              </label>

              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  인쇄 창에서 <strong className="text-zinc-200 font-medium">PDF로 저장</strong> 및{' '}
                  <strong className="text-zinc-200 font-medium">배경 그래픽 포함</strong>을 선택해 주세요
                </span>
              </div>
            </div>
          </div>

          {/* 2. Live Preview Stage with Fixed Responsive Aspect Ratio */}
          <div className="p-4 sm:p-6 bg-[#0A0A0B] rounded-2xl border border-white/[0.08]">
            <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-white/[0.06] text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">실시간 미리보기</span>
              <span className="tabular-nums">
                {widthDisplay} · {activeThemeLabel}
              </span>
            </div>

            {config.layout !== 'a4-sheet' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start justify-items-center py-1">
                {/* Front Card */}
                <div className="w-full max-w-[360px] flex flex-col items-center">
                  <span className="text-xs font-medium text-zinc-400 mb-2.5">앞면</span>
                  <div className="relative p-2.5 w-full">
                    {config.showCropMarks && <CropMarksPreview />}
                    <div
                      className={`w-full ${cardAspectClass} rounded-xl shadow-xl overflow-hidden ring-1 ring-white/10`}
                    >
                      <BusinessCardFront
                        data={data}
                        theme={config.theme}
                        isPrintPreview={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Back Card */}
                <div className="w-full max-w-[360px] flex flex-col items-center">
                  <span className="text-xs font-medium text-zinc-400 mb-2.5">뒷면</span>
                  <div className="relative p-2.5 w-full">
                    {config.showCropMarks && <CropMarksPreview />}
                    <div
                      className={`w-full ${cardAspectClass} rounded-xl shadow-xl overflow-hidden ring-1 ring-white/10`}
                    >
                      <BusinessCardBack
                        data={data}
                        theme={config.theme}
                        isPrintPreview={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* A4 Sheet 10-Card Multi-Up Grid Preview */
              <div className="flex flex-col items-center justify-center py-2">
                <div className="flex items-center gap-2 mb-3 text-xs text-zinc-400">
                  <Layers className="w-4 h-4 text-zinc-300 shrink-0" />
                  <span>A4 용지 1장에 10매 배치 (2열 × 5행 재단 가이드 포함)</span>
                </div>

                <div className="relative bg-[#121214] border border-zinc-800/80 rounded-xl p-3 shadow-2xl max-w-[280px] sm:max-w-xs w-full mx-auto aspect-[210/297]">
                  <div className="w-full h-full grid grid-cols-2 gap-1.5 border border-dashed border-zinc-700/80 p-1.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="border border-zinc-800 rounded flex flex-col justify-between p-1.5 bg-[#0A0A0B] text-[7px] leading-tight overflow-hidden"
                      >
                        <div className="flex items-center justify-between text-zinc-400 font-mono tabular-nums text-[6px]">
                          <span>{i + 1}</span>
                          <span>{widthDisplay}</span>
                        </div>
                        <div className="text-center font-semibold text-zinc-300 truncate">
                          {data.name}
                        </div>
                        <div className="text-[6px] text-zinc-400 text-center truncate">
                          {data.organizationKr || data.organization}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Modal Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-white/10 bg-[#0A0A0B] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-medium cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {isSubModal ? '취소 · 공유 화면으로' : '취소'}
          </button>

          <button
            type="button"
            onClick={handleExecutePrint}
            className="min-h-[42px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-white text-neutral-950 hover:bg-zinc-200 text-xs font-semibold shadow-lg cursor-pointer whitespace-nowrap active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            <Printer className="w-4 h-4 text-neutral-950 shrink-0" />
            <span>인쇄 및 PDF 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
