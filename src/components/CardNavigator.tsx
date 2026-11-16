import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { StoredCard, CardOrientation } from '../types/card';
import { isVerticalLayout } from '../constants/templates';
import { CardContainer } from './CardContainer';
import { ActionButtons } from './ActionButtons';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid,
  CreditCard,
  Check,
  QrCode,
  Nfc,
} from 'lucide-react';

export type CardNavigationMode = 'carousel' | 'switcher';

export interface CardNavigatorProps {
  cards: StoredCard[];
  activeCardId: string;
  onSelectCard: (id: string) => void;
  onCreateNewCard: () => void;
  onOpenEdit?: (card: StoredCard) => void;
  onOpenShare: (card: StoredCard) => void;
  onOpenQuickQr?: (card: StoredCard) => void;
  onOpenNfc?: (card: StoredCard) => void;
  onDeleteCard?: (card: StoredCard) => void;
  mode?: CardNavigationMode;
  onModeChange?: (mode: CardNavigationMode) => void;
  allowModeToggle?: boolean;
}

/**
 * Unified Card Navigation Component
 * Consolidates carousel 3D presentation deck and switcher thumbnail navigation into a singular versatile component.
 * Stylized in architectural luxury monochrome palette (rich black, zinc hairline borders, warm matte paper).
 */
