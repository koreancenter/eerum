import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { CardData, CardTheme, CardOrientation, CardLayoutType, CardFeatures } from '../types/card';
import { resolveThemeStyles, isVerticalLayout } from '../constants/templates';
import { deriveCardThemeHarmony } from '../utils/cardThemeHarmony';
import { BusinessCardFront } from './BusinessCardFront';
import { BusinessCardBack } from './BusinessCardBack';
import { ActionButtons } from './ActionButtons';
import { useLocale } from '../hooks/useLocale';

interface CardContainerProps {
  data: CardData;
  theme: CardTheme;
  layout_type?: CardLayoutType;
  card_features?: CardFeatures;
  isFlipped: boolean;
  onFlip: () => void;
  onOpenEdit?: () => void;
  onOpenShare: () => void;
  onDelete?: () => void;
  isPhotoCard?: boolean;
  photoUrl?: string;
  backPhotoUrl?: string;
  html_front?: string;
  html_back?: string;
  isOwner?: boolean;
  cardUrl?: string;
  onShowToast?: (msg: string) => void;
  onToggleMemo?: () => void;
  isMemoOpen?: boolean;
  hasMemo?: boolean;
  // Carousel / Horizontal Swipe-to-Switch Props
  cardKey?: string;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  carouselIndex?: number;
  carouselTotal?: number;
  onSelectIndex?: (index: number) => void;
  orientation?: CardOrientation;
  onOrientationChange?: (orientation: CardOrientation) => void;
  hideActions?: boolean;
  disableSwipe?: boolean;
  showFlipBadge?: boolean;
  onCardClick?: () => void;
  onInteraction?: () => void;
}

interface GestureState {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  axis: 'x' | 'y' | null;
}

