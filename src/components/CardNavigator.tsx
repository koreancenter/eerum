import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { StoredCard, CardOrientation } from '../types/card';
import { isVerticalLayout } from '../constants/templates';
import { getCardShareUrl } from '../utils/cardSerializer';
import { shareOrCopyLink } from '../utils/share';
import { CardContainer } from './CardContainer';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid,
  CreditCard,
  Check,
  QrCode,
  Nfc,
  Share2,
  Link2,
  Edit3,
  Printer,
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
  onOpenPrint?: (card: StoredCard) => void;
  onDeleteCard?: (card: StoredCard) => void;
  onShowToast?: (msg: string) => void;
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
  onOpenPrint,
  onShowToast,
  mode = 'carousel',
  onModeChange,
  allowModeToggle = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);
  
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
            className="w-full rounded-3xl border-2 border-dashed border-[var(--app-border)] hover:border-[var(--app-accent)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] transition-all duration-300 flex flex-col items-center justify-center p-8 sm:p-14 text-center group shadow-[var(--app-shadow)] cursor-pointer active:scale-[0.99]"
            style={{ aspectRatio: '9 / 5' }}
          >
            <div className="w-16 h-16 rounded-full border border-[var(--app-border)] group-hover:border-[var(--app-accent)] flex items-center justify-center text-[var(--app-text)] bg-[var(--app-surface-subtle)] group-hover:bg-[var(--app-highlight)] group-hover:text-[var(--app-highlight-fg)] group-hover:scale-110 transition-all duration-300 mb-4 shadow-sm">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--app-text)] tracking-tight transition-colors">
              새 명함 만들기
            </h3>
            <p className="text-xs text-[var(--app-text-muted)] mt-2 max-w-[280px] leading-relaxed">
              등록된 내 명함이 없습니다. 첫 번째 럭셔리 디지털 명함을 만들어 보세요.
            </p>
            <span className="mt-5 px-5 py-2.5 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-fg)] text-xs font-bold tracking-tight shadow-sm hover:opacity-90 transition-all">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
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
                    ? 'border-[var(--app-accent)] bg-[var(--app-surface)] shadow-[var(--app-shadow)] ring-1 ring-[var(--app-accent)]/25'
                    : 'border-[var(--app-border)] bg-[var(--app-surface)]/75 hover:border-[var(--app-text-muted)]/40 hover:bg-[var(--app-surface)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-bold text-[var(--app-text)] tracking-tight truncate">
                      {card.data.name}
                    </span>
                    {card.data.nameKr && (
                      <span className="text-[11px] text-[var(--app-text-muted)] truncate">
                        ({card.data.nameKr})
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-fg)]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-[var(--app-text-muted)] truncate mb-1">
                  {card.data.organization} {card.data.title && `· ${card.data.title}`}
                </div>

                <div className="text-[10px] font-mono text-[var(--app-text-muted)] truncate">
                  {card.customDomain || `/card/${card.slug || card.id}`}
                </div>
              </div>
            );
          })}

          {/* Add Card Card in Switcher */}
          <div
            onClick={onCreateNewCard}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-[var(--app-border)] hover:border-[var(--app-accent)] bg-[var(--app-surface-subtle)]/50 hover:bg-[var(--app-surface-subtle)] transition-all cursor-pointer group min-h-[96px]"
          >
            <Plus className="w-5 h-5 text-[var(--app-text-muted)] group-hover:text-[var(--app-text)] group-hover:scale-110 transition-all mb-1" />
            <span className="text-xs font-medium text-[var(--app-text-muted)] group-hover:text-[var(--app-text)]">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
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
            className="flex absolute left-1 sm:left-2 md:left-6 z-30 p-2 sm:p-2.5 rounded-full bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] backdrop-blur-md active:scale-90 cursor-pointer shadow-[var(--app-shadow)] transition-colors"
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
            className="flex absolute right-1 sm:right-2 md:right-6 z-30 p-2 sm:p-2.5 rounded-full bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] backdrop-blur-md active:scale-90 cursor-pointer shadow-[var(--app-shadow)] transition-colors"
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
                className="w-full rounded-2xl border-2 border-dashed border-[var(--app-border)] hover:border-[var(--app-accent)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] transition-all duration-300 flex flex-col items-center justify-center p-8 sm:p-12 text-center group shadow-[var(--app-shadow)] active:scale-[0.99]"
                style={{ aspectRatio: '9 / 5' }}
              >
                <div className="w-14 h-14 rounded-full border border-[var(--app-border)] group-hover:border-[var(--app-accent)] flex items-center justify-center text-[var(--app-text)] bg-[var(--app-surface-subtle)] group-hover:bg-[var(--app-highlight)] group-hover:text-[var(--app-highlight-fg)] group-hover:scale-110 transition-all duration-300 mb-3 shadow-inner">
                  <Plus className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-[var(--app-text)] tracking-tight transition-colors">
                  새 명함 만들기
                </h4>
                <p className="text-xs text-[var(--app-text-muted)] mt-1 max-w-[240px] leading-relaxed">
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
                      ? 'w-5 bg-[var(--app-accent)]'
                      : isGhost
                        ? 'w-1.5 bg-transparent border border-[var(--app-text-muted)]'
                        : 'w-1.5 bg-[var(--app-border)] hover:bg-[var(--app-text-muted)]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Minimalist Single-Row Icon-Only Action Bar */}
      {activeCard && (
        <div
          role="toolbar"
          aria-label="내 명함 빠른 작업"
          className="w-full flex items-center justify-center gap-1.5 sm:gap-2.5 mt-4 px-2"
        >
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic(6);
              if (onOpenQuickQr) {
                onOpenQuickQr(activeCard);
              } else {
                onOpenShare(activeCard);
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="Quick QR"
            aria-label="Quick QR"
          >
            <QrCode className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic(6);
              if (onOpenNfc) {
                onOpenNfc(activeCard);
              } else {
                onOpenShare(activeCard);
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="NFC 전송"
            aria-label="NFC 전송"
          >
            <Nfc className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={async () => {
              triggerTactileHaptic(6);
              const targetUrl = getCardShareUrl(activeCard);
              const displayName = activeCard.data.name || activeCard.data.nameKr;
              const displayOrg = activeCard.data.organizationKr || activeCard.data.organization;
              const displayTitle = activeCard.data.titleKr || activeCard.data.title;
              await shareOrCopyLink({
                title: displayOrg ? `${displayName} — ${displayOrg}` : displayName,
                text: [displayOrg, displayTitle, displayName, '디지털 명함']
                  .filter(Boolean)
                  .join(' '),
                url: targetUrl,
                onCopied: () => onShowToast?.('명함 링크가 클립보드에 복사되었습니다.'),
                onCopyError: () => onShowToast?.('명함 공유에 실패했습니다.'),
              });
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="공유하기"
            aria-label="공유하기"
          >
            <Share2 className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={async () => {
              triggerTactileHaptic(6);
              const targetUrl = getCardShareUrl(activeCard);
              try {
                await navigator.clipboard.writeText(targetUrl);
                setCopiedCardId(activeCard.id);
                if (copyTimerRef.current !== null) {
                  window.clearTimeout(copyTimerRef.current);
                }
                copyTimerRef.current = window.setTimeout(() => {
                  setCopiedCardId(null);
                }, 2000);
                onShowToast?.('명함 웹 링크가 복사되었습니다.');
              } catch {
                onShowToast?.('링크 복사에 실패했습니다.');
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="링크 복사"
            aria-label="링크 복사"
          >
            {copiedCardId === activeCard.id ? (
              <Check className="w-4 h-4 stroke-[2] text-emerald-500" />
            ) : (
              <Link2 className="w-4 h-4 stroke-[1.75]" />
            )}
          </button>

          <span className="border-r border-[var(--app-border)] h-3.5 mx-0.5 self-center" aria-hidden="true" />

          <button
            type="button"
            onClick={() => onOpenEdit?.(activeCard)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="내 명함 편집"
            aria-label="내 명함 편집"
          >
            <Edit3 className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenPrint) {
                onOpenPrint(activeCard);
              } else {
                onOpenShare(activeCard);
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="인쇄 · PDF"
            aria-label="인쇄 · PDF"
          >
            <Printer className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      )}
    </div>
  );
};