export const CardNavigator: React.FC<CardNavigatorProps> = ({
  cards,
  activeCardId,
  onSelectCard,
  onCreateNewCard,
  onOpenEdit,
  onOpenShare,
  onOpenQuickQr,
  onOpenNfc,
  onDeleteCard,
  mode = 'carousel',
  onModeChange,
  allowModeToggle = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Defense-in-depth: strictly restrict My Cards Navigator to cards with isMyCard === true
  const personalCards = useMemo(() => cards.filter((c) => c.isMyCard), [cards]);

  // Total slides = personal cards + 1 ghost card for adding new card
  const totalSlides = personalCards.length + 1;
  const ghostIndex = personalCards.length;

  const initialIndex = Math.max(0, personalCards.findIndex((c) => c.id === activeCardId));
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex >= 0 ? initialIndex : 0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<CardOrientation>(() => {
    const initCard = personalCards[initialIndex >= 0 ? initialIndex : 0];
    return initCard && isVerticalLayout(initCard.layout_type) ? 'portrait' : 'landscape';
  });
  // Tactile haptic vibration feedback for mobile devices (Vibration API)
  const triggerTactileHaptic = useCallback((durationMs = 6) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Silently ignore if restricted
      }
    }
  }, []);

  // Sync currentIndex when activeCardId or personalCards change externally
  useEffect(() => {
    const idx = personalCards.findIndex((c) => c.id === activeCardId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setIsFlipped(false);
      setOrientation(isVerticalLayout(personalCards[idx].layout_type) ? 'portrait' : 'landscape');
    } else if (personalCards.length > 0) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setOrientation(isVerticalLayout(personalCards[0].layout_type) ? 'portrait' : 'landscape');
    }
  }, [activeCardId, personalCards]);

  // Reset track inline transform whenever currentIndex settles
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      trackRef.current.style.transform = `translateX(${-currentIndex * 100}%)`;
    }
  }, [currentIndex]);

  const goToSlide = useCallback((newIndex: number, withHaptic = true) => {
    const bounded = Math.max(0, Math.min(newIndex, totalSlides - 1));
    if (withHaptic && bounded !== currentIndex) {
      triggerTactileHaptic(6);
    }
    setCurrentIndex(bounded);
    setIsFlipped(false);

    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      trackRef.current.style.transform = `translateX(${-bounded * 100}%)`;
    }

    if (bounded < personalCards.length) {
      onSelectCard(personalCards[bounded].id);
      setOrientation(isVerticalLayout(personalCards[bounded].layout_type) ? 'portrait' : 'landscape');
    }
  }, [totalSlides, currentIndex, triggerTactileHaptic, personalCards, onSelectCard]);

  // Mobile-native axis-locked pointer/touch drag handling for carousel mode
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    lastX: number;
    axis: 'x' | 'y' | null;
  } | null>(null);
  const isMovedRef = useRef<boolean>(false);
  const movedResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (movedResetTimerRef.current !== null) {
        window.clearTimeout(movedResetTimerRef.current);
      }
    };
  }, []);

  const scheduleMovedReset = useCallback(() => {
    if (movedResetTimerRef.current !== null) {
      window.clearTimeout(movedResetTimerRef.current);
    }
    movedResetTimerRef.current = window.setTimeout(() => {
      isMovedRef.current = false;
      movedResetTimerRef.current = null;
    }, 100);
  }, []);

  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'carousel' || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, select, [data-no-swipe="true"]')) {
      return;
    }

    if (movedResetTimerRef.current !== null) {
      window.clearTimeout(movedResetTimerRef.current);
      movedResetTimerRef.current = null;
    }
    isMovedRef.current = false;

    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      lastX: e.clientX,
      axis: null,
    };
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId || mode !== 'carousel') return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    g.lastX = e.clientX;

    if (g.axis === null) {
      const dist = Math.hypot(dx, dy);
      if (dist < 8) return;

      // Let vertical scroll pass through undisturbed
      if (Math.abs(dy) > Math.abs(dx) * 1.15) {
        g.axis = 'y';
        return;
      }

      g.axis = 'x';
      isMovedRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
    }

    if (g.axis !== 'x') return;

    // Resistance at carousel edges
    const atStartEdge = currentIndex === 0 && dx > 0;
    const atEndEdge = currentIndex === totalSlides - 1 && dx < 0;
    const effectiveDx = atStartEdge || atEndEdge ? dx * 0.28 : dx;

    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
      trackRef.current.style.transform = `translateX(calc(${-currentIndex * 100}% + ${effectiveDx}px))`;
    }
  };

  const finishContainerGesture = (e: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;

    if (g.axis !== 'x') return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    scheduleMovedReset();

    if (cancelled) {
      goToSlide(currentIndex, false);
      return;
    }

    const dx = (e.clientX || g.lastX) - g.startX;
    const elapsed = Math.max(1, performance.now() - g.startTime);
    const velocity = dx / elapsed; // px/ms
    const width = containerRef.current?.offsetWidth || 360;
    const distanceThreshold = Math.min(72, Math.max(44, width * 0.18));
    const isFlick = Math.abs(velocity) > 0.32 && Math.abs(dx) > 18;
    const shouldSwitch = Math.abs(dx) > distanceThreshold || isFlick;

    if (shouldSwitch && dx < 0 && currentIndex < totalSlides - 1) {
      goToSlide(currentIndex + 1, true);
    } else if (shouldSwitch && dx > 0 && currentIndex > 0) {
      goToSlide(currentIndex - 1, true);
    } else {
      goToSlide(currentIndex, false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToSlide(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToSlide(currentIndex + 1);
      } else if (e.code === 'Space' && currentIndex < personalCards.length) {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, personalCards.length, goToSlide]);

  // If no personal cards exist, immediately present the centered ghost card
  if (personalCards.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-8 px-4 animate-in fade-in duration-300">
        <div className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px]">
          <div 
            onClick={onCreateNewCard}
            className="w-full rounded-3xl border-2 border-dashed border-white/20 hover:border-white/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 flex flex-col items-center justify-center p-8 sm:p-14 text-center group shadow-2xl cursor-pointer active:scale-[0.99]"
            style={{ aspectRatio: '9 / 5' }}
          >
            <div className="w-16 h-16 rounded-full border border-white/30 group-hover:border-white flex items-center justify-center text-white bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 mb-4 shadow-lg">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-zinc-200 transition-colors">
              새 명함 만들기
            </h3>
            <p className="text-xs text-neutral-400 mt-2 max-w-[280px] leading-relaxed">
              등록된 내 명함이 없습니다. 첫 번째 럭셔리 디지털 명함을 만들어 보세요.
            </p>
            <span className="mt-5 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold tracking-tight shadow-md hover:bg-zinc-200 transition-all">
              지금 첫 명함 생성하기
            </span>
          </div>
        </div>
      </div>
    );
  }

  const activeCard = currentIndex < personalCards.length ? personalCards[currentIndex] : null;

  // Render Mode 1: Compact/Grid Switcher Mode
  if (mode === 'switcher') {
    return (
      <div className="w-full flex flex-col items-center select-none py-2 px-3 sm:px-6">
        {allowModeToggle && onModeChange && (
          <div className="w-full max-w-4xl flex justify-end mb-3">
            <button
              onClick={() => onModeChange('carousel')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
              <span>3D 캐러셀 보기</span>
            </button>
          </div>
        )}

        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {personalCards.map((card, idx) => {
            const isSelected = card.id === activeCardId;
            return (
              <div
                key={card.id}
                onClick={() => {
                  triggerTactileHaptic();
                  goToSlide(idx);
                }}
                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-white/60 bg-white/[0.08] shadow-[0_8px_24px_rgba(255,255,255,0.08)]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-bold text-white tracking-tight truncate">
                      {card.data.name}
                    </span>
                    {card.data.nameKr && (
                      <span className="text-[11px] text-neutral-400 truncate">
                        ({card.data.nameKr})
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-neutral-400 truncate mb-1">
                  {card.data.organization} {card.data.title && `· ${card.data.title}`}
                </div>

                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  {card.customDomain || `/card/${card.slug || card.id}`}
                </div>
              </div>
            );
          })}

          {/* Add Card Card in Switcher */}
          <div
            onClick={onCreateNewCard}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/60 bg-white/[0.01] hover:bg-white/[0.04] transition-all cursor-pointer group min-h-[96px]"
          >
            <Plus className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:scale-110 transition-all mb-1" />
            <span className="text-xs font-medium text-neutral-300 group-hover:text-white">
              새 명함 추가
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Render Mode 2: Interactive 3D Perspective Carousel
  return (
    <div className="w-full flex flex-col items-center select-none overflow-hidden py-1 sm:py-3">
      {allowModeToggle && onModeChange && (
        <div className="w-full max-w-5xl flex justify-end px-4 mb-2">
          <button
            onClick={() => onModeChange('switcher')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
            <span>목록 그리드 보기</span>
          </button>
        </div>
      )}

      {/* 1. Carousel Viewport Container */}
      <div 
        ref={containerRef}
        style={{ touchAction: 'pan-y' }}
        className="w-full max-w-5xl relative flex items-center justify-center min-h-[220px] sm:min-h-[290px] md:min-h-[330px] px-2 sm:px-4"
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={(e) => finishContainerGesture(e, false)}
        onPointerCancel={(e) => finishContainerGesture(e, true)}
      >
        {/* Left Arrow (Visible on Mobile & Desktop) */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(currentIndex - 1);
            }}
            className="flex absolute left-1 sm:left-2 md:left-6 z-30 p-2 sm:p-2.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 text-white/70 hover:text-white backdrop-blur-md active:scale-90 cursor-pointer shadow-xl"
            title="이전 명함 보기"
            aria-label="이전 명함"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Arrow (Visible on Mobile & Desktop) */}
        {currentIndex < totalSlides - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(currentIndex + 1);
            }}
            className="flex absolute right-1 sm:right-2 md:right-6 z-30 p-2 sm:p-2.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 text-white/70 hover:text-white backdrop-blur-md active:scale-90 cursor-pointer shadow-xl"
            title="다음 명함 보기"
            aria-label="다음 명함"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Cards Deck Track */}
        <div 
          ref={trackRef}
          className="flex items-center"
          style={{
            transform: `translateX(${-currentIndex * 100}%)`,
            transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            width: '100%',
          }}
        >
          {/* Card Slides rendered via unified CardContainer */}
          {personalCards.map((card, idx) => {
            const isCenter = idx === currentIndex;
            const isFlippedCard = isCenter && isFlipped;

            return (
              <div
                key={card.id}
                className="w-full shrink-0 flex items-center justify-center px-2 sm:px-8"
                style={{
                  transform: isCenter ? 'scale(1)' : 'scale(0.92)',
                  opacity: isCenter ? 1 : 0.38,
                  transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease',
                  zIndex: isCenter ? 20 : 10,
                }}
              >
                <CardContainer
                  cardKey={card.id}
                  data={card.data}
                  theme={card.theme}
                  layout_type={card.layout_type}
                  card_features={card.card_features}
                  isPhotoCard={card.isPhotoCard || card.creation_mode === 'photo'}
                  photoUrl={card.scannedImage || card.front_image_url}
                  backPhotoUrl={card.scannedImageBack || card.back_image_url}
                  html_front={card.html_front}
                  html_back={card.html_back}
                  isFlipped={isFlippedCard}
                  onFlip={() => {
                    if (isMovedRef.current) return;
                    setIsFlipped((prev) => !prev);
                  }}
                  onCardClick={() => {
                    if (isMovedRef.current) return;
                    if (!isCenter) {
                      goToSlide(idx);
                    } else {
                      triggerTactileHaptic(5);
                      setIsFlipped((prev) => !prev);
                    }
                  }}
                  onOpenShare={() => onOpenShare(card)}
                  orientation={isCenter ? orientation : isVerticalLayout(card.layout_type) ? 'portrait' : 'landscape'}
                  onOrientationChange={isCenter ? setOrientation : undefined}
                  hideActions={true}
                  disableSwipe={true}
                  disableLayout={true}
                  showFlipBadge={isCenter}
                />
              </div>
            );
          })}

          {/* Final Ghost Slide: "Add New Card" Slot */}
          <div
            className="w-full shrink-0 flex items-center justify-center px-3 sm:px-8 transition-all duration-300"
            style={{
              transform: currentIndex === ghostIndex ? 'scale(1)' : 'scale(0.92)',
              opacity: currentIndex === ghostIndex ? 1 : 0.38,
              transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease',
              cursor: 'pointer',
              zIndex: currentIndex === ghostIndex ? 20 : 10,
            }}
            onClick={() => {
              if (isMovedRef.current) return;
              if (currentIndex !== ghostIndex) {
                goToSlide(ghostIndex);
              } else {
                onCreateNewCard();
              }
            }}
          >
            <div className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px]">
              <div 
                className="w-full rounded-2xl border-2 border-dashed border-white/20 hover:border-white/60 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex flex-col items-center justify-center p-8 sm:p-12 text-center group shadow-xl active:scale-[0.99]"
                style={{ aspectRatio: '9 / 5' }}
              >
                <div className="w-14 h-14 rounded-full border border-white/25 group-hover:border-white flex items-center justify-center text-white bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 mb-3 shadow-inner">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight group-hover:text-zinc-200 transition-colors">
                  새 명함 만들기
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-[240px] leading-relaxed">
                  새로운 직함이나 소속 단체 명함을 추가합니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Carousel Position Indicator */}
      {totalSlides > 1 && (
        <div
          className="w-full flex items-center justify-center gap-1.5 mt-2.5"
          role="tablist"
          aria-label="내 명함 슬라이드 순서"
        >
          {Array.from({ length: totalSlides }).map((_, idx) => {
            const isActive = idx === currentIndex;
            const isGhost = idx === ghostIndex;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={isGhost ? '새 명함 만들기 슬라이드' : `${idx + 1}번째 명함`}
                onClick={() => goToSlide(idx)}
                className="p-0.5 cursor-pointer flex items-center justify-center"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'w-5 bg-white/90'
                      : isGhost
                        ? 'w-1.5 bg-white/15 border border-white/30'
                        : 'w-1.5 bg-white/20 hover:bg-white/45'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Prominent Quick QR & Web NFC Triggers & Bottom Actions Bar */}
      {activeCard && (
        <div className="w-full flex flex-col items-center px-4 mt-3 gap-2.5">
          {(onOpenQuickQr || onOpenNfc) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onOpenQuickQr && (
                <button
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic(6);
                    onOpenQuickQr(activeCard);
                  }}
                  className="inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 text-xs font-semibold tracking-tight shadow-lg active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  title="Quick QR 명함 패스 즉시 열기 (화면 꺼짐 방지)"
                  aria-label="Quick QR"
                >
                  <QrCode className="w-4 h-4 stroke-[2] shrink-0" />
                  <span>Quick QR</span>
                </button>
              )}

              {onOpenNfc && (
                <button
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic(6);
                    onOpenNfc(activeCard);
                  }}
                  className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white text-xs font-semibold tracking-tight shadow-lg active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  title="Web NFC로 가까운 기기 또는 NFC 태그에 명함 전송"
                  aria-label="NFC 전송"
                >
                  <Nfc className="w-4 h-4 stroke-[1.9] shrink-0" />
                  <span>NFC 전송</span>
                </button>
              )}
            </div>
          )}

          <div className="w-full flex justify-center min-h-[38px]">
            <ActionButtons
              data={activeCard.data}
              onOpenEdit={() => onOpenEdit && onOpenEdit(activeCard)}
              onOpenShare={() => onOpenShare(activeCard)}
              onDelete={onDeleteCard ? () => onDeleteCard(activeCard) : undefined}
              isPhotoCard={activeCard.isPhotoCard || activeCard.creation_mode === 'photo'}
              orientation={orientation}
              onToggleOrientation={() => setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
            />
          </div>
        </div>
      )}
    </div>
  );
};
