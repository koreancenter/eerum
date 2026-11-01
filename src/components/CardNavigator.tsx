import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StoredCard, CardOrientation } from '../types/card';
import { BusinessCardFront } from './BusinessCardFront';
import { BusinessCardBack } from './BusinessCardBack';
import { ActionButtons } from './ActionButtons';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  LayoutGrid,
  CreditCard,
  Check
} from 'lucide-react';

export type CardNavigationMode = 'carousel' | 'switcher';

export interface CardNavigatorProps {
  cards: StoredCard[];
  activeCardId: string;
  onSelectCard: (id: string) => void;
  onCreateNewCard: () => void;
  onOpenEdit?: (card: StoredCard) => void;
  onOpenShare: (card: StoredCard) => void;
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
  mode = 'carousel',
  onModeChange,
  allowModeToggle = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Total slides = real cards + 1 ghost card for adding new card
  const totalSlides = cards.length + 1;
  const ghostIndex = cards.length;

  const initialIndex = Math.max(0, cards.findIndex(c => c.id === activeCardId));
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex >= 0 ? initialIndex : 0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<CardOrientation>('landscape');
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Tactile haptic vibration feedback for mobile devices (Vibration API)
  const triggerTactileHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(5);
      } catch {
        // Silently ignore if restricted
      }
    }
  }, []);

  // Sync currentIndex when activeCardId changes externally
  useEffect(() => {
    const idx = cards.findIndex(c => c.id === activeCardId);
    if (idx >= 0 && idx !== currentIndex) {
      setCurrentIndex(idx);
      setIsFlipped(false);
    }
  }, [activeCardId, cards, currentIndex]);

  const goToSlide = useCallback((newIndex: number) => {
    const bounded = Math.max(0, Math.min(newIndex, totalSlides - 1));
    setCurrentIndex(bounded);
    setIsFlipped(false);
    setDragOffset(0);

    if (bounded < cards.length) {
      onSelectCard(cards[bounded].id);
    }
  }, [totalSlides, cards, onSelectCard]);

  // Touch and Drag handling for carousel mode
  const startXRef = useRef<number | null>(null);
  const isMovedRef = useRef<boolean>(false);

  const handlePointerDown = (clientX: number) => {
    if (mode !== 'carousel') return;
    startXRef.current = clientX;
    isMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (clientX: number) => {
    if (startXRef.current === null || mode !== 'carousel') return;
    const diff = clientX - startXRef.current;
    if (Math.abs(diff) > 4) {
      isMovedRef.current = true;
    }
    // Resistance at bounds
    if ((currentIndex === 0 && diff > 0) || (currentIndex === totalSlides - 1 && diff < 0)) {
      setDragOffset(diff * 0.3);
    } else {
      setDragOffset(diff);
    }
  };

  const handlePointerUp = () => {
    if (startXRef.current === null || mode !== 'carousel') return;
    const diff = dragOffset;
    const threshold = 45;

    if (diff < -threshold && currentIndex < totalSlides - 1) {
      goToSlide(currentIndex + 1);
    } else if (diff > threshold && currentIndex > 0) {
      goToSlide(currentIndex - 1);
    } else {
      setDragOffset(0);
    }

    startXRef.current = null;
    setIsDragging(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToSlide(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToSlide(currentIndex + 1);
      } else if (e.code === 'Space' && currentIndex < cards.length) {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, goToSlide]);

  // If no personal cards exist, immediately present the centered ghost card
  if (cards.length === 0) {
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

  const activeCard = currentIndex < cards.length ? cards[currentIndex] : null;

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
          {cards.map((card, idx) => {
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
                  {card.customDomain || `/${card.slug || card.id}`}
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
        className="w-full max-w-5xl relative flex items-center justify-center min-h-[220px] sm:min-h-[290px] md:min-h-[330px] px-2 sm:px-4"
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={handlePointerUp}
        onMouseDown={(e) => handlePointerDown(e.clientX)}
        onMouseMove={(e) => isDragging && handlePointerMove(e.clientX)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        {/* Left Arrow (Desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(currentIndex - 1);
            }}
            className="hidden sm:flex absolute left-2 md:left-6 z-30 p-2.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 text-white/70 hover:text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-xl"
            title="이전 명함 보기"
            aria-label="이전 명함"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Arrow (Desktop) */}
        {currentIndex < totalSlides - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(currentIndex + 1);
            }}
            className="hidden sm:flex absolute right-2 md:right-6 z-30 p-2.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 text-white/70 hover:text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-xl"
            title="다음 명함 보기"
            aria-label="다음 명함"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Cards Deck Track */}
        <div 
          ref={trackRef}
          className="flex items-center transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(${-currentIndex * 100}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            width: '100%',
          }}
        >
          {/* Card Slides */}
          {cards.map((card, idx) => {
            const isCenter = idx === currentIndex;
            const isFlippedCard = isCenter && isFlipped;
            const isCardPortrait = card.layout_type === 'vertical_atelier' || (isCenter && orientation === 'portrait');

            return (
              <div
                key={card.id}
                className="w-full shrink-0 flex items-center justify-center px-2 sm:px-8 transition-all duration-300"
                style={{
                  transform: isCenter ? 'scale(1)' : 'scale(0.92)',
                  opacity: isCenter ? 1 : 0.38,
                  transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease',
                  cursor: 'pointer',
                  zIndex: isCenter ? 20 : 10,
                }}
                onClick={() => {
                  if (isMovedRef.current) return;
                  if (!isCenter) {
                    goToSlide(idx);
                  } else {
                    triggerTactileHaptic();
                    setIsFlipped(prev => !prev);
                  }
                }}
              >
                <div 
                  className="w-full [perspective:1400px] flex justify-center transition-all duration-300"
                  style={{
                    maxWidth: isCardPortrait
                      ? 'min(100%, 340px, calc((100dvh - 195px) * 5 / 8), calc((100vh - 195px) * 5 / 8))'
                      : 'min(100%, 540px)',
                  }}
                >
                  {/* 3D Flip Card */}
                  <div
                    style={{
                      transform: `rotateY(${isFlippedCard ? 180 : 0}deg)`,
                      transformStyle: 'preserve-3d',
                      WebkitTransformStyle: 'preserve-3d',
                      transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
                      maxWidth: isCardPortrait
                        ? 'min(100%, 340px, calc((100dvh - 195px) * 5 / 8), calc((100vh - 195px) * 5 / 8))'
                        : '100%',
                    }}
                    className={`relative w-full rounded-2xl group transition-shadow duration-300 ${
                      isCenter 
                        ? 'shadow-[0_24px_64px_rgba(0,0,0,0.6)] hover:shadow-[0_32px_80px_rgba(0,0,0,0.75)]' 
                        : 'shadow-lg'
                    }`}
                  >
                    {/* Top-Right Discreet Flip Trigger Badge on Active Card */}
                    {isCenter && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerTactileHaptic();
                          setIsFlipped(prev => !prev);
                        }}
                        className="absolute top-3 right-3 z-30 opacity-40 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80 cursor-pointer hover:scale-105 active:scale-95"
                        title="앞·뒷면 뒤집기 (클릭)"
                      >
                        <RefreshCw className="w-3 h-3 text-zinc-300" />
                      </div>
                    )}

                    {/* Front Face */}
                    <div 
                      style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                        transformStyle: 'preserve-3d',
                        WebkitTransformStyle: 'preserve-3d',
                      }}
                      className="w-full h-full rounded-2xl overflow-hidden ring-1 ring-white/10"
                    >
                      <BusinessCardFront 
                        data={card.data} 
                        theme={card.theme} 
                        layout_type={card.layout_type}
                        card_features={card.card_features}
                        orientation={isCardPortrait ? 'portrait' : 'landscape'}
                        isPhotoCard={card.isPhotoCard}
                        photoUrl={card.scannedImage || card.front_image_url}
                        html_front={card.html_front}
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
                      }}
                      className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden ring-1 ring-white/10"
                    >
                      <BusinessCardBack 
                        data={card.data} 
                        theme={card.theme} 
                        layout_type={card.layout_type}
                        orientation={isCardPortrait ? 'portrait' : 'landscape'}
                        backPhotoUrl={card.scannedImageBack || card.back_image_url}
                        html_back={card.html_back}
                      />
                    </div>
                  </div>
                </div>
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

      {/* 2. Bottom Actions Bar (Centered beneath Card) */}
      <div className="w-full flex justify-center px-4 mt-2 sm:mt-3 min-h-[38px]">
        {activeCard && (
          <ActionButtons
            data={activeCard.data}
            onOpenEdit={() => onOpenEdit && onOpenEdit(activeCard)}
            onOpenShare={() => onOpenShare(activeCard)}
            isPhotoCard={activeCard.isPhotoCard}
            orientation={activeCard.layout_type === 'vertical_atelier' ? 'portrait' : orientation}
            onToggleOrientation={activeCard.layout_type !== 'vertical_atelier' ? () => setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait') : undefined}
          />
        )}
      </div>
    </div>
  );
};