export const CardContainer: React.FC<CardContainerProps> = ({
  data,
  theme,
  layout_type = 'editorial_minimal',
  card_features,
  isFlipped,
  onFlip,
  onOpenEdit,
  onOpenShare,
  onDelete,
  isPhotoCard = false,
  photoUrl,
  backPhotoUrl,
  html_front,
  html_back,
  isOwner = true,
  cardUrl,
  onShowToast,
  onToggleMemo,
  isMemoOpen = false,
  hasMemo = false,
  cardKey,
  onSwipePrev,
  onSwipeNext,
  hasPrev,
  hasNext,
  carouselTotal = 1,
  orientation: controlledOrientation,
  onOrientationChange,
  hideActions = false,
  disableSwipe = false,
  showFlipBadge = false,
  onCardClick,
  onInteraction,
}) => {
  const { isEn } = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const [internalOrientation, setInternalOrientation] = useState<CardOrientation>(() =>
    isVerticalLayout(layout_type) ? 'portrait' : 'landscape'
  );

  const orientation = controlledOrientation ?? internalOrientation;

  const setOrientation = useCallback(
    (next: CardOrientation | ((prev: CardOrientation) => CardOrientation)) => {
      const resolved = typeof next === 'function' ? next(orientation) : next;
      if (onOrientationChange) {
        onOrientationChange(resolved);
      } else {
        setInternalOrientation(resolved);
      }
    },
    [orientation, onOrientationChange]
  );

  // Sync orientation when layout changes between vertical (5:8) and landscape (9:5) presets
  useEffect(() => {
    if (!controlledOrientation) {
      setInternalOrientation(isVerticalLayout(layout_type) ? 'portrait' : 'landscape');
    }
  }, [layout_type, controlledOrientation]);

  const hasCarouselNavigation = Boolean(onSwipePrev || onSwipeNext);
  const canGoPrev = hasPrev ?? Boolean(onSwipePrev);
  const canGoNext = hasNext ?? Boolean(onSwipeNext);

  // GPU-accelerated motion values for 60fps mobile-native finger tracking
  const dragX = useMotionValue(0);
  const dragRotateZ = useTransform(dragX, [-240, 0, 240], [-2.2, 0, 2.2]);
  const dragScale = useTransform(dragX, [-240, 0, 240], [0.96, 1, 0.96]);
  const dragOpacity = useTransform(dragX, [-260, 0, 260], [0.42, 1, 0.42]);

  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const gestureRef = useRef<GestureState | null>(null);
  const didSwipeRef = useRef(false);
  const clickResetTimerRef = useRef<number | null>(null);
  const pendingSlideDirRef = useRef<-1 | 0 | 1>(0);
  const isTransitioningRef = useRef(false);

  // Subtle tactile haptic vibration feedback for mobile devices (Vibration API)
  const triggerHapticFeedback = useCallback((durationMs = 5) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Silently ignore if restricted by device or browser policy
      }
    }
  }, []);

  const handleCardFlip = useCallback(() => {
    triggerHapticFeedback(5);
    onFlip();
  }, [triggerHapticFeedback, onFlip]);

  // Directional spring entrance when active card changes in carousel
  useEffect(() => {
    const dir = pendingSlideDirRef.current;
    if (dir !== 0) {
      dragX.set(dir * 96);
      pendingSlideDirRef.current = 0;
      const controls = animate(dragX, 0, {
        type: 'spring',
        stiffness: 400,
        damping: 34,
        mass: 0.8,
      });
      controls.then(() => {
        isTransitioningRef.current = false;
      });
      return () => controls.stop();
    }
    dragX.set(0);
    isTransitioningRef.current = false;
  }, [cardKey, data, dragX]);

  useEffect(() => {
    return () => {
      if (clickResetTimerRef.current !== null) {
        window.clearTimeout(clickResetTimerRef.current);
      }
    };
  }, []);

  const triggerPrevCard = useCallback(() => {
    if (!onSwipePrev || !canGoPrev || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    triggerHapticFeedback(7);
    pendingSlideDirRef.current = -1;
    animate(dragX, 88, { duration: 0.1, ease: 'easeOut' }).then(() => {
      onSwipePrev();
      window.setTimeout(() => {
        isTransitioningRef.current = false;
      }, 60);
    });
  }, [onSwipePrev, canGoPrev, triggerHapticFeedback, dragX]);

  const triggerNextCard = useCallback(() => {
    if (!onSwipeNext || !canGoNext || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    triggerHapticFeedback(7);
    pendingSlideDirRef.current = 1;
    animate(dragX, -88, { duration: 0.1, ease: 'easeOut' }).then(() => {
      onSwipeNext();
      window.setTimeout(() => {
        isTransitioningRef.current = false;
      }, 60);
    });
  }, [onSwipeNext, canGoNext, triggerHapticFeedback, dragX]);

  // Keyboard arrow navigation when carousel controls are active
  useEffect(() => {
    if (!hasCarouselNavigation || disableSwipe) return;
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
      if (e.key === 'ArrowLeft' && canGoPrev) {
        e.preventDefault();
        triggerPrevCard();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        triggerNextCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasCarouselNavigation, disableSwipe, canGoPrev, canGoNext, triggerPrevCard, triggerNextCard]);

  const scheduleDidSwipeReset = useCallback(() => {
    if (clickResetTimerRef.current !== null) {
      window.clearTimeout(clickResetTimerRef.current);
    }
    clickResetTimerRef.current = window.setTimeout(() => {
      didSwipeRef.current = false;
      clickResetTimerRef.current = null;
    }, 100);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disableSwipe || isTransitioningRef.current) return;
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, select, [data-no-swipe="true"]')) {
      return;
    }

    if (clickResetTimerRef.current !== null) {
      window.clearTimeout(clickResetTimerRef.current);
      clickResetTimerRef.current = null;
    }
    didSwipeRef.current = false;

    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      lastX: e.clientX,
      axis: null,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId || disableSwipe) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    g.lastX = e.clientX;

    if (g.axis === null) {
      const dist = Math.hypot(dx, dy);
      if (dist < 8) return;

      // Disambiguate vertical scroll vs horizontal swipe
      if (Math.abs(dy) > Math.abs(dx) * 1.15) {
        g.axis = 'y';
        return;
      }

      g.axis = 'x';
      didSwipeRef.current = true;
      setIsDraggingHorizontal(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unavailable
      }
    }

    if (g.axis !== 'x') return;

    // Apply rubber-band resistance at carousel boundaries or when standalone
    let effectiveDx = dx;
    if (hasCarouselNavigation) {
      const hittingLeftEdge = dx > 0 && !canGoPrev;
      const hittingRightEdge = dx < 0 && !canGoNext;
      if (hittingLeftEdge || hittingRightEdge) {
        effectiveDx = Math.sign(dx) * Math.min(56, Math.abs(dx) * 0.26);
      }
    } else {
      effectiveDx = Math.sign(dx) * Math.min(64, Math.abs(dx) * 0.35);
    }

    dragX.set(effectiveDx);
  };

  const finishGesture = (e: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;

    if (g.axis !== 'x') {
      setIsDraggingHorizontal(false);
      return;
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    setIsDraggingHorizontal(false);
    scheduleDidSwipeReset();

    if (cancelled) {
      animate(dragX, 0, { type: 'spring', stiffness: 460, damping: 34 });
      return;
    }

    const dx = (e.clientX || g.lastX) - g.startX;
    const elapsed = Math.max(1, performance.now() - g.startTime);
    const velocity = dx / elapsed; // px per ms
    const containerWidth = canvasWrapperRef.current?.offsetWidth || 320;
    const distanceThreshold = Math.min(68, Math.max(44, containerWidth * 0.18));
    const isFlick = Math.abs(velocity) > 0.32 && Math.abs(dx) > 18;
    const isSwipe = Math.abs(dx) > distanceThreshold || isFlick;

    if (hasCarouselNavigation) {
      if (isSwipe && dx < 0 && canGoNext && onSwipeNext) {
        isTransitioningRef.current = true;
        triggerHapticFeedback(7);
        pendingSlideDirRef.current = 1;
        animate(dragX, -110, { duration: 0.11, ease: 'easeOut' }).then(() => {
          onSwipeNext();
          window.setTimeout(() => {
            isTransitioningRef.current = false;
          }, 60);
        });
        return;
      }

      if (isSwipe && dx > 0 && canGoPrev && onSwipePrev) {
        isTransitioningRef.current = true;
        triggerHapticFeedback(7);
        pendingSlideDirRef.current = -1;
        animate(dragX, 110, { duration: 0.11, ease: 'easeOut' }).then(() => {
          onSwipePrev();
          window.setTimeout(() => {
            isTransitioningRef.current = false;
          }, 60);
        });
        return;
      }

      // Snap back with spring physics
      animate(dragX, 0, { type: 'spring', stiffness: 460, damping: 34 });
      return;
    }

    // Standalone single-card fallback: horizontal swipe flips card cleanly
    if (Math.abs(dx) > 40) {
      handleCardFlip();
    }
    animate(dragX, 0, { type: 'spring', stiffness: 460, damping: 34 });
  };

  const handleCardSurfaceClick = (e: React.MouseEvent) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didSwipeRef.current = false;
      return;
    }
    if (onCardClick) {
      onCardClick();
    } else {
      handleCardFlip();
    }
  };

  const isVerticalCard = isVerticalLayout(layout_type);
  const isPortrait = isVerticalCard || orientation === 'portrait';
  const showCarouselControls = hasCarouselNavigation && carouselTotal > 1;

  const themeStyles = useMemo(
    () => resolveThemeStyles(theme, card_features?.custom_bg_color),
    [theme, card_features?.custom_bg_color]
  );
  const themeHarmony = useMemo(
    () => deriveCardThemeHarmony(themeStyles.accent, themeStyles.isLight, themeStyles.canvasHex),
    [themeStyles]
  );

  return (
    <div
      style={{
        maxWidth: isPortrait
          ? 'min(100%, calc((100vh - 240px) * 5 / 8), 320px)'
          : '560px',
        maxHeight: isPortrait ? 'calc(100vh - 240px)' : 'none',
        width: '100%',
      }}
      className="mx-auto select-none flex flex-col items-center relative"
    >
      {/* 3D Tactile Card Canvas - Framer Motion flip + horizontal swipe-to-switch */}
      <motion.div
        ref={canvasWrapperRef}
        style={{
          touchAction: disableSwipe ? undefined : 'pan-y',
          x: disableSwipe ? undefined : dragX,
          rotateZ: disableSwipe ? undefined : dragRotateZ,
          scale: disableSwipe ? undefined : dragScale,
          opacity: disableSwipe ? undefined : dragOpacity,
        }}
        className={`w-full [perspective:1400px] relative flex justify-center items-center ${
          isDraggingHorizontal ? 'cursor-grabbing' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishGesture(e, false)}
        onPointerCancel={(e) => finishGesture(e, true)}
      >
        {/* Subtle Desktop Prev/Next Carousel Chevrons */}
        {showCarouselControls && canGoPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerPrevCard();
            }}
            className="hidden sm:flex absolute -left-11 md:-left-13 z-30 p-2 rounded-full bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] backdrop-blur-md active:scale-90 cursor-pointer shadow-[var(--app-shadow)] transition-colors"
            title={isEn ? 'Previous card' : '이전 명함 보기'}
            aria-label={isEn ? 'Previous card' : '이전 명함'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {showCarouselControls && canGoNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerNextCard();
            }}
            className="hidden sm:flex absolute -right-11 md:-right-13 z-30 p-2 rounded-full bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] backdrop-blur-md active:scale-90 cursor-pointer shadow-[var(--app-shadow)] transition-colors"
            title={isEn ? 'Next card' : '다음 명함 보기'}
            aria-label={isEn ? 'Next card' : '다음 명함'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <motion.div
          ref={cardRef}
          onClick={handleCardSurfaceClick}
          data-card-contrast={themeHarmony.contrastMetrics.isLightCanvas ? 'light-canvas' : 'dark-canvas'}
          animate={{
            rotateY: isFlipped ? 180 : 0,
          }}
          transition={{
            rotateY: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
          }}
          whileHover={isDraggingHorizontal ? undefined : { scale: 1.012 }}
          whileTap={isDraggingHorizontal ? undefined : { scale: 0.988 }}
          style={{
            ...themeHarmony.cssVars,
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            maxWidth: isPortrait
              ? 'min(100%, calc((100vh - 240px) * 5 / 8), 320px)'
              : '100%',
            maxHeight: isPortrait ? 'calc(100vh - 240px)' : 'none',
            boxShadow: themeHarmony.cardShadow,
          }}
          className="relative w-full cursor-pointer group rounded-2xl transition-shadow duration-300"
        >
          {/* Optional Top-Right Discreet Flip Trigger Badge */}
          {showFlipBadge && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardFlip();
              }}
              style={{
                backgroundColor: themeHarmony.badgeBg,
                borderColor: themeHarmony.badgeBorder,
                color: themeHarmony.badgeText,
              }}
              className="absolute top-3 right-3 z-30 opacity-50 group-hover:opacity-100 transition-[opacity,background-color,border-color,color] duration-200 p-1.5 rounded-full backdrop-blur-md border cursor-pointer hover:scale-105 active:scale-95"
              title={isEn ? 'Flip card (click)' : '앞·뒷면 뒤집기 (클릭)'}
              aria-label={isEn ? 'Flip card' : '앞·뒷면 뒤집기'}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}

          {/* Front Face */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              boxShadow: `0 0 0 1px ${themeHarmony.ringColor}`,
            }}
            className="w-full h-full rounded-2xl overflow-hidden transition-[box-shadow] duration-300"
          >
            <BusinessCardFront
              data={data}
              theme={theme}
              layout_type={layout_type}
              card_features={card_features}
              orientation={orientation}
              isPhotoCard={isPhotoCard}
              photoUrl={photoUrl}
              html_front={html_front}
            />
          </div>

          {/* Back Face */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              boxShadow: `0 0 0 1px ${themeHarmony.ringColor}`,
            }}
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden transition-[box-shadow] duration-300"
          >
            <BusinessCardBack
              data={data}
              theme={theme}
              layout_type={layout_type}
              card_features={card_features}
              orientation={orientation}
              backPhotoUrl={backPhotoUrl}
              html_back={html_back}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Actions: Centered beneath Card */}
      {!hideActions && (
        <div className="w-full mt-2.5 sm:mt-4 px-1 flex justify-center">
          <ActionButtons
            data={data}
            isOwner={isOwner}
            onOpenEdit={onOpenEdit}
            onOpenShare={onOpenShare}
            onDelete={isOwner ? onDelete : undefined}
            isPhotoCard={isPhotoCard}
            orientation={orientation}
            onToggleOrientation={
              isOwner
                ? () => setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))
                : undefined
            }
            onToggleMemo={onToggleMemo}
            isMemoOpen={isMemoOpen}
            hasMemo={hasMemo}
            cardUrl={cardUrl}
            onShowToast={onShowToast}
            onInteraction={onInteraction}
          />
        </div>
      )}
    </div>
  );
};
