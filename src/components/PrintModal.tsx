import React from 'react';
import { CardData, CardTheme, PrintConfig, PrintLayout, PrintSize } from '../types/card';
import { BusinessCardFront } from './BusinessCardFront';
import { BusinessCardBack } from './BusinessCardBack';
import { THEMES } from './ThemeSelector';
import { X, Printer, Info, Layers, ArrowLeft } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

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
  const { isEn, t } = useLocale();
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

  const matchedTheme = THEMES.find((themeOption) => themeOption.id === config.theme);
  const activeThemeLabel = matchedTheme
    ? (isEn ? matchedTheme.labelEn : formatKoreanThemeLabel(matchedTheme.label))
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.modals.printTitle}
        className="relative w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-[var(--app-border)] flex items-center justify-between gap-4 shrink-0 bg-[var(--app-bg)]">
          <div className="flex items-center gap-2.5 min-w-0">
            {isSubModal && (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[36px] min-h-[36px] -ml-1 flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                title={t.modals.backToShare}
                aria-label={t.modals.backToShare}
              >
                <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--app-text)] tracking-tight truncate">
                {t.modals.printTitle}
              </h2>
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5 truncate">
                {t.modals.printSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title={t.common.close}
            aria-label={t.common.close}
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
                <label className="text-xs font-medium text-[var(--app-text-muted)] block">
                  {isEn ? 'Print Layout' : '인쇄 구성'}
                </label>
                <select
                  value={config.layout}
                  onChange={(e) => updateConfig({ layout: e.target.value as PrintLayout })}
                  className="w-full min-h-[42px] bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] cursor-pointer"
                >
                  <option value="single-card">
                    {isEn ? 'Front & Back Separate Pages (Print Shop)' : '양면 개별 페이지 (인쇄소 제출용)'}
                  </option>
                  <option value="front-back-duo">
                    {isEn ? 'Front & Back Side-by-Side (Proof)' : '앞·뒷면 나란히 보기 (시안 확인용)'}
                  </option>
                  <option value="a4-sheet">
                    {isEn ? 'A4 10-Card Sheet (Office Print)' : 'A4 10매 다단 배치 (사무용 출력)'}
                  </option>
                </select>
              </div>

              {/* Paper Dimensions */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--app-text-muted)] block">
                  {isEn ? 'Card Size' : '명함 규격'}
                </label>
                <select
                  value={config.size}
                  onChange={(e) => updateConfig({ size: e.target.value as PrintSize })}
                  className="w-full min-h-[42px] bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] cursor-pointer"
                >
                  <option value="kr-standard">
                    {isEn ? 'Korea Standard (90 × 50 mm)' : '국내 표준 (90 × 50 mm)'}
                  </option>
                  <option value="iso-standard">
                    {isEn ? 'ISO Standard (85 × 55 mm)' : '국제 표준 (85 × 55 mm)'}
                  </option>
                </select>
              </div>

              {/* Paper Finish / Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--app-text-muted)] block">
                  {isEn ? 'Card Finish' : '용지 마감'}
                </label>
                <select
                  value={config.theme}
                  onChange={(e) => updateConfig({ theme: e.target.value as CardTheme })}
                  className="w-full min-h-[42px] bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] cursor-pointer"
                >
                  {THEMES.map((themeItem) => (
                    <option key={themeItem.id} value={themeItem.id}>
                      {isEn ? themeItem.labelEn : formatKoreanThemeLabel(themeItem.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Crop Marks Toggle & Print Tip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs text-[var(--app-text)]">
              <label className="inline-flex items-center gap-2.5 min-h-[36px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.showCropMarks}
                  onChange={(e) => updateConfig({ showCropMarks: e.target.checked })}
                  className="rounded accent-[var(--app-accent)] w-4 h-4 cursor-pointer"
                />
                <span>{isEn ? 'Show crop marks & 3mm bleed' : '재단선 및 3mm 여백 표시'}</span>
              </label>

              <div className="flex items-center gap-1.5 text-[var(--app-text-muted)] text-[11px]">
                <Info className="w-3.5 h-3.5 shrink-0" />
                {isEn ? (
                  <span>
                    In print dialog, choose <strong className="text-[var(--app-text)] font-medium">Save as PDF</strong> and enable{' '}
                    <strong className="text-[var(--app-text)] font-medium">Background graphics</strong>
                  </span>
                ) : (
                  <span>
                    인쇄 창에서 <strong className="text-[var(--app-text)] font-medium">PDF로 저장</strong> 및{' '}
                    <strong className="text-[var(--app-text)] font-medium">배경 그래픽 포함</strong>을 선택해 주세요
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Live Preview Stage with Fixed Responsive Aspect Ratio */}
          <div className="p-4 sm:p-6 bg-[var(--app-bg)] rounded-2xl border border-[var(--app-border)]">
            <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-[var(--app-border)] text-xs text-[var(--app-text-muted)]">
              <span className="font-medium text-[var(--app-text)]">{isEn ? 'Live Preview' : '실시간 미리보기'}</span>
              <span className="tabular-nums">
                {widthDisplay} · {activeThemeLabel}
              </span>
            </div>

            {config.layout !== 'a4-sheet' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start justify-items-center py-1">
                {/* Front Card */}
                <div className="w-full max-w-[360px] flex flex-col items-center">
                  <span className="text-xs font-medium text-[var(--app-text-muted)] mb-2.5">{isEn ? 'Front' : '앞면'}</span>
                  <div className="relative p-2.5 w-full">
                    {config.showCropMarks && <CropMarksPreview />}
                    <div
                      className={`w-full ${cardAspectClass} rounded-xl shadow-[var(--app-shadow)] overflow-hidden ring-1 ring-[var(--app-border)]`}
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
                  <span className="text-xs font-medium text-[var(--app-text-muted)] mb-2.5">{isEn ? 'Back' : '뒷면'}</span>
                  <div className="relative p-2.5 w-full">
                    {config.showCropMarks && <CropMarksPreview />}
                    <div
                      className={`w-full ${cardAspectClass} rounded-xl shadow-[var(--app-shadow)] overflow-hidden ring-1 ring-[var(--app-border)]`}
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
                <div className="flex items-center gap-2 mb-3 text-xs text-[var(--app-text-muted)]">
                  <Layers className="w-4 h-4 text-[var(--app-text)] shrink-0" />
                  <span>
                    {isEn
                      ? '10 cards per A4 sheet (2 cols × 5 rows with crop guides)'
                      : 'A4 용지 1장에 10매 배치 (2열 × 5행 재단 가이드 포함)'}
                  </span>
                </div>

                <div className="relative bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-3 shadow-xl max-w-[280px] sm:max-w-xs w-full mx-auto aspect-[210/297]">
                  <div className="w-full h-full grid grid-cols-2 gap-1.5 border border-dashed border-[var(--app-text-muted)]/40 p-1.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="border border-[var(--app-border)] rounded flex flex-col justify-between p-1.5 bg-[var(--app-surface-subtle)] text-[7px] leading-tight overflow-hidden"
                      >
                        <div className="flex items-center justify-between text-[var(--app-text-muted)] font-mono tabular-nums text-[6px]">
                          <span>{i + 1}</span>
                          <span>{widthDisplay}</span>
                        </div>
                        <div className="text-center font-semibold text-[var(--app-text)] truncate">
                          {data.name}
                        </div>
                        <div className="text-[6px] text-[var(--app-text-muted)] text-center truncate">
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
        <div className="px-5 sm:px-7 py-4 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 py-2 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] text-xs font-medium cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            {isSubModal ? (isEn ? 'Back to Share' : '취소 · 공유 화면으로') : t.common.cancel}
          </button>

          <button
            type="button"
            onClick={handleExecutePrint}
            className="min-h-[42px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-fg)] hover:opacity-90 text-xs font-semibold shadow-lg cursor-pointer whitespace-nowrap active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>{isEn ? 'Print / Save PDF' : '인쇄 및 PDF 저장'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
